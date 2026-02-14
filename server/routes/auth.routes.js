const express = require('express');
const router = express.Router();
const { login, logout, checkAuth } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, checkAuth);

module.exports = router;
