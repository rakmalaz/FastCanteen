const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { wajibLogin, wajibPeran, stanSendiri, menuSendiri } = require('../middleware/auth');

const kelolaMenu = [wajibLogin, wajibPeran('tenant', 'admin')];

router.get('/', wajibLogin, menuController.getAllMenu);
router.get('/:id', wajibLogin, menuController.getMenuById);
router.post('/', ...kelolaMenu, stanSendiri('body', 'id_tenant'), menuController.createMenu);
router.put('/:id', ...kelolaMenu, menuSendiri, menuController.updateMenu);
router.patch('/:id/status', ...kelolaMenu, menuSendiri, menuController.toggleStatus);
router.delete('/:id', ...kelolaMenu, menuSendiri, menuController.deleteMenu);

module.exports = router;