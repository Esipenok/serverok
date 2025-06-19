const express = require('express');
const router = express.Router();
const getAllMatchesController = require('./get_all_matches.controller');
const { verifyToken } = require('../../auth/middleware/auth');

// Маршрут для получения всех матчей с синхронизацией
router.post('/', verifyToken, getAllMatchesController.getAllMatches);

module.exports = router; 