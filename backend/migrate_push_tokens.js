// Membuat tabel push_tokens (token notifikasi per perangkat). Aman dijalankan berulang.
// Jalankan sekali:  node migrate_push_tokens.js
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'fastcanteen_db',
    });
    try {
        await conn.query(
            `CREATE TABLE IF NOT EXISTS push_tokens (
               id int(11) NOT NULL AUTO_INCREMENT,
               user_id int(11) NOT NULL,
               expo_push_token varchar(255) NOT NULL,
               dibuat_pada datetime NOT NULL DEFAULT current_timestamp(),
               diperbarui_pada datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
               PRIMARY KEY (id),
               UNIQUE KEY uq_expo_push_token (expo_push_token),
               KEY idx_push_user (user_id),
               CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES pengguna (id) ON DELETE CASCADE
             ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
        );
        console.log('✅ Tabel push_tokens siap');
    } catch (err) {
        console.error('❌ Gagal membuat push_tokens:', err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
})();
