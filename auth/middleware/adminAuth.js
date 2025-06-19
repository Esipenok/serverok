const User = require('../models/User');

/**
 * Middleware для проверки прав администратора
 * Должен использоваться после middleware auth
 */
module.exports = async (req, res, next) => {
  try {
    // req.user уже должен быть установлен middleware auth
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверка роли пользователя
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    }
    
    next();
  } catch (err) {
    console.error('Ошибка проверки прав администратора:', err.message);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
}; 