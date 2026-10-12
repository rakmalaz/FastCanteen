const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// US-03, US-09
router.get('/', menuController.getAllMenu);
router.get('/:id', menuController.getMenuById);
router.post('/', menuController.createMenu);
router.put('/:id', menuController.updateMenu);
router.patch('/:id/status', menuController.toggleStatus);
router.delete('/:id', menuController.deleteMenu);

module.exports = router;
