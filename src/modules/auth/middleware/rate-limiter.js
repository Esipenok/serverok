const rateLimit = require('express-rate-limit');

/**
 * Базовый лимитер запросов
 */
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100, // максимум 100 запросов с одного IP в минуту
  message: {
    status: 'error',
    message: 'Слишком много запросов с этого IP, попробуйте позже'
  },
  standardHeaders: true, // Возвращает стандартные заголовки rate limit
  legacyHeaders: false // Отключает устаревшие заголовки
});

/**
 * Строгий лимитер для аутентификации
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 запросов с одного IP за 15 минут
  message: {
    status: 'error',
    message: 'Слишком много попыток входа. Пожалуйста, попробуйте позже'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Очень строгий лимитер для защиты от брутфорса
 */
const bruteForceProtection = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // максимум 5 неудачных попыток в час
  skipSuccessfulRequests: true, // Пропускает успешные запросы (не учитывает их в лимите)
  message: {
    status: 'error',
    message: 'Слишком много неудачных попыток. Аккаунт временно заблокирован'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Лимитер для регистрации
 */
const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 часа
  max: 5, // максимум 5 регистраций с одного IP в сутки
  message: {
    status: 'error',
    message: 'Превышен лимит регистраций с этого IP'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Лимитер для запросов на восстановление пароля
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // максимум 3 запроса на восстановление пароля в час
  message: {
    status: 'error',
    message: 'Слишком много запросов на восстановление пароля. Попробуйте позже'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  standardLimiter,
  authLimiter,
  bruteForceProtection,
  registrationLimiter,
  passwordResetLimiter
}; 