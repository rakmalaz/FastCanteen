const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateDatabase() {
    console.log('🔄 Memulai migrasi database FastCanteen v2...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        const sqlFilePath = path.join(__dirname, 'fastcanteen_db_v2.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('📄 Mengeksekusi script SQL fastcanteen_db_v2.sql...');
        await connection.query(sqlContent);
        console.log('✅ Skema database fastcanteen_db v2 berhasil dibuat dan di-seed!');
    } catch (err) {
        console.error('❌ Gagal melakukan migrasi database:', err.message);
    } finally {
        await connection.end();
    }
}

migrateDatabase();

