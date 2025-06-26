const likeCounterService = require('./like-counter.service');

/**
 * Получить количество лайков для пользователя
 */
exports.getLikeCount = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const likeCount = await likeCounterService.getLikeCount(userId);
    
    return res.status(200).json({
      userId: userId,
      likeCount: likeCount
    });
    
  } catch (error) {
    console.error('Error getting like count:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Сбросить счетчик лайков для пользователя
 */
exports.resetLikeCounter = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const success = await likeCounterService.resetLikeCounter(userId);
    
    if (success) {
      return res.status(200).json({
        message: 'Like counter reset successfully',
        userId: userId
      });
    } else {
      return res.status(500).json({ message: 'Failed to reset like counter' });
    }
    
  } catch (error) {
    console.error('Error resetting like counter:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Удалить счетчик лайков для пользователя
 */
exports.deleteLikeCounter = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const success = await likeCounterService.deleteLikeCounter(userId);
    
    if (success) {
      return res.status(200).json({
        message: 'Like counter deleted successfully',
        userId: userId
      });
    } else {
      return res.status(500).json({ message: 'Failed to delete like counter' });
    }
    
  } catch (error) {
    console.error('Error deleting like counter:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 