const Match = require('../models/match.model');
const User = require('../../auth/models/User');
const { formatUserWithPhotos } = require('../../photos/photo.utils');
const NodeCache = require('node-cache');

// Создаем экземпляр кэша с временем жизни 5 минут
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Получает список пользователей, которые лайкнули текущего пользователя
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserLikes = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Getting likes for user:', userId);

    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required'
      });
    }

    // Проверяем кэш
    const cacheKey = `user_likes_${userId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Returning cached data for user:', userId);
      return res.status(200).json(cachedData);
    }

    // Находим все матчи, где текущий пользователь является user1 или user2
    const query = {
      $or: [
        { user1: userId, user2Liked: true }, // Когда текущий пользователь user1 и его лайкнул user2
        { user2: userId, user1Liked: true }  // Когда текущий пользователь user2 и его лайкнул user1
      ],
      feature: 'finder',
      status: 'pending'
    };
    console.log('Searching matches with query:', query);

    const matches = await Match.find(query).sort({ lastInteraction: -1 }); // Сортировка от новых к старым
    console.log('Found matches:', matches);

    if (!matches || matches.length === 0) {
      console.log('No matches found for user:', userId);
      // Сохраняем пустой результат в кэш
      cache.set(cacheKey, []);
      return res.status(200).json([]);
    }

    // Получаем ID пользователей, которые лайкнули текущего пользователя
    const likerIds = matches.map(match => {
      // Если текущий пользователь user1, то лайкнувший - user2, и наоборот
      return match.user1 === userId ? match.user2 : match.user1;
    });
    console.log('Liker IDs:', likerIds);

    // Получаем данные пользователей
    const users = await User.find(
      { userId: { $in: likerIds } },
      {
        userId: 1,
        name: 1,
        birthday: 1,
        about: 1,
        photos: 1,
        real_loc: 1,
        _id: 0 // Исключаем _id из результатов
      }
    ).lean(); // Используем lean() для получения обычных JavaScript объектов

    // Форматируем пользователей с правильными URL для фотографий
    const processedUsers = users.map(user => formatUserWithPhotos(user));

    console.log('Found users:', processedUsers);

    // Сохраняем результаты в кэш
    cache.set(cacheKey, processedUsers);

    res.status(200).json(processedUsers);
  } catch (error) {
    console.error('Error in getUserLikes:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Очищает кэш для конкретного пользователя
 * @param {string} userId - ID пользователя
 */
exports.clearUserLikesCache = (userId) => {
  const cacheKey = `user_likes_${userId}`;
  cache.del(cacheKey);
}; 