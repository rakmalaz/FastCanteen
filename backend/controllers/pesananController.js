const db = require('../config/db');

// Membuat Pre-Order Baru (US-04, US-06)
// Tanpa jam_pengambilan, status_pembayaran & status_pesanan terpisah, otomatis notifikasi ke tenant
exports.createPesanan = async (req, res) => {
    let connection;
    try {
        const {
            id_mahasiswa,
            id_tenant,
            metode_pembayaran,
            status_pembayaran,
            status_pesanan,
            catatan,
            bukti_pembayaran,
            items // Array of { id_menu, jumlah_pesanan }
        } = req.body;

        if (!id_mahasiswa || !id_tenant || !metode_pembayaran) {
            return res.status(400).json({
                success: false,
                message: 'Mahasiswa, tenant, dan metode pembayaran wajib diisi'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pesanan harus memiliki minimal 1 menu'
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
                'SELECT id, nama_menu, harga, status_tersedia FROM menu WHERE id = ?',
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
            if (menu.status_tersedia === 'habis') {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Maaf, stok menu "${menu.nama_menu}" sedang habis`
                });
            }

            const jumlah = parseInt(item.jumlah_pesanan, 10) || 1;
            const subHarga = parseFloat(menu.harga) * jumlah;
            totalHarga += subHarga;

            detailItemsToInsert.push({
                id_menu: menu.id,
                nama_menu: menu.nama_menu,
                jumlah_pesanan: jumlah,
                sub_harga: subHarga
            });
        }

        // Tentukan status default
        const finalStatusPembayaran = status_pembayaran || 'Sudah Dibayar';
        const finalStatusPesanan = status_pesanan || 'Menunggu';

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
                bukti_pembayaran || null,
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

        // 6. Buat otomatis notifikasi untuk tenant (kirim ke id_admin_pendaftar)
        const judulNotif = 'Pesanan Baru Masuk! 🛎️';
        const pesanNotif = `Pesanan #${newPesananId} dari ${namaMahasiswa} sebesar Rp ${Number(totalHarga).toLocaleString('id-ID')} telah masuk. Mohon segera diproses.`;

        await connection.query(
            `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, 'pesanan_baru', 0, NOW())`,
            [
                tenantData.id_admin_pendaftar,
                id_mahasiswa,
                newPesananId,
                judulNotif,
                pesanNotif
            ]
        );

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
                bukti_pembayaran: bukti_pembayaran || null,
                catatan: catatan || null,
                items: detailItemsToInsert
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error saat membuat pesanan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat pesanan',
            error: error.message
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
            SELECT p.*, t.nama_tenant, t.lokasi_stan,
                   m.nama as nama_mahasiswa, m.nim, m.no_hp as no_hp_mahasiswa
            FROM pesanan p
            JOIN tenant t ON p.id_tenant = t.id
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

        query += ' ORDER BY p.id DESC';

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

        const [result] = await db.query(
            'UPDATE pesanan SET status_pesanan = ?, waktu_perubahan_status = NOW() WHERE id = ?',
            [status, id]
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
        const { bukti_pembayaran } = req.body;

        if (!bukti_pembayaran) {
            return res.status(400).json({
                success: false,
                message: 'URL atau data bukti pembayaran wajib disertakan'
            });
        }

        const [result] = await db.query(
            'UPDATE pesanan SET bukti_pembayaran = ?, waktu_perubahan_status = NOW() WHERE id = ?',
            [bukti_pembayaran, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Bukti pembayaran berhasil disimpan',
            data: { id, bukti_pembayaran }
        });
    } catch (error) {
        console.error('Error saat mengunggah bukti pembayaran:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan bukti pembayaran',
            error: error.message
        });
    }
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
                COALESCE(SUM(CASE WHEN status_pesanan != 'Dibatalkan' THEN total_harga ELSE 0 END), 0) as total_pendapatan,
                SUM(CASE WHEN status_pesanan = 'Menunggu' THEN 1 ELSE 0 END) as antrean_menunggu,
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
