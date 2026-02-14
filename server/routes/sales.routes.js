const express = require('express');
const router = express.Router();
const { 
    getFinishedStock, 
    getSalesHistory, 
    getSaleById, 
    createSale,
    getStockHistory
} = require('../controllers/sales.controller');

router.get('/stock', getFinishedStock);
router.get('/stock/:org_dress_id/history', getStockHistory);
router.get('/history', getSalesHistory);
router.get('/:id', getSaleById);
router.post('/', createSale);

module.exports = router;
