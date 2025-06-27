const express = require('express');
const router = express.Router();
const inviteController = require('./invite.controller');

// Получение количества приглашенных пользователей
router.get('/count/:userId', inviteController.getInvitesCount);

// Обработка приглашения (вызывается при регистрации)
router.post('/process', inviteController.processInvite);

// Получение статистики инвайтов (для админов)
router.get('/stats/:userId', inviteController.getInvitesStats);

module.exports = router; 