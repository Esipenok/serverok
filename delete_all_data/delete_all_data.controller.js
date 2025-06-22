const fs = require('fs').promises;
const path = require('path');
const User = require('../auth/models/User');
const MarketCard = require('../marketprofiles/models/MarketCard');
const Match = require('../matches/models/match.model');
const FastMatch = require('../fast_match/models/fast_match.model');
const QrCode = require('../qr/models/QrCode');

class DeleteAllDataController {
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      console.log(`[DeleteAllData] Запрос на удаление пользователя с ID: ${userId}`);
      
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'userId обязателен'
        });
      }
      
      // Находим пользователя по полю userId
      const user = await User.findOne({ userId: userId });
      if (!user) {
        console.log(`[DeleteAllData] Пользователь с userId ${userId} не найден`);
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }
      
      console.log(`[DeleteAllData] Пользователь найден: ${user.email}`);
      
      // 1. Удаляем маркет карточки пользователя
      console.log(`[DeleteAllData] Поиск маркет карточек пользователя ${userId}...`);
      const marketCards = await MarketCard.find({ userId: userId });
      console.log(`[DeleteAllData] Найдено маркет карточек: ${marketCards.length}`);
      
      if (marketCards.length > 0) {
        // Удаляем фотографии маркет карточек
        for (const card of marketCards) {
          if (card.photos && card.photos.length > 0) {
            for (const photoPath of card.photos) {
              try {
                const fullPhotoPath = path.join(__dirname, '..', photoPath);
                await fs.unlink(fullPhotoPath);
                console.log(`[DeleteAllData] Удалена фотография маркет карточки: ${photoPath}`);
              } catch (error) {
                console.error(`[DeleteAllData] Ошибка при удалении фотографии ${photoPath}:`, error.message);
              }
            }
          }
        }
        
        // Удаляем маркет карточки из базы данных
        const deletedCards = await MarketCard.deleteMany({ userId: userId });
        console.log(`[DeleteAllData] Удалено маркет карточек из базы: ${deletedCards.deletedCount}`);
      }
      
      // 2. Удаляем матчи пользователя (все записи где user1 или user2 = userId)
      console.log(`[DeleteAllData] Поиск матчей пользователя ${userId}...`);
      const userMatches = await Match.find({
        $or: [
          { user1: userId },
          { user2: userId }
        ]
      });
      console.log(`[DeleteAllData] Найдено матчей: ${userMatches.length}`);
      
      if (userMatches.length > 0) {
        const deletedMatches = await Match.deleteMany({
          $or: [
            { user1: userId },
            { user2: userId }
          ]
        });
        console.log(`[DeleteAllData] Удалено матчей из базы: ${deletedMatches.deletedCount}`);
      }
      
      // 3. Удаляем fast match записи пользователя
      console.log(`[DeleteAllData] Поиск fast match записей пользователя ${userId}...`);
      const fastMatches = await FastMatch.find({
        $or: [
          { user_first: userId },
          { user_second: userId }
        ]
      });
      console.log(`[DeleteAllData] Найдено fast match записей: ${fastMatches.length}`);
      
      if (fastMatches.length > 0) {
        const deletedFastMatches = await FastMatch.deleteMany({
          $or: [
            { user_first: userId },
            { user_second: userId }
          ]
        });
        console.log(`[DeleteAllData] Удалено fast match записей из базы: ${deletedFastMatches.deletedCount}`);
      }
      
      // 4. Удаляем QR коды пользователя
      console.log(`[DeleteAllData] Поиск QR кодов пользователя ${userId}...`);
      const userQrCodes = await QrCode.find({ user_id: userId });
      console.log(`[DeleteAllData] Найдено QR кодов: ${userQrCodes.length}`);
      
      if (userQrCodes.length > 0) {
        const deletedQrCodes = await QrCode.deleteMany({ user_id: userId });
        console.log(`[DeleteAllData] Удалено QR кодов из базы: ${deletedQrCodes.deletedCount}`);
      }
      
      // 5. Удаляем фотографии пользователя
      const userUploadPath = path.join(__dirname, '../uploads/users', userId);
      try {
        await fs.rm(userUploadPath, { recursive: true, force: true });
        console.log(`[DeleteAllData] Фотографии пользователя удалены`);
      } catch (error) {
        console.error('[DeleteAllData] Ошибка при удалении фотографий:', error);
      }

      // 6. Удаляем пользователя из базы данных
      const deletedUser = await User.deleteOne({ userId: userId });
      console.log(`[DeleteAllData] Пользователь удален из базы: ${deletedUser.deletedCount > 0 ? 'да' : 'нет'}`);

      res.status(200).json({ 
        status: 'success',
        message: 'User, market cards, matches, fast matches, QR codes and photos deleted successfully',
        deletedCards: marketCards.length,
        deletedMatches: userMatches.length,
        deletedFastMatches: fastMatches.length,
        deletedQrCodes: userQrCodes.length,
        deletedUser: deletedUser.deletedCount > 0
      });
    } catch (error) {
      console.error('[DeleteAllData] Error deleting user:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Error deleting user',
        error: error.message
      });
    }
  }
}

module.exports = DeleteAllDataController; 