const express = require('express');
const router = express.Router();
const oneNightStatusController = require('./one_night_status.controller');

// Обновление статуса one night
router.put('/:userId', oneNightStatusController.updateOneNightStatus);

module.exports = router; 