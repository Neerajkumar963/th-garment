const express = require('express');
const router = express.Router();
const { 
    getAllClients, 
    getClientById, 
    createClient, 
    updateClient, 
    deleteClient,
    getClientProducts,
    createClientProduct,
    updateClientProduct,
    getClientAccount,
    getClientBalance,
    getAllProducts
} = require('../controllers/clients.controller');

// Main Client CRUD
router.get('/', getAllClients);
router.get('/all-products', getAllProducts);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

// Products Sub-resource
router.get('/:id/products', getClientProducts);
router.post('/:id/products', createClientProduct);
router.put('/:id/products/:productId', updateClientProduct);

// Account/Ledger Sub-resource
router.get('/:id/account', getClientAccount);
router.get('/:id/balance', getClientBalance);

module.exports = router;
