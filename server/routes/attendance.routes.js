const express = require('express');
const router = express.Router();
const { 
    markAttendance, 
    getAttendance, 
    getAttendanceSummary 
} = require('../controllers/attendance.controller');

router.get('/', getAttendance);
router.post('/', markAttendance);
router.get('/summary', getAttendanceSummary);

module.exports = router;
