const db = require('../config/db');

// Mengambil semua notifikasi milik user tertentu
// GET /api/notifikasi/user/:id_user
exports.getNotifikasiByUser = async (req, res) => {
    try {
        const { id_user } = req.params;

        if (!id_user) {
            return res.status(400).json({
                success: false,
                message: 'ID user wajib disertakan'
            });
        }

        const [rows] = await db.query(
            `SELECT n.*, 
                    p.nama as nama_pengirim,
                    pes.total_harga as pesanan_total_harga,
                    pes.status_pesanan as pesanan_status
             FROM notifikasi n
             LEFT JOIN pengguna p ON n.id_pengirim = p.id
             LEFT JOIN pesanan pes ON n.id_pesanan = pes.id
             WHERE n.id_penerima = ?
             ORDER BY n.created_at DESC, n.id DESC`,
            [id_user]
        );

        const unreadCount = rows.filter(item => !item.is_read || item.is_read === 0).length;

        res.status(200).json({
            success: true,
            total: rows.length,
            unread_count: unreadCount,
            data: rows
        });
    } catch (error) {
        console.error('Error saat mengambil notifikasi user:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar notifikasi',
            error: error.message
        });
    }
};

// Menandai satu notifikasi sebagai sudah dibaca
// PUT /api/notifikasi/:id/baca
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'UPDATE notifikasi SET is_read = 1 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notifikasi tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notifikasi berhasil ditandai telah dibaca'
        });
    } catch (error) {
        console.error('Error saat menandai notifikasi dibaca:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menandai notifikasi',
            error: error.message
        });
    }
};

// Menandai semua notifikasi user sebagai sudah dibaca
// PUT /api/notifikasi/user/:id_user/baca-semua
exports.markAllAsRead = async (req, res) => {
    try {
        const { id_user } = req.params;

        await db.query(
            'UPDATE notifikasi SET is_read = 1 WHERE id_penerima = ?',
            [id_user]
        );

        res.status(200).json({
            success: true,
            message: 'Semua notifikasi berhasil ditandai telah dibaca'
        });
    } catch (error) {
        console.error('Error saat menandai semua notifikasi dibaca:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menandai semua notifikasi',
            error: error.message
        });
    }
};

// Membuat notifikasi baru (internal helper / POST endpoint)
// POST /api/notifikasi
exports.kirimNotifikasi = async (req, res) => {
    try {
        const { id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe } = req.body;

        if (!id_penerima || !judul || !pesan) {
            return res.status(400).json({
                success: false,
                message: 'id_penerima, judul, dan pesan wajib diisi'
            });
        }

        const validTypes = ['pesanan_baru', 'status_diproses', 'siap_diambil', 'selesai', 'dibatalkan', 'promo', 'info'];
        const finalType = validTypes.includes(tipe) ? tipe : 'info';

        const [result] = await db.query(
            `INSERT INTO notifikasi (id_penerima, id_pengirim, id_pesanan, judul, pesan, tipe, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
            [
                id_penerima,
                id_pengirim || null,
                id_pesanan || null,
                judul,
                pesan,
                finalType
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Notifikasi berhasil dikirim',
            data: {
                id: result.insertId,
                id_penerima,
                id_pengirim: id_pengirim || null,
                id_pesanan: id_pesanan || null,
                judul,
                pesan,
                tipe: finalType,
                is_read: 0
            }
        });
    } catch (error) {
        console.error('Error saat mengirim notifikasi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim notifikasi',
            error: error.message
        });
    }
};

// Menghapus notifikasi tertentu
// DELETE /api/notifikasi/:id
exports.deleteNotifikasi = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM notifikasi WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notifikasi tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notifikasi berhasil dihapus'
        });
    } catch (error) {
        console.error('Error saat menghapus notifikasi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus notifikasi',
            error: error.message
        });
    }
};
