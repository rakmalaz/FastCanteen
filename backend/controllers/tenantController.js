const db = require('../config/db');

// Mengambil seluruh tenant kantin (US-03)
exports.getAllTenants = async (req, res) => {
    try {
        const query = `
            SELECT t.id, t.nama_tenant, t.lokasi_stan, t.id_admin_pendaftar,
                   p.nama as nama_pemilik, p.no_hp as no_hp_pemilik,
                   COUNT(m.id) as total_menu
            FROM tenant t
            LEFT JOIN pengguna p ON t.id_admin_pendaftar = p.id
            LEFT JOIN menu m ON t.id = m.id_tenant
            GROUP BY t.id, t.nama_tenant, t.lokasi_stan, t.id_admin_pendaftar, p.nama, p.no_hp
            ORDER BY t.id ASC
        `;
        const [rows] = await db.query(query);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error saat mengambil tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data tenant',
            error: error.message
        });
    }
};

// Mengambil detail tenant beserta daftar menunya
exports.getTenantById = async (req, res) => {
    try {
        const { id } = req.params;

        const [tenants] = await db.query(
            `SELECT t.*, p.nama as nama_pemilik, p.no_hp as no_hp_pemilik 
             FROM tenant t 
             LEFT JOIN pengguna p ON t.id_admin_pendaftar = p.id 
             WHERE t.id = ?`,
            [id]
        );

        if (tenants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant tidak ditemukan'
            });
        }

        const [menus] = await db.query(
            'SELECT * FROM menu WHERE id_tenant = ? ORDER BY id DESC',
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                ...tenants[0],
                daftar_menu: menus
            }
        });
    } catch (error) {
        console.error('Error saat mengambil detail tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail tenant',
            error: error.message
        });
    }
};

// Mendaftarkan tenant baru (US-01)
exports.createTenant = async (req, res) => {
    try {
        const { nama_tenant, lokasi_stan, id_admin_pendaftar } = req.body;

        if (!nama_tenant || !lokasi_stan) {
            return res.status(400).json({
                success: false,
                message: 'Nama tenant dan lokasi stan wajib diisi'
            });
        }

        let adminId = id_admin_pendaftar;
        if (!adminId) {
            // Ambil admin pertama jika tidak disediakan
            const [admins] = await db.query(
                "SELECT id FROM pengguna WHERE peran = 'admin' LIMIT 1"
            );
            adminId = admins.length > 0 ? admins[0].id : null;
        }

        if (!adminId) {
            // Ambil pengguna manapun sebagai fallback
            const [users] = await db.query("SELECT id FROM pengguna LIMIT 1");
            adminId = users.length > 0 ? users[0].id : 1;
        }

        const [result] = await db.query(
            'INSERT INTO tenant (nama_tenant, lokasi_stan, id_admin_pendaftar) VALUES (?, ?, ?)',
            [nama_tenant, lokasi_stan, adminId]
        );

        res.status(201).json({
            success: true,
            message: 'Tenant berhasil didaftarkan',
            data: {
                id: result.insertId,
                nama_tenant,
                lokasi_stan,
                id_admin_pendaftar: adminId
            }
        });
    } catch (error) {
        console.error('Error saat membuat tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan tenant',
            error: error.message
        });
    }
};
