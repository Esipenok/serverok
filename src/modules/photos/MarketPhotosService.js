const fs = require('fs');
const logger = require('../../core/config/logger.config');
const MarketCard = require('../marketprofiles/models/MarketCard');
const User = require('../auth/models/User');
const { getFullPhotoUrl } = require('./photo.utils');
const photoConverter = require('./photo_converter');

class MarketPhotosService {
  // Удаление всех фотографий маркетной карточки
  static async deleteAllPhotos(marketCardId) {
    const marketCard = await MarketCard.findOne({ marketCardId });
    if (!marketCard) {
      throw new Error('Маркетная карточка не найдена');
    }

    // Удаляем физические файлы фотографий
    const uploadPath = `uploads/market/${marketCardId}`;
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true });
    }

    // Очищаем массив фотографий в базе данных
    marketCard.photos = [];
    await marketCard.save();

    return true;
  }

  // Обновление списка фотографий
  static async updatePhotos(marketCardId, newPhotos) {
    if (!Array.isArray(newPhotos)) {
      throw new Error('photos должен быть массивом');
    }

    const marketCard = await MarketCard.findOne({ marketCardId });
    if (!marketCard) {
      throw new Error('Маркетная карточка не найдена');
    }

    // Получаем старый список фотографий
    const oldPhotos = marketCard.photos || [];
    
    // Находим фотографии, которые нужно удалить
    const photosToDelete = oldPhotos.filter(oldPhoto => !newPhotos.includes(oldPhoto));
    
    // Удаляем физические файлы
    for (const photoUrl of photosToDelete) {
      try {
        const fileName = photoUrl.split('/').pop();
        const filePath = `uploads/market/${marketCardId}/${fileName}`;
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Удален файл: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Ошибка при удалении файла ${photoUrl}:`, error);
      }
    }

    // Обновляем список фотографий в базе данных
    marketCard.photos = newPhotos;
    await marketCard.save();

    return marketCard.photos.map(photo => getFullPhotoUrl(photo));
  }

  // Сохранение новых фотографий с конвертацией в WebP
  static async savePhotos(marketCardId, files) {
    const marketCard = await MarketCard.findOne({ marketCardId });
    if (!marketCard) {
      throw new Error('Маркетная карточка не найдена');
    }

    if (!files || files.length === 0) {
      throw new Error('Файлы не загружены');
    }

    if (!marketCard.photos) {
      marketCard.photos = [];
    }

    try {
      // Используем обновленный метод processUploadedFiles с параметром type='market'
      const processedPhotos = await photoConverter.processUploadedFiles(files, marketCardId, 'gallery', 'market');
      
      // Добавляем новые пути к фотографиям карточки
      marketCard.photos = [...marketCard.photos, ...processedPhotos];
      await marketCard.save();
      
      logger.info(`Сохранено ${processedPhotos.length} новых фотографий для маркетной карточки ${marketCardId}`);
      
      // Возвращаем полные URL для всех фотографий
      return marketCard.photos.map(photo => getFullPhotoUrl(photo));
    } catch (error) {
      logger.error(`Ошибка при сохранении фотографий: ${error.message}`);
      throw error;
    }
  }

  // Создание миниатюры для фотографии маркетной карточки
  static async createThumbnail(marketCardId, photoPath) {
    try {
      if (!photoPath) {
        throw new Error('Путь к фотографии не указан');
      }
      
      // Генерируем имя файла и пути для миниатюры
      const filename = `thumbnail-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
      const outputDir = `uploads/market/${marketCardId}`;
      const outputPath = `${outputDir}/${filename}`;
      
      // Используем обновленный метод optimizeImage с указанием пути
      await photoConverter.optimizeImage(photoPath, null, 'thumbnail', outputPath);
      
      const thumbnailPath = `/uploads/market/${marketCardId}/${filename}`;
      logger.info(`Создана миниатюра для маркетной карточки ${marketCardId}: ${thumbnailPath}`);
      
      return thumbnailPath;
    } catch (error) {
      logger.error(`Ошибка при создании миниатюры: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MarketPhotosService; 