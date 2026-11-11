const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { wajibLogin, hanyaDiriSendiri } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile/:id', wajibLogin, hanyaDiriSendiri('id'), authController.getProfile);

module.exports = router;