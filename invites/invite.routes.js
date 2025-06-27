const express = require('express');
const router = express.Router();
const inviteController = require('./invite.controller');

// Middleware для проверки авторизации
const checkAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Требуется авторизация'
    });
  }
  next();
};

// Получение количества приглашенных пользователей
router.get('/count/:userId', checkAuth, inviteController.getInvitesCount);

// Обработка приглашения (вызывается при регистрации)
router.post('/process', inviteController.processInvite);

// Получение статистики инвайтов (для админов)
router.get('/stats/:userId', checkAuth, inviteController.getInvitesStats);

module.exports = router; 