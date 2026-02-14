const express = require('express');
const router = express.Router();
const { 
    getAllOrders, 
    getOrderById, 
    createOrder, 
    updateOrderStatus, 
    updateDispatchStatus,
    deleteOrder 
} = require('../controllers/orders.controller');

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/dispatch', updateDispatchStatus);
router.delete('/:id', deleteOrder);

module.exports = router;
