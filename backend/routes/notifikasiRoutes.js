const express = require('express');
const router = express.Router();
const notifikasiController = require('../controllers/notifikasiController');

// Ambil notifikasi berdasarkan user
router.get('/user/:id_user', notifikasiController.getNotifikasiByUser);

// Tandai satu notifikasi sebagai telah dibaca
router.put('/:id/baca', notifikasiController.markAsRead);

// Tandai semua notifikasi milik user sebagai telah dibaca
router.put('/user/:id_user/baca-semua', notifikasiController.markAllAsRead);

// Buat notifikasi baru
router.post('/', notifikasiController.kirimNotifikasi);

// Hapus satu notifikasi
router.delete('/:id', notifikasiController.deleteNotifikasi);

module.exports = router;
