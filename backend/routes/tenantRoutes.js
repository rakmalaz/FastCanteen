const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { wajibLogin, wajibPeran } = require('../middleware/auth');

router.get('/', wajibLogin, tenantController.getAllTenants);
router.get('/:id', wajibLogin, tenantController.getTenantById);
router.post('/', wajibLogin, wajibPeran('admin'), tenantController.createTenant);

module.exports = router;