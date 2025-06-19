const User = require('../../auth/models/User');

// Блокировка пользователя
exports.blockUser = async (req, res) => {
  try {
    const { userId, blockedUserId } = req.body;

    if (!userId || !blockedUserId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Необходимо указать userId и blockedUserId' 
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Пользователь не найден' 
      });
    }

    // Добавляем пользователя в список blocked_users
    if (!user.blocked_users.includes(blockedUserId)) {
      user.blocked_users.push(blockedUserId);
      await user.save();
    }

    return res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно заблокирован'
    });

  } catch (error) {
    console.error('Ошибка при блокировке пользователя:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

// Разблокировка пользователя
exports.unblockUser = async (req, res) => {
  try {
    const { userId, blockedUserId } = req.body;

    if (!userId || !blockedUserId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Необходимо указать userId и blockedUserId' 
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Пользователь не найден' 
      });
    }

    // Удаляем пользователя из списка blocked_users
    user.blocked_users = user.blocked_users.filter(id => id !== blockedUserId);
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно разблокирован'
    });

  } catch (error) {
    console.error('Ошибка при разблокировке пользователя:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

// Получение списка заблокированных пользователей
exports.getBlockedUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Пользователь не найден' 
      });
    }

    // Получаем только необходимые поля для заблокированных пользователей
    const blockedUsers = await User.find(
      { userId: { $in: user.blocked_users } },
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
    console.error('Ошибка при получении списка заблокированных пользователей:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Внутренняя ошибка сервера' 
    });
  }
}; 