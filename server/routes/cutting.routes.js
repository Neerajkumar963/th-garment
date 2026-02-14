const express = require('express');
const router = express.Router();
const { 
    doGetAllCuttingJobs, 
    getCuttingById, 
    startCuttingJob, 
    recordFabricUsage, 
    completeCutting,
    getPendingOrders,
    transferStock,
    getInternalStock
} = require('../controllers/cutting.controller');

// Order of routes matters! Specific paths before parameterized paths.
router.get('/internal-stock', getInternalStock);
router.get('/pending-orders', getPendingOrders);
router.post('/transfer-stock', transferStock);

router.get('/', doGetAllCuttingJobs);
router.get('/:id', getCuttingById);
router.post('/', startCuttingJob);

// Actions
router.put('/:id/fabric-usage', recordFabricUsage);
router.put('/:id/complete', completeCutting);

module.exports = router;
