const FastMatch = require('../models/fast_match.model');
const User = require('../../auth/models/User');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { toObjectId, validateId } = require('../utils/id-converter');
const notificationService = require('../../notifications/notification.service');
const { kafkaModuleService } = require('../../kafka/init');

// Создание записи в базе данных fast_match
exports.createFastMatch = async (req, res) => {
  try {
    const { user_first, user_second } = req.body;
    
    if (!user_first || !user_second) {
      return res.status(400).json({ 
        success: false, 
        message: 'Отсутствуют обязательные поля: user_first, user_second' 
      });
    }
    
    // Проверяем, чтобы пользователь не отправлял запрос самому себе
    if (user_first === user_second) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя отправить запрос самому себе' 
      });
    }
    
    // Проверяем, существует ли уже запись
    const existingMatch = await FastMatch.findOne({ 
      $or: [
        { user_first: user_first, user_second: user_second },
        { user_first: user_second, user_second: user_first }
      ]
    });
    
    if (existingMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Запись уже существует' 
      });
    }
    
    // Устанавливаем время истечения через 10 минут
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 10);
    
    // Создаем новую запись
    const fastMatch = new FastMatch({
      user_first,
      user_second,
      user_first_status: true,
      start_timer: new Date(),
      feature: 'fast',
      expiresAt: expireDate
    });
    
    await fastMatch.save();
    
    console.log(`Создан запрос fast_match между ${user_first} и ${user_second}, истекает в ${expireDate.toISOString()}`);
    
    // Отправляем уведомление пользователю user_second
    try {
      // Получаем данные отправителя для уведомления
      const sender = await User.findOne({ userId: user_first }).select('userId name photos');
      
      if (sender) {
        const senderData = {
          userId: sender.userId,
          name: sender.name || 'Пользователь',
          photoUrl: sender.photos && sender.photos.length > 0 ? sender.photos[0] : null
        };
        
        await notificationService.sendFastMatchNotification(user_second, senderData, fastMatch._id.toString());
        console.log(`Уведомление о fast match отправлено пользователю ${user_second}`);
      }
    } catch (notificationError) {
      console.error('Ошибка отправки уведомления:', notificationError);
      // Продолжаем выполнение даже при ошибке уведомления
    }
    
    // Отправляем асинхронные операции в Kafka
    try {
      // Асинхронная аналитика создания fast match
      await kafkaModuleService.sendFastMatchOperation('analytics', {
        userFirst: user_first,
        userSecond: user_second,
        action: 'create',
        timestamp: new Date().toISOString(),
        expiresAt: expireDate.toISOString()
      });
      
      // Асинхронное обновление кэша
      await kafkaModuleService.sendFastMatchOperation('cache_update', {
        userFirst: user_first,
        userSecond: user_second,
        cacheKey: `fast_match_${user_first}_${user_second}`,
        cacheData: { status: 'pending', expiresAt: expireDate.toISOString() }
      });
      
    } catch (error) {
      console.error('Ошибка отправки асинхронных операций в Kafka:', error);
      // Не прерываем основной поток, так как fast match уже создан
    }
    
    return res.status(200).json({
      success: true,
      message: 'Запись создана успешно',
      data: fastMatch
    });
    
  } catch (error) {
    console.error('Ошибка при создании записи:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Серверная ошибка при создании записи' 
    });
  }
};

// Получение информации о fast_match
exports.getFastMatchInfo = async (req, res) => {
  try {
    const { user_first, user_second } = req.query;
    
    if (!user_first || !user_second) {
      return res.status(400).json({ 
        success: false, 
        message: 'Отсутствуют обязательные поля: user_first, user_second' 
      });
    }
    
    const fastMatch = await FastMatch.findOne({ 
      $or: [
        { user_first: user_first, user_second: user_second },
        { user_first: user_second, user_second: user_first }
      ]
    });
    
    if (!fastMatch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Запись не найдена' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: fastMatch
    });
    
  } catch (error) {
    console.error('Ошибка при получении информации:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Серверная ошибка при получении информации' 
    });
  }
};

// Удаление записи из базы данных fast_match
exports.deleteFastMatch = async (req, res) => {
  try {
    const { user_first, user_second, isRejection } = req.body;
    
    if (!user_first || !user_second) {
      return res.status(400).json({ 
        success: false, 
        message: 'Отсутствуют обязательные поля: user_first, user_second' 
      });
    }
    
    // Находим запись перед удалением, чтобы узнать, кто отправитель, а кто получатель
    const fastMatch = await FastMatch.findOne({ 
      $or: [
        { user_first: user_first, user_second: user_second },
        { user_first: user_second, user_second: user_first }
      ]
    });
    
    if (!fastMatch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Запись не найдена' 
      });
    }
    
    // Удаляем уведомление у получателя (user_second)
    try {
      await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());
      console.log(`Fast match уведомление удалено для пользователя ${fastMatch.user_second}`);
    } catch (notificationError) {
      console.error('Ошибка удаления уведомления:', notificationError);
      // Продолжаем выполнение даже при ошибке уведомления
    }
    
    // Удаляем запись
    await FastMatch.deleteOne({ _id: fastMatch._id });
    
    // Добавляем пользователей в поля excludedUsers друг друга ТОЛЬКО если это отказ от запроса (isRejection = true)
    // Если это отмена запроса пользователем 1, то не добавляем в excludedUsers
    if (isRejection === true) {
      try {
        console.log(`Отказ от запроса: Добавление пользователей в excludedUsers: ${user_first} и ${user_second}`);
        
        // Обновляем первого пользователя
        await User.updateOne(
          { userId: user_first },
          { $addToSet: { excludedUsers: user_second } }
        );
        
        // Обновляем второго пользователя
        await User.updateOne(
          { userId: user_second },
          { $addToSet: { excludedUsers: user_first } }
        );
        
        console.log(`Пользователи успешно добавлены в excludedUsers друг друга`);
      } catch (updateError) {
        console.error('Ошибка при обновлении excludedUsers:', updateError);
        // Продолжаем выполнение, даже если обновление excludedUsers не удалось
      }
    } else {
      console.log(`Отмена запроса: Пользователи НЕ добавлены в excludedUsers`);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Запись удалена успешно'
    });
    
  } catch (error) {
    console.error('Ошибка при удалении записи:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Серверная ошибка при удалении записи' 
    });
  }
};

// Получение списка пользователей для fast_match
exports.getUsers = async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Отсутствует ID пользователя' 
      });
    }

    // Получаем все записи fast_match, где участвует текущий пользователь
    const fastMatches = await FastMatch.find({
      $or: [
        { user_first: userId },
        { user_second: userId }
      ]
    });

    // Собираем ID пользователей, с которыми уже есть взаимодействие
    const excludedUserIds = fastMatches.map(match => 
      match.user_first === userId ? match.user_second : match.user_first
    );

    // Добавляем текущего пользователя в список исключенных
    excludedUserIds.push(userId);

    // Получаем список пользователей, исключая тех, с кем уже есть взаимодействие
    const users = await User.find({
      userId: { $nin: excludedUserIds }
    }).select('userId name photos age birthday about');

    return res.status(200).json(users);
    
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Серверная ошибка при получении списка пользователей' 
    });
  }
};

// Получение списка активных запросов на быстрые свидания (HTTP альтернатива WebSocket)
exports.getActiveRequests = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Отсутствует ID пользователя' 
      });
    }

    // Получаем все входящие запросы на быстрые свидания, где пользователь является получателем (user_second)
    // и где отправитель уже подтвердил свое намерение (user_first_status = true)
    const incomingRequests = await FastMatch.find({
      user_second: userId,
      user_first_status: true,
      user_second_status: { $ne: true } // Запрос еще не принят пользователем
    });

    // Получаем все исходящие запросы на быстрые свидания, где пользователь является отправителем (user_first)
    const outgoingRequests = await FastMatch.find({
      user_first: userId,
      user_first_status: true,
      user_second_status: { $ne: true } // Запрос еще не принят получателем
    });

    // Если нет активных запросов, возвращаем пустые массивы
    if ((!incomingRequests || incomingRequests.length === 0) && 
        (!outgoingRequests || outgoingRequests.length === 0)) {
      return res.status(200).json({
        success: true,
        incomingRequests: [],
        outgoingRequests: []
      });
    }

    // Собираем ID пользователей, отправивших входящие запросы
    const senderIds = incomingRequests.map(request => request.user_first);

    // Получаем информацию о пользователях-отправителях
    const senders = senderIds.length > 0 ? await User.find({
      userId: { $in: senderIds }
    }).select('userId name photos birthday about') : [];

    // Собираем ID пользователей, получивших исходящие запросы
    const recipientIds = outgoingRequests.map(request => request.user_second);

    // Получаем информацию о пользователях-получателях
    const recipients = recipientIds.length > 0 ? await User.find({
      userId: { $in: recipientIds }
    }).select('userId name photos birthday about') : [];

    // Формируем ответ с детальной информацией о каждом входящем запросе
    const formattedIncomingRequests = incomingRequests.map(request => {
      const sender = senders.find(sender => sender.userId === request.user_first);
      
      // Вычисляем возраст из даты рождения
      let age = null;
      if (sender && sender.birthday) {
        const birthDate = new Date(sender.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        requestId: request._id,
        senderId: sender ? sender.userId : request.user_first,
        senderName: sender ? sender.name : 'Пользователь',
        senderPhoto: sender && sender.photos && sender.photos.length > 0 ? sender.photos[0] : null,
        senderAge: age || 0,
        senderAbout: sender ? sender.about || '' : '',
        createdAt: request.createdAt,
        startTimer: request.start_timer,
        expiresAt: request.expiresAt
      };
    });

    // Формируем ответ с детальной информацией о каждом исходящем запросе
    const formattedOutgoingRequests = outgoingRequests.map(request => {
      const recipient = recipients.find(recipient => recipient.userId === request.user_second);
      
      // Вычисляем возраст из даты рождения
      let age = null;
      if (recipient && recipient.birthday) {
        const birthDate = new Date(recipient.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        requestId: request._id,
        recipientId: recipient ? recipient.userId : request.user_second,
        recipientName: recipient ? recipient.name : 'Пользователь',
        recipientPhoto: recipient && recipient.photos && recipient.photos.length > 0 ? recipient.photos[0] : null,
        recipientAge: age || 0,
        recipientAbout: recipient ? recipient.about || '' : '',
        createdAt: request.createdAt,
        startTimer: request.start_timer,
        expiresAt: request.expiresAt
      };
    });

    return res.status(200).json({
      success: true,
      incomingRequests: formattedIncomingRequests,
      outgoingRequests: formattedOutgoingRequests
    });
    
  } catch (error) {
    console.error('Ошибка при получении активных запросов:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Серверная ошибка при получении активных запросов' 
    });
  }
};

// Ручное удаление истекших запросов (для отладки)
exports.cleanupExpiredRequests = async (req, res) => {
  try {
    const now = new Date();
    console.log(`Начало ручной очистки истекших запросов. Текущее время: ${now.toISOString()}`);
    
    // Находим все запросы, у которых истек срок действия
    const expiredRequests = await FastMatch.find({
      expiresAt: { $lt: now }
    });
    
    console.log(`Найдено ${expiredRequests.length} истекших запросов:`);
    for (const request of expiredRequests) {
      console.log(`ID: ${request._id}, первый пользователь: ${request.user_first}, второй пользователь: ${request.user_second}, время истечения: ${request.expiresAt?.toISOString()}`);
    }
    
    // Удаляем истекшие запросы
    const result = await FastMatch.deleteMany({
      expiresAt: { $lt: now }
    });
    
    console.log(`Удалено ${result.deletedCount} истекших запросов`);
    
    return res.status(200).json({
      success: true,
      message: `Ручная очистка завершена. Удалено ${result.deletedCount} истекших запросов.`,
      expiredRequests: expiredRequests.map(r => ({
        id: r._id,
        user_first: r.user_first,
        user_second: r.user_second,
        expiresAt: r.expiresAt
      }))
    });
  } catch (error) {
    console.error('Ошибка при ручной очистке истекших запросов:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Серверная ошибка при очистке истекших запросов' 
    });
  }
}; 