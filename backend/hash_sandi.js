// Mengubah SEMUA kata sandi polos di tabel pengguna menjadi hash bcrypt.
//   node hash_sandi.js
// Aman dijalankan berulang kali: kata sandi yang sudah di-hash ($2...) dilewati.
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function jalankan() {
    try {
        const [rows] = await db.query(
            "SELECT id, nama, email, kata_sandi FROM pengguna WHERE kata_sandi NOT LIKE '$2%'"
        );

        if (rows.length === 0) {
            console.log('✅ Semua kata sandi sudah ter-hash. Tidak ada yang perlu diubah.');
            return;
        }

        for (const u of rows) {
            const hash = await bcrypt.hash(String(u.kata_sandi).trim(), 10);
            await db.query('UPDATE pengguna SET kata_sandi = ? WHERE id = ?', [hash, u.id]);
            console.log(`🔐 ${u.nama} (${u.email}) -> di-hash`);
        }
        console.log(`\n🎉 Selesai: ${rows.length} kata sandi diubah menjadi hash bcrypt.`);
    } catch (err) {
        console.error('❌ Gagal:', err.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

jalankan();