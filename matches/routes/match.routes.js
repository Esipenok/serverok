const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../auth/middleware/auth');
const matchController = require('../controllers/match.controller');
const { validateId, toObjectId } = require('../utils/id-converter');
const userLikesRoutes = require('../get_user_likes/get_user_likes.routes');
const getAllMatchesRoutes = require('../get_all_matches/get_all_matches.routes');
const deleteMatchRoutes = require('../delete_match/delete_match.routes');

// Тестовый маршрут для проверки аутентификации
router.get('/status', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Match routes working' });
});

// Тестовый маршрут для проверки преобразования ID
router.post('/test-id', (req, res) => {
  const { userId, targetUserId } = req.body;
  const validatedUserId = validateId(userId);
  const validatedTargetUserId = validateId(targetUserId);
  const userObjectId = toObjectId(userId);
  const targetObjectId = toObjectId(targetUserId);
  
  res.status(200).json({
    original: { userId, targetUserId },
    validated: { userId: validatedUserId, targetUserId: validatedTargetUserId },
    objectIds: { 
      userId: userObjectId ? userObjectId.toString() : null, 
      targetUserId: targetObjectId ? targetObjectId.toString() : null 
    }
  });
});

// Защищенные маршруты (требуется авторизация)
router.use(verifyToken);

// Проверяем все методы контроллера перед использованием
const availableControllerMethods = Object.keys(matchController);
console.log('Доступные методы контроллера:', availableControllerMethods);

// Получение списка всех матчей пользователя
router.get('/', matchController.getUserMatches);

// Лайк пользователя
router.post('/like/:userId', matchController.likeUser);

// Дизлайк пользователя
router.post('/dislike/:userId', matchController.dislikeUser);

// Маршруты для получения пользователей, которые лайкнули текущего пользователя
router.use('/likes', userLikesRoutes);

// Маршруты для получения всех матчей с синхронизацией
router.use('/all', getAllMatchesRoutes);

// Маршруты для удаления матчей
router.use('/', deleteMatchRoutes);

module.exports = router; 