const User = require('../auth/models/User');
const { kafkaModuleService } = require('../kafka/init');

// Получение количества приглашенных пользователей
exports.getInvitesCount = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[InviteController] Запрос количества инвайтов для пользователя:', userId);

    const user = await User.findOne({ userId });
    console.log('[InviteController] Найден пользователь:', user ? 'да' : 'нет');
    
    if (!user) {
      console.log('[InviteController] Пользователь не найден');
      return res.status(404).json({ 
        success: false,
        message: 'Пользователь не найден' 
      });
    }

    console.log('[InviteController] Количество инвайтов:', user.invites || 0);
    return res.status(200).json({
      success: true,
      invitesCount: user.invites || 0
    });

  } catch (error) {
    console.error('[InviteController] Ошибка при получении количества инвайтов:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

// Обработка приглашения (вызывается при регистрации нового пользователя)
exports.processInvite = async (req, res) => {
  try {
    const { inviterUserId } = req.body;

    if (!inviterUserId) {
      return res.status(400).json({
        success: false,
        message: 'ID приглашающего пользователя обязателен'
      });
    }

    // Находим пользователя, который пригласил
    const inviter = await User.findOne({ userId: inviterUserId });
    if (!inviter) {
      return res.status(404).json({
        success: false,
        message: 'Приглашающий пользователь не найден'
      });
    }

    // Увеличиваем счетчик приглашений
    inviter.invites = (inviter.invites || 0) + 1;
    await inviter.save();

    console.log(`Увеличен счетчик инвайтов для пользователя ${inviterUserId}: ${inviter.invites}`);
    
    // Отправляем асинхронные операции в Kafka
    try {
      // Асинхронная аналитика обработки инвайта
      await kafkaModuleService.sendInviteOperation('analytics', {
        inviterUserId: inviterUserId,
        action: 'process_invite',
        invitesCount: inviter.invites,
        timestamp: new Date().toISOString()
      });
      
      // Асинхронное обновление кэша
      await kafkaModuleService.sendInviteOperation('cache_update', {
        inviterUserId: inviterUserId,
        cacheKey: `invites_${inviterUserId}`,
        cacheData: { invitesCount: inviter.invites, timestamp: Date.now() }
      });
      
    } catch (error) {
      console.error('Ошибка отправки асинхронных операций в Kafka:', error);
      // Не прерываем основной поток, так как инвайт уже обработан
    }

    return res.status(200).json({
      success: true,
      message: 'Счетчик инвайтов успешно обновлен',
      invitesCount: inviter.invites
    });

  } catch (error) {
    console.error('Ошибка при обработке инвайта:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
};

// Получение статистики инвайтов (для админов)
exports.getInvitesStats = async (req, res) => {
  try {
    // Проверяем роль пользователя
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }

    // Получаем статистику по инвайтам
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalInvites: { $sum: '$invites' },
          totalUsers: { $sum: 1 },
          avgInvites: { $avg: '$invites' },
          maxInvites: { $max: '$invites' }
        }
      }
    ]);

    // Получаем топ пользователей по инвайтам
    const topInviters = await User.find({ invites: { $gt: 0 } })
      .sort({ invites: -1 })
      .limit(10)
      .select('userId name invites');

    return res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalInvites: 0,
        totalUsers: 0,
        avgInvites: 0,
        maxInvites: 0
      },
      topInviters
    });

  } catch (error) {
    console.error('Ошибка при получении статистики инвайтов:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
}; 