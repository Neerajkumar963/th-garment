const express = require('express');
const router = express.Router();
const { 
    getAllEmployees, 
    createEmployee, 
    updateEmployee, 
    getEmployeeAccount, 
    makePayment, 
    getRoles 
} = require('../controllers/employees.controller');

router.get('/', getAllEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);

router.get('/roles', getRoles);

router.get('/:id/account', getEmployeeAccount);
router.post('/:id/payment', makePayment);

module.exports = router;
