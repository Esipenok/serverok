const express = require('express');
const router = express.Router();
const blockController = require('./block.controller');

// Блокировка пользователя
router.post('/block', blockController.blockUser);

// Разблокировка пользователя
router.post('/unblock', blockController.unblockUser);

// Получение списка заблокированных пользователей
router.get('/:userId/blocked-users', blockController.getBlockedUsers);

module.exports = router; 