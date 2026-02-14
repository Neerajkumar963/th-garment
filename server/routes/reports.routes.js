const express = require('express');
const router = express.Router();
const { 
    getSalesSummary, 
    getProductionSummary, 
    getInventoryValue, 
    getProfitLoss, 
    getOutstandingPayments 
} = require('../controllers/reports.controller');

router.get('/sales-summary', getSalesSummary);
router.get('/production-summary', getProductionSummary);
router.get('/inventory-value', getInventoryValue);
router.get('/profit-loss', getProfitLoss);
router.get('/outstanding', getOutstandingPayments);

module.exports = router;
