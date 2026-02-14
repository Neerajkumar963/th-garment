const express = require('express');
const router = express.Router();
const { 
    getKanbanBoard, 
    getAllStages, 
    getProcessingById, 
    getAvailableStock,
    assignWorker,
    assignMultipleWorkers, 
    updateProgress, 
    completeStage,
    deleteJob,
    getFabricDetails,
    getFabricatorJobs,
    receiveFromFabricator,
    updateAssignment
} = require('../controllers/processing.controller');

router.get('/board', getKanbanBoard);
router.get('/fabricator', getFabricatorJobs); // NEW
router.get('/stages', getAllStages);
router.get('/available-stock', getAvailableStock);
router.get('/:id', getProcessingById);

router.post('/assign', assignWorker);
router.post('/assign-multiple', assignMultipleWorkers);
router.put('/:id/update-progress', updateProgress);
router.put('/:id/complete-stage', completeStage);
router.put('/:id/receive', receiveFromFabricator); // NEW
router.put('/:id/assignment', updateAssignment);
router.get('/:id/fabric-details', getFabricDetails);
router.delete('/:id', deleteJob);

module.exports = router;
