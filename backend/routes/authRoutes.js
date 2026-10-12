const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// US-01, US-02
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile/:id', authController.getProfile);

module.exports = router;
