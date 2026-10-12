const db = require('../config/db');

// Membuat Pre-Order Baru (US-04, US-06)
exports.createPesanan = async (req, res) => {
    let connection;
    try {
        const {
            id_mahasiswa,
            id_tenant,
            jam_pengambilan,
            metode_pembayaran,
            catatan,
            bukti_pembayaran,
            items // Array of { id_menu, jumlah_pesanan }
        } = req.body;

        if (!id_mahasiswa || !id_tenant || !jam_pengambilan || !metode_pembayaran) {
            return res.status(400).json({
                success: false,
                message: 'Mahasiswa, tenant, jam pengambilan, dan metode pembayaran wajib diisi'
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

        // Hitung total harga dan validasi setiap menu
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

            const jumlah = parseInt(item.jumlah_pesanan) || 1;
            const subHarga = parseFloat(menu.harga) * jumlah;
            totalHarga += subHarga;

            detailItemsToInsert.push({
                id_menu: menu.id,
                nama_menu: menu.nama_menu,
                jumlah_pesanan: jumlah,
                sub_harga: subHarga
            });
        }

        // Simpan ke tabel pesanan
        const [resultPesanan] = await connection.query(
            `INSERT INTO pesanan 
             (id_mahasiswa, id_tenant, jam_pengambilan, total_harga, metode_pembayaran, status, bukti_pembayaran, catatan) 
             VALUES (?, ?, ?, ?, ?, 'Diproses', ?, ?)`,
            [
                id_mahasiswa,
                id_tenant,
                jam_pengambilan,
                totalHarga,
                metode_pembayaran,
                bukti_pembayaran || null,
                catatan || null
            ]
        );

        const newPesananId = resultPesanan.insertId;

        // Simpan setiap item ke detail_pesanan
        for (const detail of detailItemsToInsert) {
            await connection.query(
                'INSERT INTO detail_pesanan (id_pesanan, id_menu, jumlah_pesanan, sub_harga) VALUES (?, ?, ?, ?)',
                [newPesananId, detail.id_menu, detail.jumlah_pesanan, detail.sub_harga]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Pre-order FastCanteen berhasil dibuat',
            data: {
                id_pesanan: newPesananId,
                id_mahasiswa,
                id_tenant,
                jam_pengambilan,
                total_harga: totalHarga,
                metode_pembayaran,
                status: 'Diproses',
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
exports.getPesananByMahasiswa = async (req, res) => {
    try {
        const { id_mahasiswa } = req.params;

        const [pesananRows] = await db.query(
            `SELECT p.*, t.nama_tenant, t.lokasi_stan,
                    m.nama as nama_mahasiswa, m.nim, m.no_hp as no_hp_mahasiswa
             FROM pesanan p
             JOIN tenant t ON p.id_tenant = t.id
             JOIN pengguna m ON p.id_mahasiswa = m.id
             WHERE p.id_mahasiswa = ?
             ORDER BY p.id DESC`,
            [id_mahasiswa]
        );

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

// Mengambil Daftar Pesanan Masuk untuk Tenant (US-05)
exports.getPesananByTenant = async (req, res) => {
    try {
        const { id_tenant } = req.params;
        const { status } = req.query;

        let query = `
            SELECT p.*, m.nama as nama_mahasiswa, m.nim as nim_mahasiswa, m.no_hp as no_hp_mahasiswa
            FROM pesanan p
            JOIN pengguna m ON p.id_mahasiswa = m.id
            WHERE p.id_tenant = ?
        `;
        const params = [id_tenant];

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
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
        console.error('Error saat mengambil pesanan tenant:', error);
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

// Memperbarui Status Pesanan (US-08: 'Diproses' -> 'Siap Diambil' -> 'Selesai')
exports.updateStatusPesanan = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatus = ['Diproses', 'Siap Diambil', 'Selesai'];
        if (!status || !validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status harus salah satu dari: Diproses, Siap Diambil, Selesai'
            });
        }

        const [result] = await db.query(
            'UPDATE pesanan SET status = ?, waktu_perubahan_status = NOW() WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pesanan tidak ditemukan'
            });
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
            'UPDATE pesanan SET bukti_pembayaran = ? WHERE id = ?',
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
exports.getTenantSummary = async (req, res) => {
    try {
        const { id_tenant } = req.params;

        // Total pendapatan dari pesanan yang tidak dibatalkan
        const [totalRevenue] = await db.query(
            `SELECT 
                COUNT(*) as total_pesanan,
                COALESCE(SUM(total_harga), 0) as total_pendapatan,
                SUM(CASE WHEN status = 'Diproses' THEN 1 ELSE 0 END) as antrean_diproses,
                SUM(CASE WHEN status = 'Siap Diambil' THEN 1 ELSE 0 END) as siap_diambil,
                SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as order_selesai
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
             WHERE p.id_tenant = ?
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
