// Migrasi: menghapus fitur pembayaran Tunai dari database yang SUDAH ADA.
//   node migrate_hapus_tunai.js           -> hanya menampilkan apa yang akan dihapus (aman)
//   node migrate_hapus_tunai.js --lanjut  -> benar-benar menjalankan
//
// Yang dilakukan:
//  1. Menghapus pesanan ber-metode Tunai beserta detail & notifikasinya (ON DELETE CASCADE)
//  2. Menghapus status pembayaran 'Belum Dibayar' dari enum (khusus pesanan Tunai) dan
//     menjadikan 'Menunggu Verifikasi' sebagai default
// Catatan: omzet/riwayat dari pesanan Tunai ikut hilang. Backup database dulu bila perlu.
const mysql = require('mysql2/promise');
require('dotenv').config();

async function jalankan() {
    const lanjut = process.argv.includes('--lanjut');
    const dbName = process.env.DB_NAME || 'fastcanteen_db';
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
    });

    try {
        const [[tunai]] = await conn.query(
            "SELECT COUNT(*) AS jumlah, COALESCE(SUM(total_harga), 0) AS total FROM pesanan WHERE metode_pembayaran = 'Tunai'"
        );
        const [[belum]] = await conn.query(
            "SELECT COUNT(*) AS jumlah FROM pesanan WHERE status_pembayaran = 'Belum Dibayar'"
        );
        console.log(`Pesanan Tunai: ${tunai.jumlah} (total Rp ${Number(tunai.total).toLocaleString('id-ID')})`);
        console.log(`Pesanan berstatus 'Belum Dibayar': ${belum.jumlah}`);

        if (!lanjut) {
            console.log('\nIni hanya pratinjau. Jalankan ulang dengan: node migrate_hapus_tunai.js --lanjut');
            return;
        }

        await conn.beginTransaction();
        const [hapus] = await conn.query(
            "DELETE FROM pesanan WHERE metode_pembayaran = 'Tunai' OR status_pembayaran = 'Belum Dibayar'"
        );
        console.log(`🗑️  ${hapus.affectedRows} pesanan Tunai dihapus (beserta detail & notifikasinya)`);

        await conn.query(
            `ALTER TABLE pesanan MODIFY COLUMN status_pembayaran
             ENUM('Menunggu Verifikasi','Sudah Dibayar','Bukti Ditolak','Dikembalikan')
             NOT NULL DEFAULT 'Menunggu Verifikasi'`
        );
        console.log("✅ Enum status_pembayaran diperbarui (tanpa 'Belum Dibayar')");
        await conn.commit();
        console.log('🎉 Selesai. Restart backend.');
    } catch (err) {
        try { await conn.rollback(); } catch (_) { /* abaikan */ }
        console.error('❌ Migrasi gagal:', err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

jalankan();
