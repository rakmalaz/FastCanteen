const mysql = require('mysql2/promise');
require('dotenv').config();

const STATUS_PESANAN = ['Menunggu', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'];

async function hasColumn(conn, dbName, table, column) {
    const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, table, column]
    );
    return rows.length > 0;
}

async function migrate() {
    const dbName = process.env.DB_NAME || 'fastcanteen_db';
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
    });

    try {
        console.log(`🔄 Migrasi aman pada database "${dbName}"...`);

        // 1. status_pembayaran
        if (!(await hasColumn(conn, dbName, 'pesanan', 'status_pembayaran'))) {
            await conn.query(
                `ALTER TABLE pesanan
                 ADD COLUMN status_pembayaran ENUM('Belum Dibayar','Sudah Dibayar','Dikembalikan')
                 NOT NULL DEFAULT 'Sudah Dibayar' AFTER metode_pembayaran`
            );
            console.log('✅ Kolom status_pembayaran ditambahkan');
        } else {
            console.log('⏭️  status_pembayaran sudah ada');
        }

        // 2. status_pesanan (salin nilai dari kolom lama `status` bila ada)
        if (!(await hasColumn(conn, dbName, 'pesanan', 'status_pesanan'))) {
            await conn.query(
                `ALTER TABLE pesanan
                 ADD COLUMN status_pesanan ENUM('Menunggu','Diproses','Siap Diambil','Selesai','Dibatalkan')
                 NOT NULL DEFAULT 'Menunggu' AFTER status_pembayaran`
            );
            console.log('✅ Kolom status_pesanan ditambahkan');

            if (await hasColumn(conn, dbName, 'pesanan', 'status')) {
                await conn.query(
                    `UPDATE pesanan
                     SET status_pesanan = IF(status IN (?), status, 'Menunggu')`,
                    [STATUS_PESANAN]
                );
                console.log('✅ Nilai status lama disalin ke status_pesanan');
            }
        } else {
            console.log('⏭️  status_pesanan sudah ada');
        }

        // 3. Hapus kolom lama yang sudah tidak dipakai kode
        if (await hasColumn(conn, dbName, 'pesanan', 'status')) {
            await conn.query('ALTER TABLE pesanan DROP COLUMN `status`');
            console.log('🗑️  Kolom lama `status` dihapus');
        }
        if (await hasColumn(conn, dbName, 'pesanan', 'jam_pengambilan')) {
            await conn.query('ALTER TABLE pesanan DROP COLUMN jam_pengambilan');
            console.log('🗑️  Kolom lama jam_pengambilan dihapus');
        }

        // 4. Tabel notifikasi (dipakai saat pesanan dibuat)
        await conn.query(
            `CREATE TABLE IF NOT EXISTS notifikasi (
              id int(11) NOT NULL AUTO_INCREMENT,
              id_penerima int(11) NOT NULL,
              id_pengirim int(11) DEFAULT NULL,
              id_pesanan int(11) DEFAULT NULL,
              judul varchar(150) NOT NULL,
              pesan text NOT NULL,
              tipe enum('pesanan_baru','status_diproses','siap_diambil','selesai','dibatalkan','promo','info') NOT NULL DEFAULT 'info',
              is_read tinyint(1) NOT NULL DEFAULT 0,
              created_at datetime DEFAULT current_timestamp(),
              PRIMARY KEY (id),
              KEY idx_penerima (id_penerima),
              KEY idx_pesanan (id_pesanan),
              CONSTRAINT fk_notif_penerima FOREIGN KEY (id_penerima) REFERENCES pengguna (id) ON DELETE CASCADE,
              CONSTRAINT fk_notif_pengirim FOREIGN KEY (id_pengirim) REFERENCES pengguna (id) ON DELETE SET NULL,
              CONSTRAINT fk_notif_pesanan FOREIGN KEY (id_pesanan) REFERENCES pesanan (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
        );
        console.log('✅ Tabel notifikasi siap');

        // 4b. Fitur verifikasi pembayaran: nilai status baru + kolom pendukung
        const [[enumInfo]] = await conn.query(
            `SELECT COLUMN_TYPE AS tipe FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pesanan' AND COLUMN_NAME = 'status_pembayaran'`,
            [dbName]
        );
        if (enumInfo && !enumInfo.tipe.includes('Menunggu Verifikasi')) {
            await conn.query(
                `ALTER TABLE pesanan MODIFY COLUMN status_pembayaran
                 ENUM('Belum Dibayar','Menunggu Verifikasi','Sudah Dibayar','Bukti Ditolak','Dikembalikan')
                 NOT NULL DEFAULT 'Belum Dibayar'`
            );
            console.log('✅ Status pembayaran: Menunggu Verifikasi & Bukti Ditolak ditambahkan');
        }
        const kolomVerifikasi = [
            ['catatan_verifikasi', 'VARCHAR(255) NULL'],
            ['jumlah_penolakan', 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
            ['diverifikasi_oleh', 'INT NULL'],
            ['waktu_verifikasi', 'DATETIME NULL'],
        ];
        for (const [nama, definisi] of kolomVerifikasi) {
            if (!(await hasColumn(conn, dbName, 'pesanan', nama))) {
                await conn.query(`ALTER TABLE pesanan ADD COLUMN ${nama} ${definisi}`);
                console.log(`✅ Kolom ${nama} ditambahkan`);
            }
        }

        // 5. Bersihkan bukti pembayaran palsu (link placeholder) dari data contoh lama
        const [cleaned] = await conn.query(
            "UPDATE pesanan SET bukti_pembayaran = NULL WHERE bukti_pembayaran LIKE 'https://via.placeholder.com%'"
        );
        console.log(`🧹 Bukti placeholder lama dibersihkan: ${cleaned.affectedRows} pesanan`);

        console.log('🎉 Migrasi selesai. Restart backend lalu coba checkout lagi.');
    } catch (err) {
        console.error('❌ Migrasi gagal:', err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

migrate();