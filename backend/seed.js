const db = require('./config/db');

async function seed() {
    try {
        console.log('🌱 Memulai proses seeding data FastCanteen v2...');

        // 1. Bersihkan data lama jika diinginkan
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE notifikasi');
        await db.query('TRUNCATE TABLE detail_pesanan');
        await db.query('TRUNCATE TABLE pesanan');
        await db.query('TRUNCATE TABLE menu');
        await db.query('TRUNCATE TABLE tenant');
        await db.query('TRUNCATE TABLE pengguna');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('🧹 Tabel berhasil dibersihkan');

        // 2. Tambahkan Pengguna
        const users = [
            ['Elka Putra Prasetiyo', '09010625007', 'elka@uinsa.ac.id', '123456', 'mahasiswa', '081234567890'],
            ['Rayhan Akmal Azhari', '09020625073', 'rayhan@uinsa.ac.id', '123456', 'mahasiswa', '081234567891'],
            ['Bu Siti Fatimah', null, 'siti@fastcanteen.com', '123456', 'tenant', '081298765432'],
            ['Cak Slamet', null, 'slamet@fastcanteen.com', '123456', 'tenant', '081298765433'],
            ['Super Admin Kantin', null, 'admin@fastcanteen.com', '123456', 'admin', '081299998888'],
            ['Putra Mahardhika Surasa', '09040625094', 'putra@uinsa.ac.id', '123456', 'admin', '081234567892'],
            ['Rizki Ridhwan Arif S.', '09030625107', 'rizki@uinsa.ac.id', '123456', 'admin', '081234567893'],
            ['Ahmad Mahasiswa Demo', '09010625088', 'mahasiswa@uinsa.ac.id', '123456', 'mahasiswa', '081211112222'],
            ['Pak Joko Barokah', null, 'barokah@fastcanteen.com', '123456', 'tenant', '081298765434']
        ];

        for (const u of users) {
            await db.query(
                'INSERT INTO pengguna (nama, nim, email, kata_sandi, peran, no_hp) VALUES (?, ?, ?, ?, ?, ?)',
                u
            );
        }
        console.log('👤 Akun Pengguna (Mahasiswa, Tenant, Super Admin) berhasil dibuat');

        // Ambil ID pengguna
        const [userRows] = await db.query('SELECT id, email FROM pengguna');
        const userMap = {};
        userRows.forEach(u => { userMap[u.email] = u.id; });

        // 3. Tambahkan Tenant (Kantin)
        const tenants = [
            ['Kantin Mbak Siti (Ayam Geprek & Soto)', 'Stan 01 - Lantai 1 Kantin Belakang UINSA Kampus 2', userMap['siti@fastcanteen.com']],
            ['Kantin Berkah Cak Slamet (Penyetan & Nasgor)', 'Stan 02 - Lantai 1 Kantin Belakang UINSA Kampus 2', userMap['slamet@fastcanteen.com']],
            ['Kedai Barokah (Jus Buah & Kopi Segar)', 'Stan 03 - Lantai 1 Kantin Belakang UINSA Kampus 2', userMap['barokah@fastcanteen.com']]
        ];

        for (const t of tenants) {
            await db.query(
                'INSERT INTO tenant (nama_tenant, lokasi_stan, id_admin_pendaftar) VALUES (?, ?, ?)',
                t
            );
        }
        console.log('🏪 Data Tenant Stan Kantin berhasil dibuat');

        const [tenantRows] = await db.query('SELECT id, nama_tenant FROM tenant');
        const t1 = tenantRows[0].id; // Mbak Siti
        const t2 = tenantRows[1].id; // Cak Slamet
        const t3 = tenantRows[2].id; // Kedai Barokah

        // 4. Tambahkan Menu Makanan & Minuman
        const menus = [
            // Tenant 1
            [t1, 'Ayam Geprek Sambal Bawang + Nasi', 13000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t1, 'Soto Ayam Lamongan Komplit Koya', 12000, 'https://images.unsplash.com/photo-1572656631137-7935297eff55?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t1, 'Tahu & Tempe Crispy Sambal Korek', 6000, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t1, 'Es Teh Manis Jumbo', 4000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60', 'tersedia'],

            // Tenant 2
            [t2, 'Bebek Goreng Sambal Ijo + Nasi', 18000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t2, 'Nasi Goreng Spesial Telur UINSA', 12000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t2, 'Mie Dok-Dok Kuah Pedas Gurih', 11000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t2, 'Ayam Penyet Sambal Terasi + Nasi', 14000, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=60', 'tersedia'],

            // Tenant 3
            [t3, 'Jus Alpukat Kental Cokelat', 8000, 'https://images.unsplash.com/photo-1638176066666-ffb2f5d22a59?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t3, 'Jus Mangga Harum Manis Dingin', 8000, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t3, 'Es Jeruk Peras Murni', 5000, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60', 'tersedia'],
            [t3, 'Es Kopi Susu Gula Aren Mahasiswa', 8000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', 'tersedia']
        ];

        for (const m of menus) {
            await db.query(
                'INSERT INTO menu (id_tenant, nama_menu, harga, foto, status_tersedia) VALUES (?, ?, ?, ?, ?)',
                m
            );
        }
        console.log('🍛 Daftar Menu berhasil dibuat');

        // 5. Tambahkan Contoh Pesanan Aktif (tanpa jam_pengambilan, dengan status_pembayaran & status_pesanan)
        const [menuList] = await db.query('SELECT id, harga FROM menu LIMIT 2');
        const m1 = menuList[0];
        const m2 = menuList[1];
        const totalHarga = parseFloat(m1.harga) + parseFloat(m2.harga);

        const [orderResult] = await db.query(
            `INSERT INTO pesanan 
             (id_mahasiswa, id_tenant, total_harga, metode_pembayaran, status_pembayaran, status_pesanan, bukti_pembayaran, catatan)
             VALUES (?, ?, ?, 'QRIS', 'Sudah Dibayar', 'Diproses', NULL, 'Pedas sedang, koya dipisah')`,
            [userMap['elka@uinsa.ac.id'] || 1, t1, totalHarga]
        );

        const orderId = orderResult.insertId;
        await db.query(
            'INSERT INTO detail_pesanan (id_pesanan, id_menu, jumlah_pesanan, sub_harga) VALUES (?, ?, ?, ?)',
            [orderId, m1.id, 1, m1.harga]
        );
        await db.query(
            'INSERT INTO detail_pesanan (id_pesanan, id_menu, jumlah_pesanan, sub_harga) VALUES (?, ?, ?, ?)',
            [orderId, m2.id, 1, m2.harga]
        );

        // 6. Tambahkan Contoh Notifikasi
        await db.query(
            `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read)
             VALUES (?, ?, ?, 'Pesanan Sedang Dimasak 👨‍🍳', 'Pesanan #${orderId} Anda sedang dimasak oleh Kantin Mbak Siti. Mohon ditunggu!', 'status_diproses', 0)`,
            [userMap['elka@uinsa.ac.id'] || 1, userMap['siti@fastcanteen.com'] || 3, orderId]
        );

        console.log('📦 Contoh pesanan aktif & notifikasi berhasil dibuat');
        console.log('✅ SEEDING DATA FASTCANTEEN V2 SELESAI DENGAN SUKSES!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal melakukan seeding:', err);
        process.exit(1);
    }
}

seed();