const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../auth/middleware/auth');
const fastMatchController = require('../controllers/fast_match.controller');
const fastMatchAcceptController = require('../match/fast_match_accept.controller');

// Защищенные маршруты (требуется авторизация)
router.use(verifyToken);

// Создание записи в базе данных fast_match
router.post('/', fastMatchController.createFastMatch);

// Получение информации о fast_match
router.get('/info', fastMatchController.getFastMatchInfo);

// Удаление записи из базы данных fast_match
router.delete('/', fastMatchController.deleteFastMatch);

// Получение списка пользователей для fast_match
router.get('/users', fastMatchController.getUsers);

// Получение активных запросов на быстрые свидания (HTTP альтернатива WebSocket)
router.get('/:userId/active-requests', fastMatchController.getActiveRequests);

// Маршрут для ручной очистки истекших запросов (для отладки)
router.post('/cleanup-expired', fastMatchController.cleanupExpiredRequests);

// Новый эндпоинт для принятия быстрого свидания и создания матча
router.post('/match/accept', fastMatchAcceptController.acceptFastMatch);

module.exports = router; 