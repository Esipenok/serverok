const express = require('express');
const router = express.Router();
const likeCounterController = require('./like-counter.controller');
const authMiddleware = require('../../auth/middleware/auth.middleware');

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// GET /api/like-counter/:userId - Получить количество лайков для пользователя
router.get('/:userId?', likeCounterController.getLikeCount);

// POST /api/like-counter/:userId/reset - Сбросить счетчик лайков
router.post('/:userId?/reset', likeCounterController.resetLikeCounter);

// DELETE /api/like-counter/:userId - Удалить счетчик лайков
router.delete('/:userId', likeCounterController.deleteLikeCounter);

module.exports = router; 