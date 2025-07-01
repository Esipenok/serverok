const FastMatch = require('../models/fast_match.model');
const User = require('../../auth/models/User');
const Match = require('../../matches/models/match.model');
const notificationService = require('../../notifications/notification.service');

/**
 * Контроллер для принятия запроса быстрого свидания и создания матча
 * Выполняет всю необходимую логику в одном запросе:
 * 1. Обновляет статус второго пользователя
 * 2. Если оба статуса true, создает матч
 * 3. Обновляет списки excludedUsers в профилях пользователей
 * 4. Удаляет запись fast_match
 */
exports.acceptFastMatch = async (req, res) => {
  try {
    const { user_first, user_second } = req.body;
    
    if (!user_first || !user_second) {
      return res.status(400).json({ 
        isMatch: false,
        message: 'Отсутствуют обязательные поля: user_first, user_second' 
      });
    }
    
    // Проверяем, существует ли запись
    const fastMatch = await FastMatch.findOne({ 
      $or: [
        { user_first: user_first, user_second: user_second },
        { user_first: user_second, user_second: user_first }
      ]
    });
    
    if (!fastMatch) {
      return res.status(404).json({ 
        isMatch: false,
        message: 'Запись о быстром свидании не найдена' 
      });
    }
    
    // Определяем, кто первый и кто второй пользователь
    let actualUserFirst, actualUserSecond;
    if (fastMatch.user_first === user_first && fastMatch.user_second === user_second) {
      actualUserFirst = user_first;
      actualUserSecond = user_second;
    } else {
      actualUserFirst = user_second;
      actualUserSecond = user_first;
    }
    
    // Проверяем статус первого пользователя
    if (!fastMatch.user_first_status) {
      return res.status(400).json({ 
        isMatch: false,
        message: 'Первый пользователь еще не подтвердил свое намерение' 
      });
    }
    
    // Устанавливаем статус второго пользователя в true
    fastMatch.user_second_status = true;
    await fastMatch.save();
    
    // Удаляем уведомление у получателя (user_second) при любом ответе
    try {
      await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());
      console.log(`Fast match уведомление удалено для пользователя ${fastMatch.user_second} (ответ на приглашение)`);
    } catch (notificationError) {
      console.error('Ошибка удаления уведомления:', notificationError);
      // Продолжаем выполнение даже при ошибке уведомления
    }
    
    // Если оба статуса true, создаем матч
    if (fastMatch.user_first_status && fastMatch.user_second_status) {
      // 1. Создаем запись в таблице matches
      const [sortedUser1, sortedUser2] = actualUserFirst < actualUserSecond 
        ? [actualUserFirst, actualUserSecond] 
        : [actualUserSecond, actualUserFirst];
      
      let match = await Match.findOne({ 
        user1: { $in: [sortedUser1, sortedUser2] },
        user2: { $in: [sortedUser1, sortedUser2] }
      });
      
      if (!match) {
        match = new Match({
          user1: sortedUser1,
          user2: sortedUser2,
          user1Liked: true,
          user2Liked: true,
          status: 'matched',
          feature: 'fast'
        });
        
        await match.save();
        console.log(`Создан новый матч между ${sortedUser1} и ${sortedUser2}`);
      } else {
        // Обновляем существующий матч
        match.user1Liked = true;
        match.user2Liked = true;
        match.status = 'matched';
        match.feature = 'fast';
        
        await match.save();
        console.log(`Обновлен существующий матч между ${sortedUser1} и ${sortedUser2}`);
      }
      
      // Чат будет создан на клиенте при отправке первого сообщения
      
      // Обновляем списки excludedUsers в профилях пользователей
      const [user1, user2] = await Promise.all([
        User.findOne({ userId: actualUserFirst }),
        User.findOne({ userId: actualUserSecond })
      ]);
      
      if (user1) {
        if (!user1.excludedUsers) {
          user1.excludedUsers = [];
        }
        if (!user1.matches) {
          user1.matches = [];
        }
        
        // Добавляем в список исключенных пользователей
        if (!user1.excludedUsers.includes(actualUserSecond)) {
          user1.excludedUsers.push(actualUserSecond);
        }
        
        // Добавляем в список матчей
        if (!user1.matches.includes(actualUserSecond)) {
          user1.matches.push(actualUserSecond);
        }
        
        console.log(`Сохранение пользователя: ${JSON.stringify(user1, null, 2)}`);
        await user1.save();
        console.log(`Добавлен ${actualUserSecond} в excludedUsers для ${actualUserFirst}`);
        console.log(`Добавлен ${actualUserSecond} в matches для ${actualUserFirst}`);
      }
      
      if (user2) {
        if (!user2.excludedUsers) {
          user2.excludedUsers = [];
        }
        if (!user2.matches) {
          user2.matches = [];
        }
        
        // Добавляем в список исключенных пользователей
        if (!user2.excludedUsers.includes(actualUserFirst)) {
          user2.excludedUsers.push(actualUserFirst);
        }
        
        // Добавляем в список матчей
        if (!user2.matches.includes(actualUserFirst)) {
          user2.matches.push(actualUserFirst);
        }
        
        console.log(`Сохранение пользователя: ${JSON.stringify(user2, null, 2)}`);
        await user2.save();
        console.log(`Добавлен ${actualUserFirst} в excludedUsers для ${actualUserSecond}`);
        console.log(`Добавлен ${actualUserFirst} в matches для ${actualUserSecond}`);
      }
      
      // Удаляем запись fast_match
      await FastMatch.deleteOne({ _id: fastMatch._id });
      console.log(`Удалена запись fast_match между ${actualUserFirst} и ${actualUserSecond}`);
      
      // Удаляем запись матча из базы данных после успешного создания быстрого мэтча
      // так как все данные уже обработаны и переданы клиенту
      try {
        await Match.findByIdAndDelete(match._id);
        console.log(`Запись матча ${match._id} удалена после создания быстрого мэтча`);
      } catch (error) {
        console.error('Ошибка удаления записи матча после быстрого мэтча:', error);
      }
      
      // Получаем информацию о пользователе, с которым произошел матч
      const otherUserId = actualUserFirst === req.headers['user-id'] ? actualUserSecond : actualUserFirst;
      const otherUser = await User.findOne({ userId: otherUserId }).select('userId name photos birthday about');
      
      // Возвращаем информацию о созданном матче с полем isMatch вместо success
      return res.status(200).json({
        isMatch: true,
        match: {
          matchId: match._id,
          feature: 'fast',
          user: {
            id: otherUserId,
            name: otherUser?.name || 'Пользователь',
            photoUrl: otherUser?.photos?.length > 0 ? otherUser.photos[0] : null
          }
        }
      });
    }
    
    // Если еще не оба статуса true
    return res.status(200).json({
      isMatch: false,
      message: 'Статус второго пользователя обновлен, ожидается подтверждение первого пользователя'
    });
  } catch (error) {
    console.error('Ошибка при принятии быстрого свидания:', error);
    res.status(500).json({ 
      isMatch: false,
      message: 'Серверная ошибка при принятии быстрого свидания',
      error: error.message
    });
  }
};

// Функция для вычисления возраста на основе даты рождения
function _calculateAge(birthday) {
  if (!birthday) return null;
  
  try {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (e) {
    console.error('Ошибка при вычислении возраста:', e);
    return null;
  }
} 