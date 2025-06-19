const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { Counter } = require('../counters/models/Counter');
const { generateToken, generateRefreshToken, revokeToken } = require('../../security/jwt.utils');
const bcrypt = require('bcryptjs');

const register = async (req, res, next) => {
  try {
    let { email, firebaseUid } = req.body;
    
    console.log('[register] Получены данные:', { email, firebaseUid });
    
    // Проверяем, что email не undefined и не null
    if (!email) {
      console.log('[register] Email отсутствует');
      return res.status(400).json({
        status: 'fail',
        message: 'Email обязателен'
      });
    }
    
    // Очищаем email от экранированных слешей
    if (typeof email === 'string') {
      email = email.replace(/\\\\/g, '').replace(/\\/g, '');
    }
    
    const cleanEmail = email.trim().toLowerCase();
    console.log('[register] Очищенный email:', cleanEmail);

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      console.log('[register] Пользователь с таким email уже существует:', existingUser.userId);
      return res.status(409).json({
        status: 'error',
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Генерируем userId
    const counter = await Counter.findOneAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    const userId = counter.seq.toString();

    // Создаем базовые поля пользователя
    const userData = {
      email: cleanEmail,
      userId,
      excludedUsers: [userId],
      exclude_audio: [],
      isProfileCompleted: false,
      // Добавляем дополнительные поля с дефолтными значениями
      name: '',
      birthday: '',
      gender: '',
      lookingFor: '',
      about: '',
      searchDistance: 100,
      ageMin: 18,
      ageMax: 100,
      photos: [],
      fast_match_active: false,
      one_night: false,
      real_loc: {},
      change_loc: {},
      real_loc_country: '',
      change_loc_country: '',
      // Добавляем пустой массив маркетных карточек
      market_cards: [],
      // Добавляем поле для Firebase UID
      firebaseUid: firebaseUid || null
    };

    // Создаем нового пользователя
    const user = await User.create(userData);

    // Получаем IP-адрес клиента
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Генерируем JWT токены с учетом IP-адреса
    const token = generateToken(user, clientIp);
    const refreshToken = generateRefreshToken(user);
    
    // Сохраняем refresh токен в базе данных
    user.refreshToken = refreshToken;
    await user.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        userId: user.userId,
        email: user.email,
        isProfileCompleted: user.isProfileCompleted,
        token,
        refreshToken,
        // Возвращаем все дополнительные поля
        name: user.name,
        birthday: user.birthday,
        gender: user.gender,
        lookingFor: user.lookingFor,
        about: user.about,
        searchDistance: user.searchDistance,
        ageMin: user.ageMin,
        ageMax: user.ageMax,
        photos: user.photos,
        exclude_audio: user.exclude_audio,
        fast_match_active: user.fast_match_active,
        one_night: user.one_night,
        real_loc: user.real_loc,
        change_loc: user.change_loc,
        real_loc_country: user.real_loc_country,
        change_loc_country: user.change_loc_country,
        market_cards: user.market_cards,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    next(error);
  }
};

/**
 * Проверяет существование пользователя по email
 */
const checkUser = async (req, res, next) => {
  try {
    let { email, firebaseUid } = req.body;
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email обязателен'
      });
    }
    
    // Очищаем email от экранированных слешей
    if (typeof email === 'string') {
      email = email.replace(/\\\\/g, '').replace(/\\/g, '');
    }
    
    const cleanEmail = email.trim().toLowerCase();
    console.log('[checkUser] Ищем пользователя с email:', cleanEmail);
    const user = await User.findOne({ email: cleanEmail });
    console.log('[checkUser] Найден пользователь:', user);

    if (!user) {
      const response = {
        status: 'success',
        exists: false,
        message: 'User not found'
      };
      console.log('[checkUser] Ответ клиенту:', JSON.stringify(response));
      return res.status(200).json(response);
    }

    // Если передан firebaseUid и он отличается от текущего, обновляем его
    if (firebaseUid && user.firebaseUid !== firebaseUid) {
      console.log('[checkUser] Обновляем firebaseUid для пользователя:', user.userId);
      user.firebaseUid = firebaseUid;
      await user.save();
    }

    // Получаем IP-адрес клиента
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Генерируем JWT токены для существующего пользователя с учетом IP-адреса
    const token = generateToken(user, clientIp);
    const refreshToken = generateRefreshToken(user);

    // Сохраняем refresh токен в базе данных
    user.refreshToken = refreshToken;
    await user.save();

    // Возвращаем информацию о пользователе
    const response = {
      status: 'success',
      exists: true,
      data: {
        userId: user.userId,
        email: user.email,
        isProfileCompleted: user.isProfileCompleted,
        token,
        refreshToken,
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
        one_night: user.one_night || false,
        firebaseUid: user.firebaseUid
      }
    };
    console.log('[checkUser] Ответ клиенту:', JSON.stringify(response));
    res.status(200).json(response);
  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error);
    next(error);
  }
};

/**
 * Аутентификация пользователя
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email и пароль обязательны'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный email или пароль'
      });
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный email или пароль'
      });
    }

    // Получаем IP-адрес клиента
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Генерируем токены с учетом IP-адреса
    const token = generateToken(user, clientIp);
    const refreshToken = generateRefreshToken(user);

    // Сохраняем refresh токен в базе
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        token,
        refreshToken,
        user: {
          userId: user.userId,
          email: user.email,
          isProfileCompleted: user.isProfileCompleted
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление токена
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh токен обязателен'
      });
    }

    // Находим пользователя по refresh токену
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Недействительный refresh токен'
      });
    }

    // Получаем IP-адрес клиента
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Генерируем новые токены с учетом IP-адреса
    const newToken = generateToken(user, clientIp);
    const newRefreshToken = generateRefreshToken(user);

    // Обновляем refresh токен в базе
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Выход из системы
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findOne({ userId });

    // Получаем токен из заголовка
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Добавляем токен в черный список
      await revokeToken(token);
    }

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Выход выполнен успешно'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  checkUser,
  login,
  refreshToken,
  logout
}; 