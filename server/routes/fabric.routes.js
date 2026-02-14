const express = require('express');
const router = express.Router();
const { 
    getAllFabrics, 
    getFabricById, 
    createFabric, 
    updateFabric, 
    deleteFabric, 
    addRolls 
} = require('../controllers/fabric.controller');

router.get('/cloth-types', require('../controllers/fabric.controller').getClothTypes);
router.get('/colors', require('../controllers/fabric.controller').getColors);
router.get('/designs', require('../controllers/fabric.controller').getDesigns);
router.get('/qualities', require('../controllers/fabric.controller').getQualities);

router.get('/', getAllFabrics);
router.get('/:id', getFabricById);

router.post('/', createFabric);
router.put('/:id', updateFabric);
router.delete('/:id', deleteFabric);
router.post('/:id/rolls', addRolls);

module.exports = router;
