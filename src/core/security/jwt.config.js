require('dotenv').config();

module.exports = {
  // Секретный ключ для подписи токена
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  
  // Время жизни токена (24 часа)
  JWT_EXPIRES_IN: '24h',
  
  // Время жизни refresh токена (7 дней)
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  
  // Название заголовка для токена
  TOKEN_HEADER: 'Authorization',
  
  // Префикс для токена в заголовке
  TOKEN_PREFIX: 'Bearer '
}; 