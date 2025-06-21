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

      // Находим пользователя по полю userId (строка), а не по _id (ObjectId)
      const user = await User.findOne({ userId: userId });
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
      try {
        await fs.rm(userUploadPath, { recursive: true, force: true });
      } catch (error) {
        console.error('Ошибка при удалении фотографий:', error);
      }

      // 2. Удаляем все маркет карточки пользователя
      try {
        const deletedMarketCards = await MarketCard.deleteMany({ userId: userId });
        console.log(`[DeleteUser] Удалено маркет карточек: ${deletedMarketCards.deletedCount}`);
      } catch (error) {
        console.error('Ошибка при удалении маркет карточек:', error);
      }

      // 3. Удаляем все мэтчи пользователя
      try {
        const deletedMatches = await Match.deleteMany({
          $or: [
            { user1: userId },
            { user2: userId }
          ]
        });
        console.log(`[DeleteUser] Удалено мэтчей: ${deletedMatches.deletedCount}`);
      } catch (error) {
        console.error('Ошибка при удалении мэтчей:', error);
      }

      // 4. Удаляем все QR-коды пользователя
      try {
        const deletedQrCodes = await QrCode.deleteMany({
          $or: [
            { user_id: userId },
            { last_claimed_by: userId }
          ]
        });
        console.log(`[DeleteUser] Удалено QR-кодов: ${deletedQrCodes.deletedCount}`);
      } catch (error) {
        console.error('Ошибка при удалении QR-кодов:', error);
      }

      // 5. Удаляем все жалобы пользователя (где он отправитель или получатель)
      try {
        const deletedComplaints = await Complaint.deleteMany({
          $or: [
            { senderId: userId },
            { reportedUserId: userId }
          ]
        });
        console.log(`[DeleteUser] Удалено жалоб: ${deletedComplaints.deletedCount}`);
      } catch (error) {
        console.error('Ошибка при удалении жалоб:', error);
      }

      // 6. Удаляем все связанные данные пользователя
      await Promise.all([
        User.deleteOne({ userId: userId }),
        Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
        FastMatch.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
        MarketCard.deleteMany({ userId: userId }),
        Complaint.deleteMany({ $or: [{ senderId: userId }, { reportedUserId: userId }] })
      ]);

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