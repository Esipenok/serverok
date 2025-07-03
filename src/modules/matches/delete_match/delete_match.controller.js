const Match = require('../models/match.model');
const User = require('../../auth/models/User');

// Удаление матча при блокировке пользователя
exports.deleteMatchOnBlock = async (req, res) => {
  try {
    const { userId, blockedUserId } = req.body;
    
    if (!userId || !blockedUserId) {
      return res.status(400).json({ message: 'User IDs are required' });
    }

    // 1. Удаляем матч между пользователями
    const match = await Match.findOneAndDelete({ 
      user1: { $in: [userId, blockedUserId] },
      user2: { $in: [userId, blockedUserId] }
    });
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // 2. Обновляем данные обоих пользователей в одной транзакции
    await Promise.all([
      // Обновляем данные блокирующего пользователя
      User.findOneAndUpdate(
        { userId: userId },
        { 
          $pull: { 
            matches: blockedUserId,
            excludedUsers: blockedUserId
          },
          $addToSet: { blocked_users: blockedUserId }
        }
      ),
      // Обновляем данные заблокированного пользователя
      User.findOneAndUpdate(
        { userId: blockedUserId },
        { 
          $pull: { 
            matches: userId,
            excludedUsers: userId
          }
        }
      )
    ]);
    
    return res.status(200).json({
      message: 'Match deleted and users updated successfully'
    });
    
  } catch (error) {
    console.error('Error deleting match:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 