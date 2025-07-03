const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../core/security/jwt.middleware');
const getAllMatchesController = require('./get_all_matches.controller');

// Маршрут для получения всех матчей с синхронизацией
router.post('/', verifyToken, getAllMatchesController.getAllMatches);

module.exports = router; 