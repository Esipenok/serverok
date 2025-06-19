const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../security/jwt.config');

// Временное middleware для проверки аутентификации
// В реальном приложении нужно использовать JWT или другую надежную систему
exports.verifyToken = (req, res, next) => {
  // Получаем userId из заголовка, Authorization Bearer или параметра запроса
  const userIdHeader = req.headers['user-id'];
  const userIdQuery = req.query.userId;
  const authHeader = req.headers['authorization'];
  
  console.log('Auth middleware called for path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Query params:', JSON.stringify(req.query));
  
  let userId = userIdHeader || userIdQuery;
  
  // Если есть заголовок Authorization, пробуем извлечь userId из токена
  if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('Found Bearer token:', token);
    
    try {
      // Верифицируем JWT токен
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      console.log('Decoded token:', decoded);
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Недействительный токен'
      });
    }
  }
  
  if (!userId) {
    console.log('Authentication failed: No userId found');
    return res.status(401).json({ 
      status: 'fail', 
      message: 'Требуется указать userId в заголовке user-id, токене или параметре запроса'
    });
  }
  
  console.log(`Authentication successful: User ID = ${userId}`);
  
  // Добавляем информацию о пользователе в req.user
  req.user = {
    id: userId
  };
  
  next();
}; 