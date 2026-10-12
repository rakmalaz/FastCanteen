const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Super Admin Overview & Ringkasan Metrik
router.get('/overview', adminController.getOverview);

// 4 Super Admin Resmi UINSA
router.get('/super-admins', adminController.getSuperAdmins);

// Manajemen Tenant oleh Super Admin
router.get('/tenants', adminController.getTenants);
router.post('/tenants', adminController.registerTenant);
router.delete('/tenants/:id', adminController.deleteTenant);

// Monitoring Pesanan & Mahasiswa
router.get('/orders', adminController.getAllOrders);
router.get('/students', adminController.getAllStudents);

module.exports = router;
