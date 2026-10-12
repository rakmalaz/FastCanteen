const db = require('../config/db');

// Mengambil seluruh menu makanan & minuman (US-03)
exports.getAllMenu = async (req, res) => {
    try {
        const { id_tenant, cari, status } = req.query;

        let query = `
            SELECT m.id, m.id_tenant, m.nama_menu, m.harga, m.foto, m.status_tersedia,
                   t.nama_tenant, t.lokasi_stan
            FROM menu m
            JOIN tenant t ON m.id_tenant = t.id
            WHERE 1=1
        `;
        const params = [];

        if (id_tenant) {
            query += ' AND m.id_tenant = ?';
            params.push(id_tenant);
        }

        if (status) {
            query += ' AND m.status_tersedia = ?';
            params.push(status);
        }

        if (cari) {
            query += ' AND (m.nama_menu LIKE ? OR t.nama_tenant LIKE ?)';
            params.push(`%${cari}%`, `%${cari}%`);
        }

        query += ' ORDER BY m.id DESC';

        const [rows] = await db.query(query, params);

        res.status(200).json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Error saat mengambil menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data menu',
            error: error.message
        });
    }
};

// Mengambil menu berdasarkan ID
exports.getMenuById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT m.*, t.nama_tenant, t.lokasi_stan
            FROM menu m
            JOIN tenant t ON m.id_tenant = t.id
            WHERE m.id = ?
        `;
        const [rows] = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error saat mengambil detail menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail menu',
            error: error.message
        });
    }
};

// Menambahkan menu baru oleh pihak tenant (US-09)
exports.createMenu = async (req, res) => {
    try {
        const { id_tenant, nama_menu, harga, foto, status_tersedia } = req.body;

        if (!id_tenant || !nama_menu || !harga) {
            return res.status(400).json({
                success: false,
                message: 'ID Tenant, nama menu, dan harga wajib diisi'
            });
        }

        // Pastikan tenant ada
        const [tenants] = await db.query('SELECT id FROM tenant WHERE id = ?', [id_tenant]);
        if (tenants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant tidak valid atau tidak ditemukan'
            });
        }

        const statusTersedia = status_tersedia || 'tersedia';
        const fotoUrl = foto || null;

        const [result] = await db.query(
            'INSERT INTO menu (id_tenant, nama_menu, harga, foto, status_tersedia) VALUES (?, ?, ?, ?, ?)',
            [id_tenant, nama_menu, parseFloat(harga), fotoUrl, statusTersedia]
        );

        res.status(201).json({
            success: true,
            message: 'Menu berhasil ditambahkan',
            data: {
                id: result.insertId,
                id_tenant,
                nama_menu,
                harga: parseFloat(harga),
                foto: fotoUrl,
                status_tersedia: statusTersedia
            }
        });
    } catch (error) {
        console.error('Error saat menambahkan menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan menu',
            error: error.message
        });
    }
};

// Memperbarui menu makanan
exports.updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_menu, harga, foto, status_tersedia } = req.body;

        const [existing] = await db.query('SELECT id FROM menu WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        await db.query(
            `UPDATE menu 
             SET nama_menu = COALESCE(?, nama_menu),
                 harga = COALESCE(?, harga),
                 foto = COALESCE(?, foto),
                 status_tersedia = COALESCE(?, status_tersedia)
             WHERE id = ?`,
            [nama_menu, harga ? parseFloat(harga) : null, foto, status_tersedia, id]
        );

        const [updated] = await db.query('SELECT * FROM menu WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Menu berhasil diperbarui',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error saat memperbarui menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui menu',
            error: error.message
        });
    }
};

// Mengubah status ketersediaan menu (Tersedia / Habis)
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status_tersedia } = req.body;

        if (!status_tersedia || !['tersedia', 'habis'].includes(status_tersedia)) {
            return res.status(400).json({
                success: false,
                message: 'Status harus berupa "tersedia" atau "habis"'
            });
        }

        const [result] = await db.query(
            'UPDATE menu SET status_tersedia = ? WHERE id = ?',
            [status_tersedia, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: `Status menu berhasil diubah menjadi ${status_tersedia}`,
            data: { id, status_tersedia }
        });
    } catch (error) {
        console.error('Error saat mengubah status menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengubah status menu',
            error: error.message
        });
    }
};

// Menghapus menu
exports.deleteMenu = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query('DELETE FROM menu WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Menu berhasil dihapus'
        });
    } catch (error) {
        console.error('Error saat menghapus menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus menu',
            error: error.message
        });
    }
};
