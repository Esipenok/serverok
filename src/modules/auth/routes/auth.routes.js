const express = require('express');
const router = express.Router();
const { register, checkUser, login, refreshToken, logout } = require('../controllers/auth.controller');
const { validateRegistration } = require('../middleware/validation.middleware');
const { verifyToken } = require('../../../core/security/jwt.middleware');
const { authLimiter, registrationLimiter, bruteForceProtection } = require('../middleware/rate-limiter');
const User = require('../models/User');

// Отладочная информация
console.log('Импортированные функции:');
console.log('register:', typeof register);
console.log('checkUser:', typeof checkUser);
console.log('login:', typeof login);
console.log('refreshToken:', typeof refreshToken);
console.log('logout:', typeof logout);

console.log('Импортированные middleware:');
console.log('validateRegistration:', typeof validateRegistration);
console.log('verifyToken:', typeof verifyToken);
console.log('authLimiter:', typeof authLimiter);
console.log('registrationLimiter:', typeof registrationLimiter);
console.log('bruteForceProtection:', typeof bruteForceProtection);

// Публичные маршруты с улучшенными лимитерами
router.post('/register', registrationLimiter, validateRegistration, register);
router.post('/check-user', authLimiter, checkUser);
router.post('/login', bruteForceProtection, authLimiter, login);
router.post('/refresh-token', authLimiter, refreshToken);

// Защищенные маршруты
router.post('/logout', verifyToken, logout);

// Маршрут для получения публичного профиля пользователя
router.get('/public-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

    // Возвращаем только публичные данные
    res.json({
      status: 'success',
      data: {
        userId: user.userId,
        email: user.email,
        isProfileCompleted: user.isProfileCompleted,
        name: user.name,
        birthday: user.birthday,
        gender: user.gender,
        lookingFor: user.lookingFor,
        about: user.about,
        photos: user.photos,
        searchDistance: user.searchDistance,
        ageMin: user.ageMin,
        ageMax: user.ageMax,
        fast_match_active: user.fast_match_active,
        real_loc_country: user.real_loc_country,
        change_loc_country: user.change_loc_country,
        market_cards: user.market_cards || [],
        market_ageMin: user.market_ageMin || 18,
        market_ageMax: user.market_ageMax || 100,
        market_lookingFor: user.market_lookingFor || 'all',
        market_searchDistance: user.market_searchDistance || 100,
        market_location: user.market_location || {},
        market_location_country: user.market_location_country || '',
        blocked_users: user.blocked_users || [],
        blocked_market_users: user.blocked_market_users || [],
        market_card_exclude: user.market_card_exclude || [],
        real_loc: user.real_loc || {},
        change_loc: user.change_loc || {},
        excludedUsers: user.excludedUsers || [],
        exclude_audio: user.exclude_audio || [],
        matches: user.matches || []
      }
    });
  } catch (error) {
    console.error('Ошибка при получении публичного профиля:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router; 