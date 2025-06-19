const User = require('../../auth/models/User');
const { createSafeQuery, createSafeOptions, createSafeId } = require('../../utils/mongo-safety');

/**
 * Получение ограниченных данных пользователя по ID
 */
const getLimitedUserData = async (req, res) => {
  try {
    const userId = createSafeId(req.params.userId);
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Недопустимый формат userId'
      });
    }
    
    // Используем безопасный запрос
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Пользователь не найден'
      });
    }
    
    // Возвращаем только необходимые поля
    res.json({
      status: 'success',
      data: {
        userId: user.userId,
        name: user.name,
        photos: user.photos,
        gender: user.gender,
        birthday: user.birthday,
        about: user.about
      }
    });
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * Получение списка пользователей с ограниченными данными
 */
const getLimitedUsers = async (req, res) => {
  try {
    // Создаем безопасный объект запроса
    const query = createSafeQuery(req.query);
    
    // Создаем безопасные опции
    const options = createSafeOptions({
      limit: req.query.limit,
      skip: req.query.skip,
      sort: { createdAt: req.query.sort || 'desc' }
    });
    
    // Выполняем запрос с безопасными параметрами
    const users = await User.find(query, {
      userId: 1,
      name: 1,
      photos: 1,
      gender: 1,
      birthday: 1,
      about: 1,
      _id: 0
    })
    .limit(options.limit || 10)
    .skip(options.skip || 0)
    .sort(options.sort || { createdAt: -1 });
    
    res.json({
      status: 'success',
      data: users
    });
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

module.exports = {
  getLimitedUserData,
  getLimitedUsers
}; 