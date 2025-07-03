const fs = require('fs').promises;
const path = require('path');
const User = require('../../auth/models/User');

// Блокировка пользователя маркетплейса
exports.blockMarketUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { blockedUserId } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.blocked_market_users) {
      user.blocked_market_users = [];
    }

    if (!user.blocked_market_users.includes(blockedUserId)) {
      user.blocked_market_users.push(blockedUserId);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });

  } catch (error) {
    console.error('Error blocking market user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Разблокировка пользователя маркетплейса
exports.unblockMarketUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { blockedUserId } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.blocked_market_users) {
      user.blocked_market_users = user.blocked_market_users.filter(
        id => id !== blockedUserId
      );
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });

  } catch (error) {
    console.error('Error unblocking market user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Получение списка заблокированных пользователей маркетплейса
exports.getBlockedMarketUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      blockedUsers: user.blocked_market_users || []
    });

  } catch (error) {
    console.error('Error getting blocked market users:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 