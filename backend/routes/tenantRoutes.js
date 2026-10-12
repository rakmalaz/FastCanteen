const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

// US-01, US-03
router.get('/', tenantController.getAllTenants);
router.get('/:id', tenantController.getTenantById);
router.post('/', tenantController.createTenant);

module.exports = router;
