const fs = require('fs');
const User = require('../../auth/models/User');
const { getFullPhotoUrl } = require('./photo.utils');
const photoConverter = require('./photo_converter');
const logger = require('../../config/logger.config');

class PhotosService {
  // Удаление всех фотографий пользователя
  static async deleteAllPhotos(userId) {
    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Удаляем физические файлы фотографий
    const userUploadPath = `uploads/users/${userId}`;
    if (fs.existsSync(userUploadPath)) {
      fs.rmSync(userUploadPath, { recursive: true, force: true });
    }

    // Очищаем массив фотографий в базе данных
    user.photos = [];
    await user.save();

    return true;
  }

  // Обновление списка фотографий
  static async updatePhotos(userId, newPhotos) {
    if (!Array.isArray(newPhotos)) {
      throw new Error('photos должен быть массивом');
    }

    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Получаем старый список фотографий
    const oldPhotos = user.photos || [];
    
    // Находим фотографии, которые нужно удалить
    const photosToDelete = oldPhotos.filter(oldPhoto => !newPhotos.includes(oldPhoto));
    
    // Удаляем физические файлы
    for (const photoUrl of photosToDelete) {
      try {
        const fileName = photoUrl.split('/').pop();
        const filePath = `uploads/users/${userId}/${fileName}`;
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Удален файл: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Ошибка при удалении файла ${photoUrl}:`, error);
      }
    }

    // Обновляем список фотографий в базе данных
    user.photos = newPhotos;
    await user.save();

    return user.photos.map(photo => getFullPhotoUrl(photo));
  }

  // Сохранение новых фотографий с конвертацией в WebP
  static async savePhotos(userId, files) {
    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (!files || files.length === 0) {
      throw new Error('Файлы не загружены');
    }

    if (!user.photos) {
      user.photos = [];
    }

    try {
      // Обрабатываем и конвертируем загруженные файлы
      const processedPhotos = await photoConverter.processUploadedFiles(files, userId);
      
      // Добавляем новые пути к фотографиям пользователя
      user.photos = [...user.photos, ...processedPhotos];
      await user.save();
      
      logger.info(`Сохранено ${processedPhotos.length} новых фотографий для пользователя ${userId}`);
      
      // Возвращаем полные URL для всех фотографий
      return user.photos.map(photo => getFullPhotoUrl(photo));
    } catch (error) {
      logger.error(`Ошибка при сохранении фотографий: ${error.message}`);
      throw error;
    }
  }

  // Парсинг строк JSON в объекты и массивы
  static parseJsonFields(data) {
    const result = { ...data };
    const jsonFields = [
      'real_loc', 'change_loc', 'market_location', 
      'blocked_users', 'blocked_market_users', 'excludedUsers', 
      'exclude_audio', 'matches', 'market_cards', 'market_card_exclude'
    ];
    
    for (const field of jsonFields) {
      if (result[field] !== undefined) {
        try {
          // Если поле - строка, пытаемся распарсить JSON
          if (typeof result[field] === 'string') {
            const parsedValue = JSON.parse(result[field]);
            result[field] = parsedValue;
            logger.info(`Успешно распарсили поле ${field}: ${result[field]}`);
          }
        } catch (error) {
          logger.error(`Ошибка при парсинге JSON поля ${field}: ${error.message}`);
          // Оставляем поле как есть, если не удалось распарсить
        }
      }
    }
    
    return result;
  }

  // Обновление профиля с фотографиями
  static async updateProfileWithPhotos(userId, profileData, files) {
    try {
      const existingUser = await User.findOne({ userId });
      if (!existingUser) {
        throw new Error('Пользователь не найден');
      }

      logger.info(`Начало обновления профиля с фотографиями для пользователя ${userId}`);
      logger.info(`Количество файлов: ${files ? files.length : 0}`);

      // Удаляем старые фотографии
      const oldPhotos = existingUser.photos || [];
      for (const photoUrl of oldPhotos) {
        try {
          const fileName = photoUrl.split('/').pop();
          const filePath = `uploads/users/${userId}/${fileName}`;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`Удален старый файл: ${filePath}`);
          }
        } catch (error) {
          logger.error(`Ошибка при удалении старого файла ${photoUrl}: ${error.message}`);
        }
      }

      // Обрабатываем и конвертируем новые фотографии
      let newPhotos = [];
      if (files && files.length > 0) {
        // Используем конвертер для оптимизации и конвертации в WebP
        newPhotos = await photoConverter.processUploadedFiles(files, userId);
        logger.info(`Обработано ${newPhotos.length} новых фотографий`);
      }

      // Парсим JSON строки в объекты и массивы
      const parsedProfileData = this.parseJsonFields(profileData);
      logger.info(`Данные профиля после парсинга: ${JSON.stringify(parsedProfileData, null, 2)}`);

      // Обновляем данные профиля
      const updateData = {
        ...parsedProfileData,
        photos: newPhotos,
        updatedAt: new Date()
      };

      // Используем findOneAndUpdate вместо save для избежания проблем с версионированием
      const updatedUser = await User.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new Error('Не удалось обновить профиль пользователя');
      }

      logger.info(`Профиль пользователя ${userId} успешно обновлен с ${newPhotos.length} фотографиями`);
      return updatedUser;
    } catch (error) {
      logger.error(`Ошибка при обновлении профиля с фотографиями: ${error.message}`);
      throw error;
    }
  }
  
  // Создание миниатюры для фотографии профиля
  static async createProfileThumbnail(userId, photoPath) {
    try {
      if (!photoPath) {
        throw new Error('Путь к фотографии не указан');
      }
      
      const thumbnailPath = await photoConverter.createThumbnail(photoPath, userId);
      logger.info(`Создана миниатюра для профиля пользователя ${userId}: ${thumbnailPath}`);
      
      return thumbnailPath;
    } catch (error) {
      logger.error(`Ошибка при создании миниатюры: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PhotosService; 