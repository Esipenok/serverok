const fs = require('fs');
const path = require('path');
const PhotosService = require('./photos.service');
const { formatUserWithPhotos } = require('./photo.utils');
const logger = require('../../config/logger.config');
const { kafkaModuleService } = require('../../kafka/init');

class PhotosController {
  // Загрузка фотографий
  static async uploadPhotos(req, res) {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Файлы не загружены' });
      }
      
      // Проверяем, что все файлы имеют допустимый тип
      const validTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp', 
        'image/heic', 
        'image/heif'
      ];
      
      const invalidFiles = files.filter(file => !validTypes.includes(file.mimetype));
      
      if (invalidFiles.length > 0) {
        logger.warn(`Попытка загрузить файлы недопустимого типа: ${invalidFiles.map(f => f.originalname).join(', ')}`);
        return res.status(400).json({ 
          message: 'Недопустимый тип файла. Разрешены только JPEG, PNG, GIF, WEBP, HEIC и HEIF',
          invalidFiles: invalidFiles.map(f => f.originalname)
        });
      }
      
      logger.info(`Начинаем загрузку ${files.length} фотографий для пользователя ${userId}`);
      
              // Сохраняем фотографии с помощью сервиса
        const updatedPhotos = await PhotosService.savePhotos(userId, files);
        
        // Отправляем асинхронные операции в Kafka
        try {
          // Асинхронная оптимизация фото
          await kafkaModuleService.sendPhotoOperation('optimize', {
            userId: userId,
            photoId: updatedPhotos[0]?.id || 'unknown',
            originalSize: files[0]?.size || 0,
            targetSize: Math.floor((files[0]?.size || 0) * 0.8) // 20% сжатие
          });
          
          // Асинхронная аналитика
          await kafkaModuleService.sendPhotoOperation('analytics', {
            userId: userId,
            photoId: updatedPhotos[0]?.id || 'unknown',
            fileSize: files[0]?.size || 0,
            uploadTime: new Date().toISOString(),
            processingTime: Date.now() - startTime
          });
          
          // Асинхронная очистка временных файлов
          await kafkaModuleService.sendPhotoOperation('cleanup', {
            userId: userId,
            photoId: updatedPhotos[0]?.id || 'unknown',
            cleanupType: 'temp_files'
          });
          
        } catch (error) {
          logger.error('Ошибка отправки асинхронных операций в Kafka:', error);
          // Не прерываем основной поток, так как фото уже загружены
        }
        
        logger.info(`Успешно загружены и конвертированы ${files.length} фотографий для пользователя ${userId}`);
      
      res.status(200).json({ 
        message: 'Фотографии успешно загружены и оптимизированы',
        photos: updatedPhotos
      });
    } catch (error) {
      logger.error(`Ошибка при загрузке фотографий: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  }

  // Удаление всех фотографий
  static async deleteAllPhotos(req, res) {
    try {
      const { userId } = req.params;
      
      logger.info(`Удаление всех фотографий пользователя ${userId}`);
      await PhotosService.deleteAllPhotos(userId);
      
      res.status(200).json({ 
        message: 'Все фотографии удалены',
        photos: []
      });
    } catch (error) {
      logger.error(`Ошибка при удалении фотографий: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  }

  // Обновление списка фотографий
  static async updatePhotos(req, res) {
    try {
      const { userId } = req.params;
      const { photos } = req.body;
      
      if (!Array.isArray(photos)) {
        return res.status(400).json({ message: 'photos должен быть массивом' });
      }
      
      logger.info(`Обновление списка фотографий для пользователя ${userId}`);
      const updatedPhotos = await PhotosService.updatePhotos(userId, photos);
      
      res.status(200).json({ 
        message: 'Список фотографий обновлен',
        photos: updatedPhotos
      });
    } catch (error) {
      logger.error(`Ошибка при обновлении списка фотографий: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  }

  // Обновление профиля с фотографиями
  static async updateProfileWithPhotos(req, res) {
    try {
      const { userId } = req.params;
      const profileData = req.body;
      const files = req.files;

      logger.info(`Обновление профиля с фотографиями для пользователя ${userId}`);
      logger.info(`Количество загруженных файлов: ${files ? files.length : 0}`);

      // Используем сервис для обновления профиля с фотографиями
      const updatedUser = await PhotosService.updateProfileWithPhotos(userId, profileData, files);
      
      // Форматируем пользователя с правильными URL для фотографий
      const formattedUser = formatUserWithPhotos(updatedUser);

      res.status(200).json({
        message: 'Профиль с фотографиями обновлен',
        user: formattedUser
      });
    } catch (error) {
      logger.error(`Ошибка при обновлении профиля с фотографиями: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  }
  
  // Создание миниатюры для фотографии профиля
  static async createProfileThumbnail(req, res) {
    try {
      const { userId } = req.params;
      const { photoPath } = req.body;
      
      if (!photoPath) {
        return res.status(400).json({ message: 'Путь к фотографии не указан' });
      }
      
      logger.info(`Создание миниатюры для пользователя ${userId}`);
      const thumbnailPath = await PhotosService.createProfileThumbnail(userId, photoPath);
      
      res.status(200).json({ 
        message: 'Миниатюра успешно создана',
        thumbnailPath
      });
    } catch (error) {
      logger.error(`Ошибка при создании миниатюры: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = PhotosController; 