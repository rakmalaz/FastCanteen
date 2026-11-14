const express = require('express');
const router = express.Router();
const notifikasiController = require('../controllers/notifikasiController');
const { wajibLogin, wajibPeran, hanyaDiriSendiri, notifikasiSendiri, paksaBody } = require('../middleware/auth');

// Push notification (letakkan sebelum rute '/:id' agar tidak tertukar)
router.post('/token', wajibLogin, notifikasiController.daftarPushToken);
router.delete('/token', wajibLogin, notifikasiController.hapusPushToken);
router.post('/test', wajibLogin, notifikasiController.kirimNotifikasiUji);
router.get('/user/:id_user', wajibLogin, hanyaDiriSendiri('id_user'), notifikasiController.getNotifikasiByUser);
router.put('/:id/baca', wajibLogin, notifikasiSendiri, notifikasiController.markAsRead);
router.put('/user/:id_user/baca-semua', wajibLogin, hanyaDiriSendiri('id_user'), notifikasiController.markAllAsRead);
router.post('/', wajibLogin, wajibPeran('tenant', 'admin'), paksaBody('id_pengirim'), notifikasiController.kirimNotifikasi);
router.delete('/:id', wajibLogin, notifikasiSendiri, notifikasiController.deleteNotifikasi);

module.exports = router;