const User = require('../../auth/models/User');

// Блокировка пользователя в маркете
exports.blockMarketUser = async (req, res) => {
  try {
    const { userId, blockedUserId } = req.body;

    if (!userId || !blockedUserId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Необходимо указать userId и blockedUserId' 
      });
    }

    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Пользователь не найден' 
      });
    }

    // Добавляем пользователя в список blocked_market_users
    if (!user.blocked_market_users.includes(blockedUserId)) {
      user.blocked_market_users.push(blockedUserId);
      await user.save();
    }

    return res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно заблокирован в маркете'
    });

  } catch (error) {
    console.error('Ошибка при блокировке пользователя в маркете:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

// Разблокировка пользователя в маркете
exports.unblockMarketUser = async (req, res) => {
  try {
    const { userId, blockedUserId } = req.body;

    if (!userId || !blockedUserId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Необходимо указать userId и blockedUserId' 
      });
    }

    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Пользователь не найден' 
      });
    }

    // Удаляем пользователя из списка blocked_market_users
    user.blocked_market_users = user.blocked_market_users.filter(id => id !== blockedUserId);
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно разблокирован в маркете'
    });

  } catch (error) {
    console.error('Ошибка при разблокировке пользователя в маркете:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

// Получение списка заблокированных пользователей в маркете
exports.getBlockedMarketUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Пользователь не найден' 
      });
    }

    // Получаем только необходимые поля для заблокированных пользователей
    const blockedUsers = await User.find(
      { userId: { $in: user.blocked_market_users } },
      {
        userId: 1,
        name: 1,
        photos: 1,
        gender: 1,
        birthday: 1,
        about: 1,
        _id: 0
      }
    );

    res.status(200).json({
      status: 'success',
      data: blockedUsers
    });
  } catch (error) {
    console.error('Ошибка при получении списка заблокированных пользователей в маркете:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Внутренняя ошибка сервера' 
    });
  }
}; 