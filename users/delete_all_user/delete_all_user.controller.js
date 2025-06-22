const fs = require('fs').promises;
const path = require('path');
const User = require('../../auth/models/User');

class DeleteAllUserController {
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      console.log(`[DeleteUser] Запрос на удаление пользователя с ID: ${userId}`);
      
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'userId обязателен'
        });
      }
      
      // Находим пользователя по полю userId
      const user = await User.findOne({ userId: userId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }
      
      // 1. Удаляем фотографии пользователя
      const userUploadPath = path.join(__dirname, '../../../uploads/users', userId);
      try {
        await fs.rm(userUploadPath, { recursive: true, force: true });
        console.log(`[DeleteUser] Фотографии пользователя удалены`);
      } catch (error) {
        console.error('[DeleteUser] Ошибка при удалении фотографий:', error);
      }

      // 2. Удаляем пользователя из базы данных
      const deletedUser = await User.deleteOne({ userId: userId });
      console.log(`[DeleteUser] Пользователь удален из базы: ${deletedUser.deletedCount > 0 ? 'да' : 'нет'}`);

      res.status(200).json({ 
        status: 'success',
        message: 'User and photos deleted successfully' 
      });
    } catch (error) {
      console.error('[DeleteUser] Error deleting user:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Error deleting user',
        error: error.message
      });
    }
  }
}

module.exports = DeleteAllUserController; 