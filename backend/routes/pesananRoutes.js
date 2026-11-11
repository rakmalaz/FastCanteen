const express = require('express');
const router = express.Router();
const pesananController = require('../controllers/pesananController');
const {
    wajibLogin,
    wajibPeran,
    hanyaDiriSendiri,
    stanSendiri,
    pesananSendiri,
    paksaBody,
} = require('../middleware/auth');

// Mahasiswa membuat pesanan (id_mahasiswa selalu diambil dari akun yang login)
router.post('/', wajibLogin, wajibPeran('mahasiswa'), paksaBody('id_mahasiswa'), pesananController.createPesanan);

// Riwayat pesanan milik mahasiswa yang login
router.get('/mahasiswa/:id_mahasiswa', wajibLogin, hanyaDiriSendiri('id_mahasiswa'), pesananController.getPesananByMahasiswa);

// Antrean dan ringkasan milik tenant yang login
router.get('/tenant/:id_tenant', wajibLogin, wajibPeran('tenant', 'admin'), stanSendiri('params', 'id_tenant'), pesananController.getPesananByTenant);
router.get('/tenant/:id_tenant/ringkasan', wajibLogin, wajibPeran('tenant', 'admin'), stanSendiri('params', 'id_tenant'), pesananController.getTenantSummary);

// Detail satu pesanan (mahasiswa pemesan atau tenant pemilik stan)
router.get('/:id', wajibLogin, pesananSendiri('mahasiswa', 'tenant', 'admin'), pesananController.getPesananById);

// Tenant mengubah status pesanan dan pembayaran
router.put('/:id/status', wajibLogin, pesananSendiri('tenant', 'admin'), pesananController.updateStatusPesanan);
router.put('/:id/status-pembayaran', wajibLogin, pesananSendiri('tenant', 'admin'), pesananController.updateStatusPembayaran);

// Mahasiswa mengunggah ulang bukti pembayaran
router.put('/:id/bukti', wajibLogin, pesananSendiri('mahasiswa'), pesananController.uploadBuktiPembayaran);

// Tenant memverifikasi pembayaran (id_verifikator = akun yang login)
router.put('/:id/verifikasi', wajibLogin, pesananSendiri('tenant', 'admin'), paksaBody('id_verifikator'), pesananController.verifikasiPembayaran);

module.exports = router;