const { check, validationResult, sanitize } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Проверяет, является ли строка потенциально опасной для MongoDB
 * @param {string} str - Строка для проверки
 * @returns {boolean} - true, если строка безопасна
 */
const isMongoSafe = (str) => {
  if (typeof str !== 'string') return true;
  
  // Проверяем на наличие MongoDB операторов
  const dangerousPatterns = [
    /^\$/, // MongoDB операторы начинаются с $
    /\.\$/, // Точка и $ могут использоваться для доступа к полям
    /\{.*\$.*\}/, // Объекты с $ могут быть использованы для инъекций
    /\$where/i, // $where позволяет выполнять произвольный JavaScript
    /\$regex/i, // $regex может быть использован для ReDoS атак
    /\$ne/i, // $ne часто используется в NoSQL инъекциях
    /\$gt/i, // $gt часто используется в NoSQL инъекциях
    /\$lt/i, // $lt часто используется в NoSQL инъекциях
    /\$exists/i, // $exists часто используется в NoSQL инъекциях
    /\$nin/i, // $nin часто используется в NoSQL инъекциях
    /\$or/i, // $or часто используется в NoSQL инъекциях
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(str));
};

/**
 * Middleware для валидации данных при регистрации
 */
const validateRegistration = (req, res, next) => {
  try {
    let { email, firebaseUid } = req.body;
    
    console.log('[validateRegistration] Проверка email:', email);
    console.log('[validateRegistration] Тип email:', typeof email);
    
    // Проверка наличия email
    if (!email) {
      console.log('[validateRegistration] Email отсутствует');
      return res.status(400).json({
        status: 'fail',
        message: 'Email обязателен'
      });
    }
    
    // Очищаем email от экранированных слешей
    if (typeof email === 'string') {
      email = email.replace(/\\\\/g, '').replace(/\\/g, '');
      // Обновляем email в req.body
      req.body.email = email;
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[validateRegistration] Неверный формат email:', email);
      return res.status(400).json({
        status: 'fail',
        message: 'Неверный формат email'
      });
    }
    
    // Проверка безопасности данных
    if (!isMongoSafe(email) || (firebaseUid && !isMongoSafe(firebaseUid))) {
      console.log('[validateRegistration] Небезопасные данные:', { email, firebaseUid });
      return res.status(400).json({
        status: 'error',
        message: 'Недопустимые символы в данных'
      });
    }
    
    console.log('[validateRegistration] Email прошел валидацию:', email);
    next();
  } catch (error) {
    console.error('Ошибка валидации при регистрации:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера при валидации'
    });
  }
};

/**
 * Санитизирует объект, удаляя или экранируя потенциально опасные значения
 * @param {Object} obj - Объект для санитизации
 * @returns {Object} - Санитизированный объект
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // Рекурсивно обрабатываем вложенные объекты
      if (value && typeof value === 'object') {
        result[key] = sanitizeObject(value);
      } else if (typeof value === 'string') {
        // Специальная обработка для email
        if (key === 'email') {
          // Для email удаляем экранирование слешей, но не экранируем другие символы
          result[key] = value.replace(/\\\\/g, '').replace(/\\/g, '');
        } else {
          // Для других строк экранируем специальные символы
          result[key] = value
            .replace(/\$/g, '\\$')
            .replace(/\./g, '\\.')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}');
        }
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
};

/**
 * Middleware для защиты от NoSQL инъекций
 */
const protectFromInjection = (req, res, next) => {
  // Проверяем query параметры
  for (const key in req.query) {
    if (!isMongoSafe(req.query[key])) {
      return res.status(400).json({
        status: 'error',
        message: 'Недопустимые символы в параметрах запроса'
      });
    }
  }
  
  // Проверяем body
  if (req.body && typeof req.body === 'object') {
    // Санитизируем тело запроса
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

/**
 * Middleware для валидации MongoDB ID
 */
const validateMongoId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  
  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: `Параметр ${paramName} обязателен`
    });
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'error',
      message: `Недопустимый формат ${paramName}`
    });
  }
  
  next();
};

/**
 * Middleware для валидации userId
 */
const validateUserId = (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'Параметр userId обязателен'
    });
  }
  
  // Проверяем, что userId содержит только допустимые символы
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Недопустимый формат userId'
    });
  }
  
  next();
};

// Экспортируем middleware
module.exports = {
  protectFromInjection,
  validateMongoId,
  validateUserId,
  validateRegistration
}; 