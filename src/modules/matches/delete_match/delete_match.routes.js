const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../core/security/jwt.middleware');
const deleteMatchController = require('./delete_match.controller');

// Защищенные маршруты (требуется авторизация)
router.use(verifyToken);

// Удаление матча при блокировке
router.post('/delete-on-block', deleteMatchController.deleteMatchOnBlock);

module.exports = router; 