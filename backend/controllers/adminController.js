const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Daftar 4 Super Admin Resmi FastCanteen UINSA Sunan Ampel Kampus 2
const OFFICIAL_SUPER_ADMINS = [
    {
        nim: '09020625073',
        nama: 'Rayhan Akmal Azhari',
        email: 'rayhan@uinsa.ac.id',
        role_label: 'Super Admin 1 · Database & System Architect'
    },
    {
        nim: '09040625094',
        nama: 'Putra Mahardhika Surasa',
        email: 'putra@uinsa.ac.id',
        role_label: 'Super Admin 2 · Frontend & UI/UX Specialist'
    },
    {
        nim: '09010625007',
        nama: 'Elka Putra Prasetiyo',
        email: 'elka@uinsa.ac.id',
        role_label: 'Super Admin 3 · Fullstack & API Integration Lead'
    },
    {
        nim: '09030625107',
        nama: 'Rizki Ridhwan Arif S.',
        email: 'rizki@uinsa.ac.id',
        role_label: 'Super Admin 4 · Quality Assurance & Business Operations'
    }
];

// Ringkasan Statistik Global untuk Super Admin Dashboard
exports.getOverview = async (req, res) => {
    try {
        // 1. Ambil 4 Super Admin dari database
        const [adminRows] = await db.query(
            "SELECT id, nama, nim, email, peran, no_hp FROM pengguna WHERE peran = 'admin' ORDER BY id ASC"
        );

        // Gabungkan dengan data resmi
        const superAdmins = OFFICIAL_SUPER_ADMINS.map(official => {
            const foundInDb = adminRows.find(a => a.nim === official.nim || a.email === official.email);
            return {
                ...official,
                id: foundInDb ? foundInDb.id : null,
                no_hp: foundInDb ? foundInDb.no_hp : '-',
                status: 'Aktif'
            };
        });

        // 2. Metrik Statistik
        const [tenantCount] = await db.query('SELECT COUNT(*) as total FROM tenant');
        const [mahasiswaCount] = await db.query("SELECT COUNT(*) as total FROM pengguna WHERE peran = 'mahasiswa'");
        const [menuCount] = await db.query('SELECT COUNT(*) as total FROM menu');
        
        const [orderStats] = await db.query(`
            SELECT 
                COUNT(*) as total_pesanan,
                COALESCE(SUM(CASE WHEN status_pesanan <> 'Dibatalkan' AND status_pembayaran NOT IN ('Menunggu Verifikasi', 'Bukti Ditolak') THEN total_harga ELSE 0 END), 0) as total_omzet,
                SUM(CASE WHEN status_pesanan = 'Menunggu' THEN 1 ELSE 0 END) as menunggu,
                SUM(CASE WHEN status_pesanan = 'Diproses' THEN 1 ELSE 0 END) as diproses,
                SUM(CASE WHEN status_pesanan = 'Siap Diambil' THEN 1 ELSE 0 END) as siap_diambil,
                SUM(CASE WHEN status_pesanan = 'Selesai' THEN 1 ELSE 0 END) as selesai
            FROM pesanan
        `);

        // 3. Pesanan Terbaru lintas semua tenant (5 transaksi terakhir)
        const [recentOrders] = await db.query(`
            SELECT p.id, p.total_harga, p.status_pesanan, p.status_pembayaran, p.metode_pembayaran, p.waktu_transaksi,
                   t.nama_tenant, t.lokasi_stan,
                   m.nama as nama_mahasiswa, m.nim as nim_mahasiswa
            FROM pesanan p
            JOIN tenant t ON p.id_tenant = t.id
            JOIN pengguna m ON p.id_mahasiswa = m.id
            ORDER BY p.id DESC
            LIMIT 5
        `);

        res.status(200).json({
            success: true,
            data: {
                super_admins: superAdmins,
                statistik: {
                    total_tenant: tenantCount[0].total,
                    total_mahasiswa: mahasiswaCount[0].total,
                    total_menu: menuCount[0].total,
                    total_pesanan: orderStats[0].total_pesanan,
                    total_omzet: parseFloat(orderStats[0].total_omzet || 0),
                    status_breakdown: {
                        diproses: orderStats[0].diproses || 0,
                        siap_diambil: orderStats[0].siap_diambil || 0,
                        selesai: orderStats[0].selesai || 0
                    }
                },
                pesanan_terbaru: recentOrders
            }
        });
    } catch (error) {
        console.error('Error saat mengambil data overview admin:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil overview dashboard Super Admin',
            error: error.message
        });
    }
};

// Mengambil seluruh Tenant dengan data analitik per stan
exports.getTenants = async (req, res) => {
    try {
                const query = `
            SELECT t.id, t.nama_tenant, t.lokasi_stan, t.id_admin_pendaftar,
                   p.nama AS nama_pemilik, p.email AS email_pemilik, p.no_hp AS no_hp_pemilik,
                   (SELECT COUNT(*) FROM menu m WHERE m.id_tenant = t.id) AS total_menu,
                   (SELECT COUNT(*) FROM pesanan ps WHERE ps.id_tenant = t.id) AS total_pesanan,
                   (SELECT COALESCE(SUM(ps.total_harga), 0) FROM pesanan ps
                     WHERE ps.id_tenant = t.id
                       AND ps.status_pesanan <> 'Dibatalkan'
                       AND ps.status_pembayaran NOT IN ('Menunggu Verifikasi', 'Bukti Ditolak')) AS total_pendapatan
            FROM tenant t
            LEFT JOIN pengguna p ON t.id_admin_pendaftar = p.id
            ORDER BY t.id ASC
        `;
        const [rows] = await db.query(query);

        res.status(200).json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Error saat mengambil daftar tenant admin:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar tenant',
            error: error.message
        });
    }
};

// Super Admin Mendaftarkan Tenant Baru (Tenant TIDAK BISA daftar mandiri)
exports.registerTenant = async (req, res) => {
    try {
        const {
            nama_pemilik,
            nama_tenant,
            lokasi_stan,
            email,
            kata_sandi,
            no_hp
        } = req.body;

        if (!nama_pemilik || !nama_tenant || !lokasi_stan || !email || !kata_sandi) {
            return res.status(400).json({
                success: false,
                message: 'Nama pemilik, nama stan, lokasi stan, email login, dan kata sandi wajib diisi'
            });
        }

        // Cek email apakah sudah digunakan
        const [existing] = await db.query('SELECT id FROM pengguna WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Email "${email}" sudah terdaftar. Gunakan email stan yang lain.`
            });
        }

                // Dua INSERT dibungkus transaksi: jika salah satu gagal, keduanya dibatalkan
        const conn = await db.getConnection();
        let newUserId, newTenantId;
        try {
            await conn.beginTransaction();

            const [userResult] = await conn.query(
                'INSERT INTO pengguna (nama, email, kata_sandi, peran, no_hp) VALUES (?, ?, ?, ?, ?)',
                [nama_pemilik, email, kata_sandi, 'tenant', no_hp || null]
            );
            newUserId = userResult.insertId;

            const [tenantResult] = await conn.query(
                'INSERT INTO tenant (nama_tenant, lokasi_stan, id_admin_pendaftar) VALUES (?, ?, ?)',
                [nama_tenant, lokasi_stan, newUserId]
            );
            newTenantId = tenantResult.insertId;

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        res.status(201).json({
            success: true,
            message: `Tenant "${nama_tenant}" berhasil didaftarkan oleh Super Admin! Pengelola dapat login menggunakan email ${email}.`,
            data: {
                id: newTenantId,
                nama_tenant,
                lokasi_stan,
                pemilik: {
                    id: newUserId,
                    nama: nama_pemilik,
                    email,
                    no_hp: no_hp || null,
                    peran: 'tenant'
                }
            }
        });
    } catch (error) {
        console.error('Error saat Super Admin mendaftarkan tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mendaftarkan tenant baru',
            error: error.message
        });
    }
};

// Menghapus Tenant beserta akun pengelolanya
exports.deleteTenant = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil data tenant untuk tahu akun pengelolanya
        const [tenants] = await db.query('SELECT * FROM tenant WHERE id = ?', [id]);
        if (tenants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant tidak ditemukan'
            });
        }

        const tenant = tenants[0];

                // Catat file bukti pembayaran milik stan ini sebelum datanya terhapus
        const [fileBukti] = await db.query(
            'SELECT bukti_pembayaran FROM pesanan WHERE id_tenant = ? AND bukti_pembayaran IS NOT NULL',
            [id]
        );

        await db.query('DELETE FROM tenant WHERE id = ?', [id]);

        // Hapus file bukti dari folder uploads (gagal hapus file tidak menggagalkan proses)
        for (const row of fileBukti) {
            const namaFile = path.basename(String(row.bukti_pembayaran));
            fs.promises.unlink(path.join(__dirname, '..', 'uploads', namaFile)).catch(() => {});
        }

        // Hapus akun pengguna jika ada
        if (tenant.id_admin_pendaftar) {
            await db.query("DELETE FROM pengguna WHERE id = ? AND peran = 'tenant'", [tenant.id_admin_pendaftar]);
        }

        res.status(200).json({
            success: true,
            message: `Tenant "${tenant.nama_tenant}" berhasil dihapus dari sistem FastCanteen`
        });
    } catch (error) {
        console.error('Error saat menghapus tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus tenant',
            error: error.message
        });
    }
};

// Mengambil seluruh pesanan kantin secara menyeluruh (Semua Tenant)
exports.getAllOrders = async (req, res) => {
    try {
        const { status, status_pesanan, status_pembayaran } = req.query;
        const targetStatus = status_pesanan || status;

        let query = `
            SELECT p.*,
                   t.nama_tenant, t.lokasi_stan,
                   m.nama as nama_mahasiswa, m.nim as nim_mahasiswa, m.no_hp as no_hp_mahasiswa
            FROM pesanan p
            JOIN tenant t ON p.id_tenant = t.id
            JOIN pengguna m ON p.id_mahasiswa = m.id
        `;
        const params = [];

        if (targetStatus) {
            query += ' WHERE p.status_pesanan = ?';
            params.push(targetStatus);
        }

        if (status_pembayaran) {
            query += targetStatus ? ' AND p.status_pembayaran = ?' : ' WHERE p.status_pembayaran = ?';
            params.push(status_pembayaran);
        }

        query += ' ORDER BY p.id DESC';

        const [orders] = await db.query(query, params);

        // Ambil rincian menu untuk setiap pesanan
        const ordersWithDetails = await Promise.all(
            orders.map(async (order) => {
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
            total: ordersWithDetails.length,
            data: ordersWithDetails
        });
    } catch (error) {
        console.error('Error saat mengambil semua pesanan untuk admin:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil seluruh transaksi pesanan',
            error: error.message
        });
    }
};

// Mengambil daftar seluruh Mahasiswa terdaftar
exports.getAllStudents = async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.nama, p.nim, p.email, p.no_hp,
                   COUNT(ps.id) as total_pesanan,
                   COALESCE(SUM(ps.total_harga), 0) as total_belanja
            FROM pengguna p
            LEFT JOIN pesanan ps ON p.id = ps.id_mahasiswa
            WHERE p.peran = 'mahasiswa'
            GROUP BY p.id, p.nama, p.nim, p.email, p.no_hp
            ORDER BY p.id DESC
        `;
        const [students] = await db.query(query);

        res.status(200).json({
            success: true,
            total: students.length,
            data: students
        });
    } catch (error) {
        console.error('Error saat mengambil daftar mahasiswa:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data mahasiswa',
            error: error.message
        });
    }
};

// Mengambil 4 Super Admin resmi
exports.getSuperAdmins = (req, res) => {
    res.status(200).json({
        success: true,
        data: OFFICIAL_SUPER_ADMINS
    });
};
