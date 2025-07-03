const express = require('express');
const router = express.Router();
const oneNightController = require('../controllers/one_night.controller');

// Создание нового приглашения
router.post('/invite', oneNightController.createInvitation);

// Получение всех приглашений для пользователя
router.get('/invitations/:userId', oneNightController.getInvitations);

// Обработка ответа на приглашение
router.post('/response', oneNightController.handleResponse);

// Удаление запроса
router.post('/invite/delete', oneNightController.deleteInvitation);

module.exports = router; 