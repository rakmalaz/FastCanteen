const express = require('express');
const router = express.Router();
const pesananController = require('../controllers/pesananController');

// US-04, US-06: Pre-order
router.post('/', pesananController.createPesanan);

// US-10, US-11: Pesanan Mahasiswa
router.get('/mahasiswa/:id_mahasiswa', pesananController.getPesananByMahasiswa);

// US-05: Antrean Pesanan Tenant
router.get('/tenant/:id_tenant', pesananController.getPesananByTenant);

// US-13: Ringkasan Laporan Tenant
router.get('/tenant/:id_tenant/ringkasan', pesananController.getTenantSummary);

// Detail Pesanan
router.get('/:id', pesananController.getPesananById);

// US-08: Ubah Status Pesanan ('Diproses', 'Siap Diambil', 'Selesai')
router.put('/:id/status', pesananController.updateStatusPesanan);

// US-07: Unggah Bukti Transaksi
router.put('/:id/bukti', pesananController.uploadBuktiPembayaran);

module.exports = router;
