const fs = require('fs').promises;
const path = require('path');
const User = require('../../auth/models/User');
const MarketCard = require('../../marketprofiles/models/MarketCard');
const Match = require('../../matches/models/match.model');
const QrCode = require('../../qr/models/QrCode');
const FastMatch = require('../../fast_match/models/fast_match.model');
const Complaint = require('../../complain/models/complaint');

class DeleteAllUserController {
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      console.log(`[DeleteUser] Запрос на удаление пользователя с ID: ${userId}`);
      console.log(`[DeleteUser] Тип userId:`, typeof userId, 'Значение:', userId);
      
      // Находим пользователя по полю userId (строка), а не по _id (ObjectId)
      console.log(`[DeleteUser] Ищем пользователя по userId:`, userId);
      const user = await User.findOne({ userId: userId });
      console.log(`[DeleteUser] Результат поиска пользователя:`, user);
      if (!user) {
        console.log(`[DeleteUser] Пользователь с userId ${userId} не найден`);
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }
      console.log(`[DeleteUser] Пользователь найден: ${user.email}`);
      
      // 1. Удаляем все фотографии пользователя
      const userUploadPath = path.join(__dirname, '../../../uploads/users', userId);
      console.log(`[DeleteUser] Путь к фотографиям пользователя:`, userUploadPath);
      try {
        await fs.rm(userUploadPath, { recursive: true, force: true });
        console.log(`[DeleteUser] Фотографии пользователя удалены`);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении фотографий:', error);
      }

      // 2. Удаляем все маркет карточки пользователя
      try {
        console.log(`[DeleteUser] Удаляем маркет карточки по userId:`, userId);
        const deletedMarketCards = await MarketCard.deleteMany({ userId: userId });
        console.log(`[DeleteUser] Удалено маркет карточек: ${deletedMarketCards.deletedCount}`);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении маркет карточек:', error);
      }

      // 3. Удаляем все мэтчи пользователя
      try {
        console.log(`[DeleteUser] Удаляем мэтчи по userId:`, userId);
        const deletedMatches = await Match.deleteMany({
          $or: [
            { user1: userId },
            { user2: userId }
          ]
        });
        console.log(`[DeleteUser] Удалено мэтчей: ${deletedMatches.deletedCount}`);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении мэтчей:', error);
      }

      // 4. Удаляем все QR-коды пользователя
      try {
        console.log(`[DeleteUser] Удаляем QR-коды по userId:`, userId);
        const deletedQrCodes = await QrCode.deleteMany({
          $or: [
            { user_id: userId },
            { last_claimed_by: userId }
          ]
        });
        console.log(`[DeleteUser] Удалено QR-кодов: ${deletedQrCodes.deletedCount}`);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении QR-кодов:', error);
      }

      // 5. Удаляем все жалобы пользователя (где он отправитель или получатель)
      try {
        console.log(`[DeleteUser] Удаляем жалобы по userId:`, userId);
        const deletedComplaints = await Complaint.deleteMany({
          $or: [
            { senderId: userId },
            { reportedUserId: userId }
          ]
        });
        console.log(`[DeleteUser] Удалено жалоб: ${deletedComplaints.deletedCount}`);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении жалоб:', error);
      }

      // 6. Удаляем все связанные данные пользователя
      try {
        console.log(`[DeleteUser] Удаляем все связанные данные пользователя по userId:`, userId);
        const results = await Promise.all([
          User.deleteOne({ userId: userId }),
          Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
          FastMatch.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
          MarketCard.deleteMany({ userId: userId }),
          Complaint.deleteMany({ $or: [{ senderId: userId }, { reportedUserId: userId }] })
        ]);
        console.log(`[DeleteUser] Результаты удаления связанных данных:`, results);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении связанных данных:', error);
      }

      console.log(`[DeleteUser] Пользователь ${userId} успешно удален`);
      res.status(200).json({ message: 'User and all related data deleted successfully' });
    } catch (error) {
      console.error('[DeleteUser] Error deleting user:', error);
      console.error('[DeleteUser] Stack trace:', error.stack);
      res.status(500).json({ 
        message: 'Error deleting user',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = DeleteAllUserController; 