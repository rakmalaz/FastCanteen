const db = require('../config/db');
const pushService = require('../services/pushService');

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
        // Kirim juga sebagai push notification ke HP penerima (tidak menunggu / tidak menggagalkan)
        pushService.kirimPushKeUser(id_penerima, {
            title: judul,
            body: pesan,
            data: { screen: 'pesanan', id_pesanan: id_pesanan || null }
        });
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
// Menyimpan push token perangkat milik user yang sedang login
// POST /api/notifikasi/token
exports.daftarPushToken = async (req, res) => {
    try {
        const { expoPushToken } = req.body || {};

        if (!pushService.tokenValid(expoPushToken)) {
            return res.status(400).json({ success: false, message: 'push token tidak valid' });
        }

        // Jika token sudah ada (misalnya HP dipakai akun lain), kepemilikannya dipindah ke user ini
        await db.query(
            `INSERT INTO push_tokens (user_id, expo_push_token)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
               user_id = VALUES(user_id),
               diperbarui_pada = CURRENT_TIMESTAMP`,
            [req.user.id, expoPushToken]
        );

        res.status(201).json({ success: true, message: 'Push token tersimpan' });
    } catch (error) {
        console.error('Error saat menyimpan push token:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan push token', error: error.message });
    }
};

// Menghapus push token perangkat (dipanggil saat logout)
// DELETE /api/notifikasi/token
exports.hapusPushToken = async (req, res) => {
    try {
        const { expoPushToken } = req.body || {};
        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: 'expoPushToken wajib diisi' });
        }

        await db.query(
            'DELETE FROM push_tokens WHERE expo_push_token = ? AND user_id = ?',
            [expoPushToken, req.user.id]
        );

        res.status(200).json({ success: true, message: 'Push token dihapus' });
    } catch (error) {
        console.error('Error saat menghapus push token:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus push token', error: error.message });
    }
};

// Mengirim notifikasi uji ke semua perangkat milik user yang sedang login
// POST /api/notifikasi/test
exports.kirimNotifikasiUji = async (req, res) => {
    try {
        const hasil = await pushService.kirimPushKeUser(req.user.id, {
            title: 'FastCanteen',
            body: 'Notifikasi uji berhasil. Push notification sudah aktif di perangkat ini.',
            data: { screen: req.user.peran === 'tenant' ? 'tenant' : 'pesanan' }
        });

        if (hasil.alasan === 'belum_ada_token') {
            return res.status(404).json({ success: false, message: 'perangkat belum mendaftarkan push token' });
        }
        if (hasil.error) {
            return res.status(502).json({ success: false, message: 'Gagal menghubungi Expo Push Service', error: hasil.error });
        }

        res.status(200).json({ success: true, message: 'Notifikasi uji dikirim', hasil });
    } catch (error) {
        console.error('Error saat mengirim notifikasi uji:', error);
        res.status(500).json({ success: false, message: 'Gagal mengirim notifikasi uji', error: error.message });
    }
};