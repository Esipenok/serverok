const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

router.post('/', complaintController.createComplaint);
router.get('/all', complaintController.getAllComplaints);
router.get('/stats', complaintController.getComplaintsStats);

module.exports = router; 