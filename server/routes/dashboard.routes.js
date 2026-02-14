const express = require('express');
const router = express.Router();
const { getStats, getRecentOrders } = require('../controllers/dashboard.controller');

router.get('/stats', getStats);
router.get('/recent-orders', getRecentOrders);

module.exports = router;
