const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = require('./jwt.config');
const tokenService = require('./token.service');

/**
 * Генерирует JWT токен для пользователя с учетом IP-адреса
 * @param {Object} user - Пользователь
 * @param {string} ip - IP-адрес клиента
 * @returns {string} - JWT токен
 */
const generateToken = (user, ip = null) => {
  const payload = {
    id: user.userId,
    email: user.email
  };
  
  // Если передан IP-адрес, добавляем его в токен
  const finalPayload = ip ? tokenService.addIpToPayload(payload, ip) : payload;
  
  return jwt.sign(finalPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Генерирует refresh токен для пользователя
 * @param {Object} user - Пользователь
 * @returns {string} - Refresh токен
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.userId,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

/**
 * Проверяет JWT токен с учетом IP-адреса и черного списка
 * @param {string} token - JWT токен
 * @param {string} ip - IP-адрес клиента
 * @returns {Promise<Object|null>} - Декодированный токен или null
 */
const verifyTokenSecure = async (token, ip) => {
  return await tokenService.verifyTokenWithSecurity(token, ip);
};

/**
 * Добавляет токен в черный список
 * @param {string} token - JWT токен
 * @returns {Promise<boolean>} - true, если операция успешна
 */
const revokeToken = async (token) => {
  return await tokenService.blacklistToken(token);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyTokenSecure,
  revokeToken
}; 