const fs = require('fs').promises;
const path = require('path');
const User = require('../auth/models/User');

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
      
      // 1. Удаляем фотографии пользователя
      const userUploadPath = path.join(__dirname, '../uploads/users', userId);
      try {
        await fs.rm(userUploadPath, { recursive: true, force: true });
        console.log(`[DeleteAllData] Фотографии пользователя удалены`);
      } catch (error) {
        console.error('[DeleteAllData] Ошибка при удалении фотографий:', error);
      }

      // 2. Удаляем пользователя из базы данных
      const deletedUser = await User.deleteOne({ userId: userId });
      console.log(`[DeleteAllData] Пользователь удален из базы: ${deletedUser.deletedCount > 0 ? 'да' : 'нет'}`);

      res.status(200).json({ 
        status: 'success',
        message: 'User and photos deleted successfully' 
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