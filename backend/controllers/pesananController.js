const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------
// Upload bukti pembayaran (US-07): gambar dikirim base64, disimpan
// sebagai file di backend/uploads, dan hanya path-nya masuk database
// ---------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BUKTI_BYTES = 5 * 1024 * 1024; // 5 MB
const METODE_VALID = ['QRIS', 'E-Wallet', 'Tunai'];

const errorBukti = (message) => {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
};

// Cek tanda file asli (JPEG / PNG / WEBP), bukan sekadar percaya ekstensi
const isImageBuffer = (buf) =>
    (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP');

const simpanBuktiFile = async (idPesanan, base64, mimeType) => {
    const ext = MIME_EXT[String(mimeType || 'image/jpeg').toLowerCase()];
    if (!ext) throw errorBukti('Format bukti harus JPG, PNG, atau WEBP');

    const buffer = Buffer.from(String(base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (buffer.length === 0) throw errorBukti('Data bukti pembayaran kosong');
    if (buffer.length > MAX_BUKTI_BYTES) throw errorBukti('Ukuran bukti pembayaran maksimal 5 MB');
    if (!isImageBuffer(buffer)) throw errorBukti('File bukti pembayaran bukan gambar yang valid');

    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `bukti-${parseInt(idPesanan, 10)}-${Date.now()}.${ext}`;
    await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    return `/uploads/${fileName}`;
};

// Membuat Pre-Order Baru (US-04, US-06)
// Tanpa jam_pengambilan, status_pembayaran & status_pesanan terpisah, otomatis notifikasi ke tenant
exports.createPesanan = async (req, res) => {
    let connection;
    try {
        const {
            id_mahasiswa,
            id_tenant,
            metode_pembayaran,
            catatan,
            bukti_base64,
            bukti_mime,
            items // Array of { id_menu, jumlah_pesanan }
        } = req.body;

        if (!id_mahasiswa || !id_tenant || !metode_pembayaran) {
            return res.status(400).json({
                success: false,
                message: 'Mahasiswa, tenant, dan metode pembayaran wajib diisi'
            });
        }
        if (!METODE_VALID.includes(metode_pembayaran)) {
            return res.status(400).json({
                success: false,
                message: `Metode pembayaran harus salah satu dari: ${METODE_VALID.join(', ')}`
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pesanan harus memiliki minimal 1 menu'
            });
        }

        // US-07: pembayaran non-tunai wajib melampirkan bukti transaksi
        if (metode_pembayaran !== 'Tunai' && !bukti_base64) {
            return res.status(400).json({
                success: false,
                message: 'Bukti pembayaran wajib diunggah untuk pembayaran non-tunai'
            });
        }

        // Dapatkan koneksi pool untuk transaksi
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Ambil data tenant & pendaftar tenant untuk tujuan notifikasi
        const [tenantRows] = await connection.query(
            'SELECT id, nama_tenant, id_admin_pendaftar FROM tenant WHERE id = ?',
            [id_tenant]
        );

        if (tenantRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: `Tenant dengan ID ${id_tenant} tidak ditemukan`
            });
        }
        const tenantData = tenantRows[0];

        // 2. Ambil data mahasiswa pemesan untuk konten notifikasi
        const [userRows] = await connection.query(
            'SELECT id, nama FROM pengguna WHERE id = ?',
            [id_mahasiswa]
        );
        const namaMahasiswa = userRows.length > 0 ? userRows[0].nama : 'Mahasiswa';

        // 3. Hitung total harga dan validasi stok setiap menu
        let totalHarga = 0;
        const detailItemsToInsert = [];

        for (const item of items) {
            const [menuRows] = await connection.query(
                'SELECT id, id_tenant, nama_menu, harga, status_tersedia FROM menu WHERE id = ?',
                [item.id_menu]
            );

            if (menuRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Menu dengan ID ${item.id_menu} tidak ditemukan`
                });
            }

            const menu = menuRows[0];
            if (menu.id_tenant !== Number(id_tenant)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Menu "${menu.nama_menu}" bukan milik stan ini`
                });
            }
            if (menu.status_tersedia === 'habis') {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Maaf, stok menu "${menu.nama_menu}" sedang habis`
                });
            }

            const jumlah = Number(item.jumlah_pesanan);
            if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 50) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Jumlah pesanan harus bilangan bulat 1 sampai 50'
                });
            }
            const subHarga = parseFloat(menu.harga) * jumlah;
            totalHarga += subHarga;

            detailItemsToInsert.push({
                id_menu: menu.id,
                nama_menu: menu.nama_menu,
                jumlah_pesanan: jumlah,
                sub_harga: subHarga
            });
        }

        // Status ditentukan SERVER (nilai dari aplikasi diabaikan):
        // Tunai = Belum Dibayar (bayar saat ambil di stan)
        // QRIS / E-Wallet = Menunggu Verifikasi (tenant cek mutasi dulu sebelum memasak)
        const finalStatusPembayaran = metode_pembayaran === 'Tunai' ? 'Belum Dibayar' : 'Menunggu Verifikasi';
        const finalStatusPesanan = 'Menunggu';

        // 4. Simpan ke tabel pesanan (tanpa jam_pengambilan)
        const [resultPesanan] = await connection.query(
            `INSERT INTO pesanan 
             (id_mahasiswa, id_tenant, total_harga, metode_pembayaran, status_pembayaran, status_pesanan, bukti_pembayaran, catatan) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_mahasiswa,
                id_tenant,
                totalHarga,
                metode_pembayaran,
                finalStatusPembayaran,
                finalStatusPesanan,
                null, // path bukti diisi setelah file tersimpan (lihat di bawah)
                catatan || null
            ]
        );

        const newPesananId = resultPesanan.insertId;

        // 5. Simpan setiap item ke detail_pesanan
        for (const detail of detailItemsToInsert) {
            await connection.query(
                'INSERT INTO detail_pesanan (id_pesanan, id_menu, jumlah_pesanan, sub_harga) VALUES (?, ?, ?, ?)',
                [newPesananId, detail.id_menu, detail.jumlah_pesanan, detail.sub_harga]
            );
        }

        // 5b. Simpan file bukti pembayaran (dalam transaksi yang sama)
        let buktiPath = null;
        if (bukti_base64) {
            buktiPath = await simpanBuktiFile(newPesananId, bukti_base64, bukti_mime);
            await connection.query(
                'UPDATE pesanan SET bukti_pembayaran = ? WHERE id = ?',
                [buktiPath, newPesananId]
            );
        }

        // 6. Buat otomatis notifikasi untuk tenant (kirim ke id_admin_pendaftar)
        const perluVerifikasi = finalStatusPembayaran === 'Menunggu Verifikasi';
        const judulNotif = perluVerifikasi ? 'Pesanan Baru - Perlu Verifikasi 🧾' : 'Pesanan Baru Masuk! 🛎️';
        const pesanNotif = perluVerifikasi
            ? `Pesanan #${newPesananId} dari ${namaMahasiswa} sebesar Rp ${Number(totalHarga).toLocaleString('id-ID')} menunggu verifikasi pembayaran. Cek bukti dan mutasi Anda.`
            : `Pesanan #${newPesananId} dari ${namaMahasiswa} sebesar Rp ${Number(totalHarga).toLocaleString('id-ID')} telah masuk. Mohon segera diproses.`;

        // Ambil penerima notifikasi (admin pendaftar tenant atau fallback ke admin)
        let idPenerimaNotif = tenantData.id_admin_pendaftar;
        if (!idPenerimaNotif) {
            const [adminRows] = await connection.query("SELECT id FROM pengguna WHERE peran = 'admin' LIMIT 1");
            if (adminRows.length > 0) idPenerimaNotif = adminRows[0].id;
        }

        if (idPenerimaNotif) {
            try {
                await connection.query(
                    `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
                     VALUES (?, ?, ?, ?, ?, 'pesanan_baru', 0, NOW())`,
                    [
                        idPenerimaNotif,
                        id_mahasiswa,
                        newPesananId,
                        judulNotif,
                        pesanNotif
                    ]
                );
            } catch (notifErr) {
                console.warn('⚠️ Notifikasi tenant gagal dibuat (non-fatal):', notifErr.message);
            }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Pesanan FastCanteen berhasil dibuat',
            data: {
                id_pesanan: newPesananId,
                id_mahasiswa,
                id_tenant,
                nama_tenant: tenantData.nama_tenant,
                total_harga: totalHarga,
                metode_pembayaran,
                status_pembayaran: finalStatusPembayaran,
                status_pesanan: finalStatusPesanan,
                bukti_pembayaran: buktiPath,
                catatan: catatan || null,
                items: detailItemsToInsert
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error saat membuat pesanan:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({
            success: false,
            message: 'Gagal membuat pesanan',
            error: error.sqlMessage || error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

// Mengambil Riwayat Pesanan Mahasiswa (US-10, US-11)
// Query param: ?filter=aktif | ?filter=riwayat | (kosong = semua)
exports.getPesananByMahasiswa = async (req, res) => {
    try {
        const { id_mahasiswa } = req.params;
        const { filter } = req.query;

        let query = `
                        SELECT p.*, t.nama_tenant, t.lokasi_stan, own.no_hp AS no_hp_tenant,
                   m.nama as nama_mahasiswa, m.nim, m.no_hp as no_hp_mahasiswa
            FROM pesanan p
            JOIN tenant t ON p.id_tenant = t.id
            LEFT JOIN pengguna own ON t.id_admin_pendaftar = own.id
            JOIN pengguna m ON p.id_mahasiswa = m.id
            WHERE p.id_mahasiswa = ?
        `;
        const params = [id_mahasiswa];

        if (filter === 'aktif') {
            query += " AND p.status_pesanan IN ('Menunggu', 'Diproses', 'Siap Diambil')";
        } else if (filter === 'riwayat') {
            query += " AND p.status_pesanan IN ('Selesai', 'Dibatalkan')";
        }

        query += ' ORDER BY p.id DESC';

        const [pesananRows] = await db.query(query, params);

        // Ambil detail items untuk masing-masing pesanan
        const pesananWithDetails = await Promise.all(
            pesananRows.map(async (order) => {
                const [details] = await db.query(
                    `SELECT dp.*, mn.nama_menu, mn.foto
                     FROM detail_pesanan dp
                     JOIN menu mn ON dp.id_menu = mn.id
                     WHERE dp.id_pesanan = ?`,
                    [order.id]
                );
                return {
                    ...order,
                    items: details
                };
            })
        );

        res.status(200).json({
            success: true,
            filter: filter || 'semua',
            total: pesananWithDetails.length,
            data: pesananWithDetails
        });
    } catch (error) {
        console.error('Error saat mengambil riwayat pesanan mahasiswa:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil riwayat pesanan',
            error: error.message
        });
    }
};

// Mengambil Antrean Pesanan Masuk untuk Tenant (US-05)
// Query params: ?status= / ?status_pesanan= & ?status_pembayaran=
exports.getPesananByTenant = async (req, res) => {
    try {
        const { id_tenant } = req.params;
        const statusPesanan = req.query.status_pesanan || req.query.status;
        const { status_pembayaran } = req.query;

        let query = `
            SELECT p.*, m.nama as nama_mahasiswa, m.nim as nim_mahasiswa, m.no_hp as no_hp_mahasiswa
            FROM pesanan p
            JOIN pengguna m ON p.id_mahasiswa = m.id
            WHERE p.id_tenant = ?
        `;
        const params = [id_tenant];

        if (statusPesanan) {
            query += ' AND p.status_pesanan = ?';
            params.push(statusPesanan);
        }
        
        if (status_pembayaran) {
            query += ' AND p.status_pembayaran = ?';
            params.push(status_pembayaran);
        }

        query += " ORDER BY (p.status_pembayaran = 'Menunggu Verifikasi' AND p.status_pesanan = 'Menunggu') DESC, p.id DESC";

        const [pesananRows] = await db.query(query, params);

        const pesananWithDetails = await Promise.all(
            pesananRows.map(async (order) => {
                const [details] = await db.query(
                    `SELECT dp.*, mn.nama_menu, mn.foto
                     FROM detail_pesanan dp
                     JOIN menu mn ON dp.id_menu = mn.id
                     WHERE dp.id_pesanan = ?`,
                    [order.id]
                );
                return {
                    ...order,
                    items: details
                };
            })
        );

        res.status(200).json({
            success: true,
            total: pesananWithDetails.length,
            data: pesananWithDetails
        });
    } catch (error) {
        console.error('Error saat mengambil antrean pesanan tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil antrean pesanan tenant',
            error: error.message
        });
    }
};

// Detail Pesanan berdasarkan ID
exports.getPesananById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT p.*, t.nama_tenant, t.lokasi_stan,
                    m.nama as nama_mahasiswa, m.nim as nim_mahasiswa, m.no_hp as no_hp_mahasiswa
             FROM pesanan p
             JOIN tenant t ON p.id_tenant = t.id
             JOIN pengguna m ON p.id_mahasiswa = m.id
             WHERE p.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
        }

        const [items] = await db.query(
            `SELECT dp.*, mn.nama_menu, mn.foto
             FROM detail_pesanan dp
             JOIN menu mn ON dp.id_menu = mn.id
             WHERE dp.id_pesanan = ?`,
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                ...rows[0],
                items
            }
        });
    } catch (error) {
        console.error('Error saat mengambil detail pesanan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail pesanan',
            error: error.message
        });
    }
};

// Memperbarui Status Pesanan (US-08: 'Menunggu', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan')
// Otomatis kirim notifikasi ke mahasiswa pemesan
exports.updateStatusPesanan = async (req, res) => {
    try {
        const { id } = req.params;
        const status = req.body.status_pesanan || req.body.status;

        const validStatus = ['Menunggu', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'];
        if (!status || !validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status pesanan harus salah satu dari: ${validStatus.join(', ')}`
            });
        }

        // Aturan verifikasi: pesanan non-tunai tidak boleh diproses sebelum pembayarannya terverifikasi
        const [cekRows] = await db.query(
            'SELECT metode_pembayaran, status_pembayaran, status_pesanan FROM pesanan WHERE id = ?',
            [id]
        );
        if (cekRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
        }
        const cek = cekRows[0];
        const butuhLunas = ['Diproses', 'Siap Diambil', 'Selesai'].includes(status);
        if (butuhLunas && cek.metode_pembayaran !== 'Tunai' && cek.status_pembayaran !== 'Sudah Dibayar') {
            return res.status(409).json({
                success: false,
                message: 'Pembayaran pesanan ini belum terverifikasi. Verifikasi bukti pembayaran terlebih dahulu.'
            });
        }

        // Alur status yang diperbolehkan (tidak boleh mundur atau loncat)
        const ALUR_STATUS = {
            'Menunggu': ['Diproses', 'Dibatalkan'],
            'Diproses': ['Siap Diambil', 'Dibatalkan'],
            'Siap Diambil': ['Selesai', 'Dibatalkan'],
            'Selesai': [],
            'Dibatalkan': []
        };
        if (!(ALUR_STATUS[cek.status_pesanan] || []).includes(status)) {
            return res.status(409).json({
                success: false,
                message: `Status pesanan tidak bisa diubah dari "${cek.status_pesanan}" ke "${status}"`
            });
        }

        // Pesanan Tunai otomatis menjadi 'Sudah Dibayar' saat Selesai (uang diterima di stan)
        const [result] = await db.query(
            `UPDATE pesanan
             SET status_pesanan = ?,
                 status_pembayaran = CASE
                     WHEN ? = 'Selesai' AND metode_pembayaran = 'Tunai' AND status_pembayaran = 'Belum Dibayar'
                     THEN 'Sudah Dibayar' ELSE status_pembayaran END,
                 waktu_perubahan_status = NOW()
             WHERE id = ?`,
            [status, status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
        }

        // Ambil data pesanan untuk informasi notifikasi
        const [orderRows] = await db.query(
            `SELECT p.*, t.nama_tenant, t.id_admin_pendaftar 
             FROM pesanan p 
             JOIN tenant t ON p.id_tenant = t.id 
             WHERE p.id = ?`,
            [id]
        );

        if (orderRows.length > 0) {
            const order = orderRows[0];
            let judulNotif = '';
            let pesanNotif = '';
            let tipeNotif = 'info';

            switch (status) {
                case 'Diproses':
                    judulNotif = 'Pesanan Sedang Dimasak 👨‍🍳';
                    pesanNotif = `Pesanan #${id} Anda sedang dimasak oleh ${order.nama_tenant}. Mohon ditunggu ya!`;
                    tipeNotif = 'status_diproses';
                    break;
                case 'Siap Diambil':
                    judulNotif = 'Makanan Siap! Segera Ambil 🎉';
                    pesanNotif = `Pesanan #${id} sudah matang dan siap diambil di stan ${order.nama_tenant}.`;
                    tipeNotif = 'siap_diambil';
                    break;
                case 'Selesai':
                    judulNotif = 'Pesanan Selesai ✅';
                    pesanNotif = `Terima kasih! Pesanan #${id} dari ${order.nama_tenant} telah selesai. Selamat menikmati hidangan Anda!`;
                    tipeNotif = 'selesai';
                    break;
                case 'Dibatalkan':
                    judulNotif = 'Pesanan Dibatalkan ❌';
                    pesanNotif = `Pesanan #${id} Anda dari ${order.nama_tenant} telah dibatalkan.`;
                    tipeNotif = 'dibatalkan';
                    break;
                case 'Menunggu':
                    judulNotif = 'Status Pesanan Menunggu ⏳';
                    pesanNotif = `Pesanan #${id} Anda sedang menunggu konfirmasi dari ${order.nama_tenant}.`;
                    tipeNotif = 'info';
                    break;
            }

            if (judulNotif) {
                await db.query(
                    `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
                    [
                        order.id_mahasiswa,
                        order.id_admin_pendaftar,
                        order.id,
                        judulNotif,
                        pesanNotif,
                        tipeNotif
                    ]
                );
            }
        }

        const [updatedRows] = await db.query('SELECT * FROM pesanan WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: `Status pesanan #${id} berhasil diubah menjadi "${status}"`,
            data: updatedRows[0]
        });
    } catch (error) {
        console.error('Error saat mengubah status pesanan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui status pesanan',
            error: error.message
        });
    }
};

// Memperbarui Status Pembayaran (BARU)
// PUT /api/pesanan/:id/status-pembayaran
// Validasi: 'Belum Dibayar', 'Sudah Dibayar', 'Dikembalikan'
// Otomatis kirim notifikasi saat status = 'Dikembalikan'
exports.updateStatusPembayaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { status_pembayaran } = req.body;

        const validStatus = ['Belum Dibayar', 'Sudah Dibayar', 'Dikembalikan'];
        if (!status_pembayaran || !validStatus.includes(status_pembayaran)) {
            return res.status(400).json({
                success: false,
                message: `Status pembayaran harus salah satu dari: ${validStatus.join(', ')}`
            });
        }

        // Batasi perubahan manual agar QRIS/E-Wallet tidak lolos tanpa verifikasi bukti
        const [cekBayar] = await db.query(
            'SELECT metode_pembayaran, status_pembayaran FROM pesanan WHERE id = ?',
            [id]
        );
        if (cekBayar.length === 0) {
            return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
        }
        const bayarSaatIni = cekBayar[0];
        const boleh =
            (status_pembayaran === 'Sudah Dibayar' &&
                bayarSaatIni.metode_pembayaran === 'Tunai' &&
                bayarSaatIni.status_pembayaran === 'Belum Dibayar') ||
            (status_pembayaran === 'Dikembalikan' &&
                bayarSaatIni.status_pembayaran === 'Sudah Dibayar');
        if (!boleh) {
            return res.status(409).json({
                success: false,
                message: `Status pembayaran tidak bisa diubah dari "${bayarSaatIni.status_pembayaran}" ke "${status_pembayaran}"`
            });
        }

        const [result] = await db.query(
            'UPDATE pesanan SET status_pembayaran = ?, waktu_perubahan_status = NOW() WHERE id = ?',
            [status_pembayaran, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
        }

        // Jika status_pembayaran = 'Dikembalikan', kirim notifikasi ke mahasiswa
        if (status_pembayaran === 'Dikembalikan') {
            const [orderRows] = await db.query(
                `SELECT p.*, t.nama_tenant, t.id_admin_pendaftar 
                 FROM pesanan p 
                 JOIN tenant t ON p.id_tenant = t.id 
                 WHERE p.id = ?`,
                [id]
            );

            if (orderRows.length > 0) {
                const order = orderRows[0];
                await db.query(
                    `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
                     VALUES (?, ?, ?, ?, ?, 'info', 0, NOW())`,
                    [
                        order.id_mahasiswa,
                        order.id_admin_pendaftar,
                        order.id,
                        'Pengembalian Dana Pembayaran 💸',
                        `Pembayaran untuk pesanan #${id} sebesar Rp ${Number(order.total_harga).toLocaleString('id-ID')} telah dikembalikan.`
                    ]
                );
            }
        }

        const [updatedRows] = await db.query('SELECT * FROM pesanan WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: `Status pembayaran pesanan #${id} berhasil diubah menjadi "${status_pembayaran}"`,
            data: updatedRows[0]
        });
    } catch (error) {
        console.error('Error saat mengubah status pembayaran:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui status pembayaran',
            error: error.message
        });
    }
};

// Unggah atau Konfirmasi Bukti Pembayaran (US-07)
exports.uploadBuktiPembayaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { bukti_base64, bukti_mime } = req.body;

        if (!bukti_base64) {
            return res.status(400).json({
                success: false,
                message: 'Data gambar bukti pembayaran wajib disertakan'
            });
        }

        const [rows] = await db.query(
            `SELECT p.id, p.id_mahasiswa, p.status_pembayaran, p.status_pesanan, t.id_admin_pendaftar
             FROM pesanan p JOIN tenant t ON p.id_tenant = t.id WHERE p.id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
        }
        const order = rows[0];

        // Unggah ulang hanya boleh jika bukti sebelumnya ditolak dan pesanan belum dibatalkan
        if (order.status_pembayaran !== 'Bukti Ditolak' || order.status_pesanan === 'Dibatalkan') {
            return res.status(409).json({
                success: false,
                message: 'Bukti pembayaran hanya dapat diunggah ulang jika bukti sebelumnya ditolak tenant'
            });
        }

        const buktiPath = await simpanBuktiFile(id, bukti_base64, bukti_mime);
        await db.query(
            `UPDATE pesanan
             SET bukti_pembayaran = ?, status_pembayaran = 'Menunggu Verifikasi',
                 waktu_perubahan_status = NOW()
             WHERE id = ?`,
            [buktiPath, id]
        );

        // Beri tahu tenant bahwa ada bukti baru yang perlu dicek
        if (order.id_admin_pendaftar) {
            try {
                await db.query(
                    `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
                     VALUES (?, ?, ?, ?, ?, 'info', 0, NOW())`,
                    [
                        order.id_admin_pendaftar,
                        order.id_mahasiswa,
                        order.id,
                        'Bukti Pembayaran Baru 🧾',
                        `Pembeli mengunggah ulang bukti untuk pesanan #${order.id}. Mohon verifikasi kembali.`
                    ]
                );
            } catch (notifErr) {
                console.warn('⚠️ Notifikasi unggah ulang gagal (non-fatal):', notifErr.message);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Bukti pembayaran berhasil diunggah ulang dan menunggu verifikasi',
            data: { id, bukti_pembayaran: buktiPath, status_pembayaran: 'Menunggu Verifikasi' }
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('Error saat mengunggah bukti pembayaran:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan bukti pembayaran',
            error: error.message
        });
    }
};

// ---------------------------------------------------------------
// Verifikasi pembayaran oleh tenant
// aksi: 'valid' | 'minta_ulang' | 'tolak_batal'
// ---------------------------------------------------------------
const BATAS_PENOLAKAN = 3; // setelah 3x bukti ditolak, pesanan otomatis dibatalkan

exports.verifikasiPembayaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { aksi, catatan, id_verifikator } = req.body;

        if (!['valid', 'minta_ulang', 'tolak_batal'].includes(aksi)) {
            return res.status(400).json({
                success: false,
                message: "Aksi harus salah satu dari: 'valid', 'minta_ulang', 'tolak_batal'"
            });
        }

        const [rows] = await db.query(
            `SELECT p.*, t.nama_tenant, t.id_admin_pendaftar
             FROM pesanan p JOIN tenant t ON p.id_tenant = t.id WHERE p.id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
        }
        const order = rows[0];

        if (order.status_pembayaran !== 'Menunggu Verifikasi' || order.status_pesanan !== 'Menunggu') {
            return res.status(409).json({
                success: false,
                message: 'Pesanan ini tidak sedang menunggu verifikasi pembayaran'
            });
        }
        // Semua UPDATE di bawah hanya berlaku jika pesanan MASIH menunggu verifikasi.
        // Jika perangkat lain sudah memprosesnya lebih dulu, tidak ada yang berubah.
        const terapkan = async (sql, params) => {
            const [hasilUpdate] = await db.query(
                sql + " AND status_pembayaran = 'Menunggu Verifikasi' AND status_pesanan = 'Menunggu'",
                params
            );
            if (hasilUpdate.affectedRows === 0) {
                const e = new Error('Pesanan ini sudah diverifikasi dari perangkat lain');
                e.konflik = true;
                throw e;
            }
        };
        const alasan = (catatan || '').toString().trim().slice(0, 255) || null;
        const verifikator = id_verifikator || order.id_admin_pendaftar || null;
        let judul, pesan, tipe = 'info', hasil;

        if (aksi === 'valid') {
            await terapkan(
                `UPDATE pesanan
                 SET status_pembayaran = 'Sudah Dibayar', catatan_verifikasi = NULL,
                     diverifikasi_oleh = ?, waktu_verifikasi = NOW(), waktu_perubahan_status = NOW()
                 WHERE id = ?`,
                [verifikator, id]
            );
            hasil = 'Sudah Dibayar';
            judul = 'Pembayaran Terverifikasi ✅';
            pesan = `Pembayaran pesanan #${id} telah diverifikasi oleh ${order.nama_tenant}. Pesanan Anda akan segera diproses.`;
        } else if (aksi === 'minta_ulang') {
            const jumlah = (order.jumlah_penolakan || 0) + 1;
            if (jumlah >= BATAS_PENOLAKAN) {
                await terapkan(
                    `UPDATE pesanan
                     SET status_pembayaran = 'Bukti Ditolak', status_pesanan = 'Dibatalkan',
                         jumlah_penolakan = ?, catatan_verifikasi = ?,
                         diverifikasi_oleh = ?, waktu_verifikasi = NOW(), waktu_perubahan_status = NOW()
                     WHERE id = ?`,
                    [jumlah, alasan, verifikator, id]
                );
                hasil = 'Dibatalkan';
                judul = 'Pesanan Dibatalkan ❌';
                tipe = 'dibatalkan';
                pesan = `Bukti pembayaran pesanan #${id} ditolak ${BATAS_PENOLAKAN} kali sehingga pesanan dibatalkan.${alasan ? ` Alasan terakhir: ${alasan}` : ''}`;
            } else {
                await terapkan(
                    `UPDATE pesanan
                     SET status_pembayaran = 'Bukti Ditolak', jumlah_penolakan = ?, catatan_verifikasi = ?,
                         diverifikasi_oleh = ?, waktu_verifikasi = NOW(), waktu_perubahan_status = NOW()
                     WHERE id = ?`,
                    [jumlah, alasan, verifikator, id]
                );
                hasil = 'Bukti Ditolak';
                judul = 'Bukti Pembayaran Ditolak ⚠️';
                pesan = `Bukti pembayaran pesanan #${id} ditolak${alasan ? `: ${alasan}` : '.'} Silakan unggah ulang bukti yang benar (kesempatan ke-${jumlah} dari ${BATAS_PENOLAKAN}).`;
            }
        } else {
            await terapkan(
                `UPDATE pesanan
                 SET status_pembayaran = 'Bukti Ditolak', status_pesanan = 'Dibatalkan',
                     jumlah_penolakan = jumlah_penolakan + 1, catatan_verifikasi = ?,
                     diverifikasi_oleh = ?, waktu_verifikasi = NOW(), waktu_perubahan_status = NOW()
                 WHERE id = ?`,
                [alasan, verifikator, id]
            );
            hasil = 'Dibatalkan';
            judul = 'Pesanan Dibatalkan ❌';
            tipe = 'dibatalkan';
            pesan = `Pesanan #${id} dibatalkan karena bukti pembayaran tidak valid.${alasan ? ` Alasan: ${alasan}` : ''}`;
        }

        try {
            await db.query(
                `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
                [order.id_mahasiswa, order.id_admin_pendaftar, order.id, judul, pesan, tipe]
            );
        } catch (notifErr) {
            console.warn('⚠️ Notifikasi verifikasi gagal dibuat (non-fatal):', notifErr.message);
        }

        const [updated] = await db.query('SELECT * FROM pesanan WHERE id = ?', [id]);
        res.status(200).json({
            success: true,
            message: `Verifikasi pesanan #${id} berhasil: ${hasil}`,
            data: updated[0]
        });
    } catch (error) {
        if (error.konflik) {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error('Error saat verifikasi pembayaran:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memverifikasi pembayaran',
            error: error.message
        });
    }
};

// ---------------------------------------------------------------
// Pembatalan otomatis: pesanan non-tunai yang tidak kunjung beres
// pembayarannya dalam BATAS_MENIT menit sejak perubahan terakhir
// ---------------------------------------------------------------
const BATAS_MENIT_VERIFIKASI = 30;

exports.batalkanPesananKedaluwarsa = async () => {
    const [rows] = await db.query(
        `SELECT p.id, p.id_mahasiswa, t.id_admin_pendaftar
         FROM pesanan p JOIN tenant t ON p.id_tenant = t.id
         WHERE p.status_pesanan = 'Menunggu'
           AND p.status_pembayaran IN ('Menunggu Verifikasi', 'Bukti Ditolak')
           AND p.waktu_perubahan_status < (NOW() - INTERVAL ? MINUTE)`,
        [BATAS_MENIT_VERIFIKASI]
    );

    for (const order of rows) {
        await db.query(
            `UPDATE pesanan SET status_pesanan = 'Dibatalkan', waktu_perubahan_status = NOW() WHERE id = ?`,
            [order.id]
        );
        try {
            await db.query(
                `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
                 VALUES (?, ?, ?, ?, ?, 'dibatalkan', 0, NOW())`,
                [
                    order.id_mahasiswa,
                    order.id_admin_pendaftar,
                    order.id,
                    'Pesanan Dibatalkan Otomatis ⏰',
                    `Pesanan #${order.id} dibatalkan karena pembayaran tidak terverifikasi dalam ${BATAS_MENIT_VERIFIKASI} menit.`
                ]
            );
        } catch (notifErr) {
            console.warn('⚠️ Notifikasi pembatalan otomatis gagal (non-fatal):', notifErr.message);
        }
    }
    return rows.length;
};

// Ringkasan Laporan Penjualan Tenant (US-13)
// Menggunakan kolom baru: status_pesanan & status_pembayaran
exports.getTenantSummary = async (req, res) => {
    try {
        const { id_tenant } = req.params;

        // Total pendapatan dari pesanan yang tidak dibatalkan
        const [totalRevenue] = await db.query(
            `SELECT 
                COUNT(*) as total_pesanan,
                                COALESCE(SUM(CASE WHEN status_pesanan != 'Dibatalkan' AND status_pembayaran = 'Sudah Dibayar' THEN total_harga ELSE 0 END), 0) as total_pendapatan,
                SUM(CASE WHEN status_pesanan = 'Menunggu' AND (metode_pembayaran = 'Tunai' OR status_pembayaran = 'Sudah Dibayar') THEN 1 ELSE 0 END) as perlu_dimasak,
                SUM(CASE WHEN status_pesanan = 'Diproses' THEN 1 ELSE 0 END) as antrean_diproses,
                SUM(CASE WHEN status_pesanan = 'Siap Diambil' THEN 1 ELSE 0 END) as siap_diambil,
                SUM(CASE WHEN status_pesanan = 'Selesai' THEN 1 ELSE 0 END) as order_selesai,
                SUM(CASE WHEN status_pesanan = 'Dibatalkan' THEN 1 ELSE 0 END) as order_dibatalkan
             FROM pesanan 
             WHERE id_tenant = ?`,
            [id_tenant]
        );

        // Menu terlaris
        const [popularMenu] = await db.query(
            `SELECT mn.nama_menu, SUM(dp.jumlah_pesanan) as total_terjual
             FROM detail_pesanan dp
             JOIN menu mn ON dp.id_menu = mn.id
             JOIN pesanan p ON dp.id_pesanan = p.id
             WHERE p.id_tenant = ? AND p.status_pesanan != 'Dibatalkan'
             GROUP BY mn.id, mn.nama_menu
             ORDER BY total_terjual DESC
             LIMIT 5`,
            [id_tenant]
        );

        res.status(200).json({
            success: true,
            data: {
                statistik: totalRevenue[0],
                menu_terlaris: popularMenu
            }
        });
    } catch (error) {
        console.error('Error saat mengambil ringkasan tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil ringkasan tenant',
            error: error.message
        });
    }
};