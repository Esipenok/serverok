const Match = require('../models/match.model');
const User = require('../../auth/models/User');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { toObjectId, validateId } = require('../utils/id-converter');
const { getFullPhotoUrl, formatUserWithPhotos } = require('../../users/photos/photo.utils');
const notificationService = require('../../notifications/notification.service');

// Like a user
exports.likeUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.userId;
    
    console.log(`[LIKE] Запрос на лайк от ${userId} к ${targetUserId}, время: ${new Date().toISOString()}`);
    
    // Валидируем что targetUserId существует
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }
    
    // Can't like yourself
    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot like yourself' });
    }

    // Получаем объекты пользователей
    const [currentUser, targetUser] = await Promise.all([
      User.findOne({ userId: userId }),
      User.findOne({ userId: targetUserId })
    ]);
    
    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    // Добавляем targetUserId в excludedUsers
    if (!currentUser.excludedUsers) {
      currentUser.excludedUsers = [currentUser.userId];
    }
    if (!currentUser.excludedUsers.includes(targetUserId)) {
      currentUser.excludedUsers.push(targetUserId);
      await currentUser.save();
    }

    // Находим или создаем запись о паре пользователей
    let matchRecord = await Match.findOne({ 
      user1: { $in: [userId, targetUserId] },
      user2: { $in: [userId, targetUserId] }
    });
    
    let isNewMatch = false;
    let wasMutualLike = false;
    
    if (!matchRecord) {
      // Создаем новую запись о матче
      const [user1, user2] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];
      const isUserFirst = userId === user1;
      
      matchRecord = new Match({
        user1,
        user2,
        user1Liked: isUserFirst ? true : false,
        user2Liked: !isUserFirst ? true : false,
        feature: 'finder'
      });
    } else {
      // Проверяем, был ли уже лайк от targetUserId к userId
      const targetUserLiked = userId === matchRecord.user1 ? matchRecord.user2Liked : matchRecord.user1Liked;
      wasMutualLike = targetUserLiked === true;
      
      // Обновляем статус лайка
      if (userId === matchRecord.user1) {
        matchRecord.user1Liked = true;
      } else {
        matchRecord.user2Liked = true;
      }
    }
    
    // Обновляем статус матча
    if (matchRecord.user1Liked && matchRecord.user2Liked) {
      matchRecord.status = 'matched';
      isNewMatch = true;
    }
    
    await matchRecord.save();
    
    // Если образовался новый матч, отправляем уведомление о мэтче
    if (isNewMatch) {
      const otherUserId = userId === matchRecord.user1 ? matchRecord.user2 : matchRecord.user1;
      const targetUserInfo = await User.findOne({ userId: otherUserId })
        .select('name photos birthday about');
      
      // Используем утилиту для получения URL фото
      const targetPhotoUrl = targetUserInfo.photos && targetUserInfo.photos.length > 0 
        ? getFullPhotoUrl(targetUserInfo.photos[0]) 
        : null;

      // Обновляем поле matches у обоих пользователей
      await Promise.all([
        User.updateOne(
          { userId: userId },
          { $addToSet: { matches: otherUserId } }
        ),
        User.updateOne(
          { userId: otherUserId },
          { $addToSet: { matches: userId } }
        )
      ]);
      
      // Отправляем уведомление второму пользователю о новом мэтче
      const currentUserInfo = await User.findOne({ userId: userId })
        .select('name photos');
      
      const currentUserPhotoUrl = currentUserInfo.photos && currentUserInfo.photos.length > 0 
        ? getFullPhotoUrl(currentUserInfo.photos[0]) 
        : null;
      
      const notificationData = {
        userId: userId,
        name: currentUserInfo.name,
        photoUrl: currentUserPhotoUrl
      };
      
      // Отправляем уведомление о мэтче асинхронно
      notificationService.sendMatchNotification(otherUserId, notificationData)
        .catch(error => {
          console.error('Ошибка отправки уведомления о мэтче:', error);
        });
      
      // Если был взаимный лайк, уменьшаем счетчик лайков
      if (wasMutualLike) {
        await notificationService.decrementLikeCounter(otherUserId)
          .catch(error => {
            console.error('Ошибка уменьшения счетчика лайков:', error);
          });
      }
      
      return res.status(200).json({
        message: 'Matched!',
        isMatch: true,
        match: {
          matchId: matchRecord._id,
          user: {
            userId: otherUserId,
            name: targetUserInfo.name,
            photoUrl: targetPhotoUrl,
            birthday: targetUserInfo.birthday,
            photos: targetUserInfo.photos,
            about: targetUserInfo.about
          }
        }
      });
    } else {
      // Not a match yet, just save the like
      matchRecord.lastInteraction = new Date();
      await matchRecord.save();
      
      // Отправляем уведомление о лайке (простое уведомление с likeCount: 1)
      // Вся логика подсчета происходит в Firebase через Cloud Functions
      try {
        await notificationService.sendLikeNotification(targetUserId);
        console.log(`Уведомление о лайке отправлено пользователю ${targetUserId}`);
      } catch (error) {
        console.error('Ошибка отправки уведомления о лайке:', error);
      }
      
      return res.status(200).json({
        message: 'Liked',
        isMatch: false
      });
    }
    
  } catch (error) {
    console.error('Error liking user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Dislike a user
exports.dislikeUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.userId;
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }
    
    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot dislike yourself' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findOne({ userId: userId }),
      User.findOne({ userId: targetUserId })
    ]);
    
    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    // Добавляем targetUserId в excludedUsers
    if (!currentUser.excludedUsers) {
      currentUser.excludedUsers = [currentUser.userId];
    }
    if (!currentUser.excludedUsers.includes(targetUserId)) {
      currentUser.excludedUsers.push(targetUserId);
      await currentUser.save();
    }

    // Находим или создаем запись о паре пользователей
    let matchRecord = await Match.findOne({ 
      user1: { $in: [userId, targetUserId] },
      user2: { $in: [userId, targetUserId] }
    });
    
    let wasMutualLike = false;
    let shouldDecrementNotification = false;
    
    if (!matchRecord) {
      const [user1, user2] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];
      const isUserFirst = userId === user1;
      
      matchRecord = new Match({
        user1,
        user2,
        user1Liked: isUserFirst ? false : false,
        user2Liked: !isUserFirst ? false : false,
        status: 'disliked',
        feature: 'finder'
      });
    } else {
      // Проверяем, был ли лайк от targetUserId к userId
      const targetUserLiked = userId === matchRecord.user1 ? matchRecord.user2Liked : matchRecord.user1Liked;
      wasMutualLike = targetUserLiked === true;
      
      // Если targetUserId лайкнул userId, то при дизлайке нужно уменьшить счетчик у userId
      if (targetUserLiked === true) {
        shouldDecrementNotification = true;
      }
      
      if (userId === matchRecord.user1) {
        matchRecord.user1Liked = false;
      } else {
        matchRecord.user2Liked = false;
      }
      matchRecord.status = 'disliked';
    }
    
    matchRecord.lastInteraction = new Date();
    await matchRecord.save();
    
    // Если targetUserId лайкнул userId, уменьшаем счетчик лайков у userId
    if (shouldDecrementNotification) {
      await notificationService.decrementLikeCounter(userId)
        .catch(error => {
          console.error('Ошибка уменьшения счетчика лайков:', error);
        });
    }
    
    // Удаляем запись матча из базы данных, так как статус стал disliked
    try {
      await Match.findByIdAndDelete(matchRecord._id);
      console.log(`Запись матча ${matchRecord._id} удалена (статус: disliked)`);
    } catch (error) {
      console.error('Ошибка удаления записи матча:', error);
    }
    
    return res.status(200).json({
      message: 'Disliked',
      isMatch: false
    });
    
  } catch (error) {
    console.error('Error disliking user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Check if a user has liked another user
exports.checkLike = async (req, res) => {
  try {
    const { userId, targetUserId } = req.params;
    
    if (!userId || !targetUserId) {
      return res.status(400).json({ message: 'Both user IDs are required' });
    }
    
    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot check like for yourself' });
    }

    // Находим запись о паре пользователей
    const matchRecord = await Match.findOne({ 
      user1: { $in: [userId, targetUserId] },
      user2: { $in: [userId, targetUserId] }
    });
    
    if (!matchRecord) {
      return res.status(200).json({ hasLiked: false });
    }

    // Определяем, кто из пользователей user1, а кто user2
    let hasLiked = false;
    
    if (userId === matchRecord.user1) {
      hasLiked = matchRecord.user1Liked === true;
    } else if (userId === matchRecord.user2) {
      hasLiked = matchRecord.user2Liked === true;
    }
    
    return res.status(200).json({ hasLiked });
    
  } catch (error) {
    console.error('Error checking like:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all matches for a user
exports.getUserMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Находим пользователя по userId
    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userIdToSearch = user.userId;
    
    // Find all matches where the user is either user1 or user2 AND status is "matched"
    const matches = await Match.find({
      $and: [
        { $or: [{ user1: userIdToSearch }, { user2: userIdToSearch }] },
        { status: 'matched' }
      ]
    });
    
    // Для каждого матча находим данные другого пользователя
    const matchPromises = matches.map(async match => {
      const otherUserId = match.user1 === userIdToSearch ? match.user2 : match.user1;
      const otherUser = await User.findOne({ userId: otherUserId });
      
      if (!otherUser) {
        return null;
      }
      
      // Используем утилиту для получения URL фото
      const photoUrl = otherUser.photos && otherUser.photos.length > 0 
        ? getFullPhotoUrl(otherUser.photos[0]) 
        : null;
      
      return {
        matchId: match._id,
        userId: otherUser.userId,
        name: otherUser.name,
        photoUrl: photoUrl,
        lastInteraction: match.lastInteraction,
        createdAt: match.createdAt
      };
    });
    
    // Выполняем все запросы параллельно и фильтруем null значения
    const formattedMatches = (await Promise.all(matchPromises)).filter(match => match !== null);
    
    return res.status(200).json({ matches: formattedMatches });
  } catch (error) {
    console.error('Error getting matches:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 