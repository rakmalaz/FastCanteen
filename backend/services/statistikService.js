const db = require('../config/db');

// Pesanan dihitung sebagai pemasukan HANYA jika sudah dibayar dan tidak dibatalkan
const SAH = "p.status_pesanan <> 'Dibatalkan' AND p.status_pembayaran = 'Sudah Dibayar'";

const pad = (n) => String(n).padStart(2, '0');
const formatTanggal = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// Statistik & laporan keuangan satu tenant (dipakai halaman tenant DAN halaman admin)
exports.getStatistikTenant = async (idTenant, hari = 7) => {
    hari = [7, 14, 30].includes(Number(hari)) ? Number(hari) : 7;

    const [[ringkasan]] = await db.query(
        `SELECT
            COUNT(*) AS total_pesanan,
            COALESCE(SUM(p.status_pesanan = 'Selesai'), 0) AS pesanan_selesai,
            COALESCE(SUM(p.status_pesanan = 'Dibatalkan'), 0) AS pesanan_dibatalkan,
            COALESCE(SUM(p.status_pesanan IN ('Menunggu','Diproses','Siap Diambil')), 0) AS pesanan_aktif,
            COALESCE(SUM(${SAH}), 0) AS pesanan_berbayar,
            COALESCE(SUM(CASE WHEN ${SAH} THEN p.total_harga END), 0) AS total_omzet,
            COALESCE(SUM(CASE WHEN ${SAH} AND DATE(p.waktu_transaksi) = CURDATE() THEN p.total_harga END), 0) AS omzet_hari_ini,
            COALESCE(SUM(CASE WHEN ${SAH} AND DATE(p.waktu_transaksi) >= CURDATE() - INTERVAL 6 DAY THEN p.total_harga END), 0) AS omzet_7_hari,
            COALESCE(SUM(CASE WHEN ${SAH} AND YEAR(p.waktu_transaksi) = YEAR(CURDATE()) AND MONTH(p.waktu_transaksi) = MONTH(CURDATE()) THEN p.total_harga END), 0) AS omzet_bulan_ini
         FROM pesanan p WHERE p.id_tenant = ?`,
        [idTenant]
    );

    const [[hariIniRow]] = await db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hari_ini");
    const [harianRows] = await db.query(
        `SELECT DATE_FORMAT(p.waktu_transaksi, '%Y-%m-%d') AS tanggal,
                COUNT(*) AS jumlah_pesanan, SUM(p.total_harga) AS omzet
         FROM pesanan p
         WHERE p.id_tenant = ? AND ${SAH}
           AND DATE(p.waktu_transaksi) >= CURDATE() - INTERVAL ? DAY
         GROUP BY tanggal`,
        [idTenant, hari - 1]
    );
    const petaHarian = {};
    harianRows.forEach((r) => { petaHarian[r.tanggal] = r; });

    // Isi hari tanpa transaksi dengan 0 supaya grafik tidak bolong
    const [y, m, d] = hariIniRow.hari_ini.split('-').map(Number);
    const harian = [];
    for (let i = hari - 1; i >= 0; i--) {
        const tgl = formatTanggal(new Date(Date.UTC(y, m - 1, d - i)));
        harian.push({
            tanggal: tgl,
            omzet: parseFloat(petaHarian[tgl]?.omzet || 0),
            jumlah_pesanan: Number(petaHarian[tgl]?.jumlah_pesanan || 0)
        });
    }

    const [perMetode] = await db.query(
        `SELECT p.metode_pembayaran, COUNT(*) AS jumlah, SUM(p.total_harga) AS omzet
         FROM pesanan p WHERE p.id_tenant = ? AND ${SAH}
         GROUP BY p.metode_pembayaran ORDER BY omzet DESC`,
        [idTenant]
    );

    const [menuTerlaris] = await db.query(
        `SELECT mn.nama_menu, SUM(dp.jumlah_pesanan) AS total_terjual, SUM(dp.sub_harga) AS pendapatan
         FROM detail_pesanan dp
         JOIN menu mn ON dp.id_menu = mn.id
         JOIN pesanan p ON dp.id_pesanan = p.id
         WHERE p.id_tenant = ? AND ${SAH}
         GROUP BY mn.id, mn.nama_menu
         ORDER BY total_terjual DESC, pendapatan DESC
         LIMIT 5`,
        [idTenant]
    );

    const [transaksi] = await db.query(
        `SELECT p.id, p.total_harga, p.metode_pembayaran, p.waktu_transaksi, m.nama AS nama_mahasiswa
         FROM pesanan p JOIN pengguna m ON p.id_mahasiswa = m.id
         WHERE p.id_tenant = ? AND ${SAH}
         ORDER BY p.waktu_transaksi DESC, p.id DESC
         LIMIT 15`,
        [idTenant]
    );

    const berbayar = Number(ringkasan.pesanan_berbayar);
    const omzet = parseFloat(ringkasan.total_omzet);

    return {
        ringkasan: {
            total_pesanan: Number(ringkasan.total_pesanan),
            pesanan_selesai: Number(ringkasan.pesanan_selesai),
            pesanan_dibatalkan: Number(ringkasan.pesanan_dibatalkan),
            pesanan_aktif: Number(ringkasan.pesanan_aktif),
            pesanan_berbayar: berbayar,
            total_omzet: omzet,
            omzet_hari_ini: parseFloat(ringkasan.omzet_hari_ini),
            omzet_7_hari: parseFloat(ringkasan.omzet_7_hari),
            omzet_bulan_ini: parseFloat(ringkasan.omzet_bulan_ini),
            rata_rata_pesanan: berbayar > 0 ? Math.round(omzet / berbayar) : 0
        },
        periode_hari: hari,
        harian,
        per_metode: perMetode.map((r) => ({ metode_pembayaran: r.metode_pembayaran, jumlah: Number(r.jumlah), omzet: parseFloat(r.omzet) })),
        menu_terlaris: menuTerlaris.map((r) => ({ nama_menu: r.nama_menu, total_terjual: Number(r.total_terjual), pendapatan: parseFloat(r.pendapatan) })),
        transaksi_terbaru: transaksi
    };
};

// Peringkat seluruh tenant (untuk Super Admin): omzet tertinggi, pesanan terbanyak, dll
exports.getRankingTenant = async () => {
    const [rows] = await db.query(
        `SELECT t.id, t.nama_tenant, t.lokasi_stan,
            (SELECT COUNT(*) FROM pesanan p WHERE p.id_tenant = t.id) AS total_pesanan,
            (SELECT COUNT(*) FROM pesanan p WHERE p.id_tenant = t.id AND ${SAH}) AS pesanan_berbayar,
            (SELECT COALESCE(SUM(p.total_harga), 0) FROM pesanan p WHERE p.id_tenant = t.id AND ${SAH}) AS total_omzet,
            (SELECT COALESCE(SUM(p.total_harga), 0) FROM pesanan p WHERE p.id_tenant = t.id AND ${SAH}
                AND DATE(p.waktu_transaksi) >= CURDATE() - INTERVAL 6 DAY) AS omzet_7_hari,
            (SELECT COALESCE(SUM(dp.jumlah_pesanan), 0) FROM detail_pesanan dp JOIN pesanan p ON dp.id_pesanan = p.id
                WHERE p.id_tenant = t.id AND ${SAH}) AS porsi_terjual
         FROM tenant t
         ORDER BY total_omzet DESC, t.id ASC`
    );

    const ranking = rows.map((r, i) => ({
        peringkat: i + 1,
        id: r.id,
        nama_tenant: r.nama_tenant,
        lokasi_stan: r.lokasi_stan,
        total_pesanan: Number(r.total_pesanan),
        pesanan_berbayar: Number(r.pesanan_berbayar),
        total_omzet: parseFloat(r.total_omzet),
        omzet_7_hari: parseFloat(r.omzet_7_hari),
        porsi_terjual: Number(r.porsi_terjual)
    }));

    const tertinggi = (kunci) => {
        const kandidat = ranking.filter((r) => r[kunci] > 0);
        if (kandidat.length === 0) return null;
        return kandidat.reduce((a, b) => (b[kunci] > a[kunci] ? b : a));
    };

    return {
        ranking,
        total_omzet_semua: ranking.reduce((s, r) => s + r.total_omzet, 0),
        tertinggi: {
            omzet: tertinggi('total_omzet'),
            pesanan: tertinggi('pesanan_berbayar'),
            porsi_terjual: tertinggi('porsi_terjual'),
            omzet_7_hari: tertinggi('omzet_7_hari')
        }
    };
};
