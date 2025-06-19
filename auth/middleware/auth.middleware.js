const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../security/jwt.config');

/**
 * Middleware для проверки JWT токена
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @param {Function} next - функция для продолжения выполнения запроса
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    // Если токен не предоставлен, просто продолжаем выполнение
    // Это позволит публичным маршрутам работать без аутентификации
    req.user = null;
    return next();
  }
  
  try {
    // Пытаемся верифицировать токен
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Добавляем информацию о пользователе в объект запроса
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Ошибка аутентификации:', error.message);
    
    // В случае ошибки верификации, продолжаем как неаутентифицированный пользователь
    req.user = null;
    next();
  }
}

module.exports = {
  authenticateToken
}; 