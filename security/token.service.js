const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./jwt.config');
const BlacklistedToken = require('./models/BlacklistedToken');

/**
 * Добавляет IP-адрес в полезную нагрузку токена
 * @param {Object} payload - Исходная полезная нагрузка
 * @param {string} ip - IP-адрес пользователя
 * @returns {Object} - Обновленная полезная нагрузка
 */
const addIpToPayload = (payload, ip) => {
  return {
    ...payload,
    ip: ip
  };
};

/**
 * Проверяет, находится ли токен в черном списке
 * @param {string} token - JWT токен для проверки
 * @returns {Promise<boolean>} - true, если токен в черном списке
 */
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistedToken = await BlacklistedToken.findOne({ token });
    return !!blacklistedToken;
  } catch (error) {
    console.error('Ошибка при проверке черного списка токенов:', error.message);
    return false;
  }
};

/**
 * Добавляет токен в черный список
 * @param {string} token - JWT токен для добавления в черный список
 * @returns {Promise<boolean>} - true, если операция успешна
 */
const blacklistToken = async (token) => {
  try {
    // Декодируем токен без проверки, чтобы получить время истечения
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      throw new Error('Недействительный формат токена');
    }
    
    // Создаем запись в черном списке
    await BlacklistedToken.create({
      token: token,
      expiresAt: new Date(decoded.exp * 1000) // Конвертируем UNIX timestamp в Date
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при добавлении токена в черный список:', error.message);
    return false;
  }
};

/**
 * Проверяет токен с учетом IP-адреса и черного списка
 * @param {string} token - JWT токен
 * @param {string} ip - IP-адрес клиента
 * @returns {Promise<Object|null>} - Декодированный токен или null
 */
const verifyTokenWithSecurity = async (token, ip) => {
  try {
    // Проверяем, не в черном ли списке токен
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      console.warn('Попытка использовать отозванный токен');
      return null;
    }
    
    // Верифицируем токен
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Если в токене есть IP, проверяем его
    if (decoded.ip && decoded.ip !== ip) {
      console.warn(`Несоответствие IP: токен ${decoded.ip}, запрос ${ip}`);
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Ошибка проверки токена:', error.message);
    return null;
  }
};

/**
 * Очищает устаревшие токены из черного списка
 */
const cleanupBlacklistedTokens = async () => {
  try {
    const now = new Date();
    const result = await BlacklistedToken.deleteMany({
      expiresAt: { $lt: now }
    });
    
    console.log(`Очистка черного списка: удалено ${result.deletedCount} токенов`);
  } catch (error) {
    console.error('Ошибка при очистке черного списка токенов:', error.message);
  }
};

module.exports = {
  addIpToPayload,
  isTokenBlacklisted,
  blacklistToken,
  verifyTokenWithSecurity,
  cleanupBlacklistedTokens
}; 