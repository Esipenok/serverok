const jwt = require('jsonwebtoken');
const { JWT_SECRET, TOKEN_HEADER, TOKEN_PREFIX } = require('./jwt.config');
const User = require('../../modules/auth/models/User');
const { verifyTokenSecure } = require('./jwt.utils');

const verifyToken = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers[TOKEN_HEADER.toLowerCase()];
    
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Требуется авторизация'
      });
    }

    // Проверяем, является ли токен Firebase токеном
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // TODO: Здесь будет проверка Firebase токена
      // Пока что просто пропускаем проверку для тестирования
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        req.user = { id: user.userId };
        return next();
      }
    }

    // Стандартная JWT проверка
    if (!authHeader.startsWith(TOKEN_PREFIX)) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный формат токена'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Получаем IP-адрес клиента
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Используем улучшенную проверку токена с учетом IP и черного списка
    const decoded = await verifyTokenSecure(token, clientIp);
    
    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Недействительный или отозванный токен'
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Срок действия токена истек'
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Недействительный токен'
    });
  }
};

module.exports = {
  verifyToken
}; 