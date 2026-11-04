const express = require('express');
const router = express.Router();
const pesananController = require('../controllers/pesananController');

// US-04, US-06: Pre-order Baru
router.post('/', pesananController.createPesanan);

// US-10, US-11: Pesanan Mahasiswa (dengan filter: ?filter=aktif | ?filter=riwayat)
router.get('/mahasiswa/:id_mahasiswa', pesananController.getPesananByMahasiswa);

// US-05: Antrean Pesanan Tenant
router.get('/tenant/:id_tenant', pesananController.getPesananByTenant);

// US-13: Ringkasan Laporan Tenant
router.get('/tenant/:id_tenant/ringkasan', pesananController.getTenantSummary);

// Detail Pesanan berdasarkan ID
router.get('/:id', pesananController.getPesananById);

// US-08: Ubah Status Pesanan ('Menunggu', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan')
router.put('/:id/status', pesananController.updateStatusPesanan);

// Ubah Status Pembayaran ('Belum Dibayar', 'Sudah Dibayar', 'Dikembalikan')
router.put('/:id/status-pembayaran', pesananController.updateStatusPembayaran);

// US-07: Unggah Bukti Transaksi
router.put('/:id/bukti', pesananController.uploadBuktiPembayaran);

module.exports = router;
