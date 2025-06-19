const fs = require('fs').promises;
const path = require('path');
const User = require('../../auth/models/User');
const MarketCard = require('../../marketprofiles/models/MarketCard');
const Match = require('../../matches/models/match.model');
const QrCode = require('../../qr/models/QrCode');
const FastMatch = require('../../fast_match/models/fast_match.model');

class DeleteAllUserController {
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // Находим пользователя
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }

      // 1. Удаляем все фотографии пользователя
      const userUploadPath = path.join(__dirname, '../../../uploads/users', userId);
      try {
        await fs.rm(userUploadPath, { recursive: true, force: true });
      } catch (error) {
        console.error('Ошибка при удалении фотографий:', error);
      }

      // 2. Удаляем все маркет карточки пользователя
      if (user.market_cards && user.market_cards.length > 0) {
        try {
          await MarketCard.deleteMany({ marketCardId: { $in: user.market_cards } });
        } catch (error) {
          console.error('Ошибка при удалении маркет карточек:', error);
        }
      }

      // 3. Удаляем все мэтчи пользователя
      try {
        await Match.deleteMany({
          $or: [
            { user1: userId },
            { user2: userId }
          ]
        });
      } catch (error) {
        console.error('Ошибка при удалении мэтчей:', error);
      }

      // 4. Удаляем все QR-коды пользователя
      try {
        await QrCode.deleteMany({
          $or: [
            { user_id: userId },
            { last_claimed_by: userId }
          ]
        });
      } catch (error) {
        console.error('Ошибка при удалении QR-кодов:', error);
      }

      // 5. Удаляем все связанные данные пользователя
      await Promise.all([
        User.findByIdAndDelete(userId),
        Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
        FastMatch.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
        MarketCard.deleteMany({ userId })
      ]);

      res.status(200).json({ message: 'User and all related data deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  }
}

module.exports = DeleteAllUserController; 