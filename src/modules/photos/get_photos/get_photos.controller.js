/**
 * Контроллер для получения фотографий разных размеров
 */

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const stat = promisify(fs.stat);
const logger = require('../../../core/config/logger.config');
const appConfig = require('../../../core/config/app.config');
const photoConverter = require('../photo_converter');
const { getFullPhotoUrl } = require('../photo.utils');
const User = require('../../auth/models/User');
const MarketCard = require('../../marketprofiles/models/MarketCard');

class GetPhotosController {
  /**
   * Получение фотографии с указанным типом (размером)
   * @param {Object} req - Запрос Express
   * @param {Object} res - Ответ Express
   */
  static async getPhotoByType(req, res) {
    try {
      const { photoPath } = req.params;
      const { imageType = 'gallery' } = req.query;
      
      // Проверяем, что тип изображения допустимый
      const validTypes = ['profile', 'gallery', 'thumbnail', 'chat'];
      if (!validTypes.includes(imageType)) {
        return res.status(400).json({
          status: 'error',
          message: `Недопустимый тип изображения. Допустимые типы: ${validTypes.join(', ')}`
        });
      }
      
      // Декодируем путь к фотографии
      const decodedPath = decodeURIComponent(photoPath);
      
      // Формируем полный путь к файлу
      const fullPath = path.join('uploads', decodedPath);
      
      logger.info(`Запрос на получение фотографии типа ${imageType}: ${fullPath}`);
      
      // Проверяем существование файла
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Файл не найден: ${fullPath}`);
        return res.status(404).json({
          status: 'error',
          message: 'Файл не найден'
        });
      }
      
      // Если файл уже в формате WebP, просто отправляем его
      if (fullPath.toLowerCase().endsWith('.webp')) {
        return res.sendFile(path.resolve(fullPath));
      }
      
      // Получаем ID пользователя из пути к файлу
      const pathParts = decodedPath.split('/');
      const userId = pathParts.length > 1 ? pathParts[1] : 'unknown';
      
      // Конвертируем изображение в WebP с нужными параметрами
      const webpPath = await photoConverter.optimizeImage(fullPath, userId, imageType);
      
      // Отправляем конвертированный файл
      res.sendFile(path.resolve(webpPath.replace(/^\//, '')));
      
    } catch (error) {
      logger.error(`Ошибка при получении фотографии: ${error.message}`);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка при получении фотографии'
      });
    }
  }
  
  /**
   * Получение миниатюры для фотографии
   * @param {Object} req - Запрос Express
   * @param {Object} res - Ответ Express
   */
  static async getThumbnail(req, res) {
    try {
      const { photoPath } = req.params;
      
      // Декодируем путь к фотографии
      const decodedPath = decodeURIComponent(photoPath);
      
      // Формируем полный путь к файлу
      const fullPath = path.join('uploads', decodedPath);
      
      logger.info(`Запрос на получение миниатюры: ${fullPath}`);
      
      // Проверяем существование файла
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Файл не найден: ${fullPath}`);
        return res.status(404).json({
          status: 'error',
          message: 'Файл не найден'
        });
      }
      
      // Получаем ID пользователя из пути к файлу
      const pathParts = decodedPath.split('/');
      const userId = pathParts.length > 1 ? pathParts[1] : 'unknown';
      
      // Создаем миниатюру
      const thumbnailPath = await photoConverter.createThumbnail(fullPath, userId);
      
      // Отправляем миниатюру
      res.sendFile(path.resolve(thumbnailPath.replace(/^\//, '')));
      
    } catch (error) {
      logger.error(`Ошибка при получении миниатюры: ${error.message}`);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка при получении миниатюры'
      });
    }
  }
  
  /**
   * Получение информации о фотографии
   * @param {Object} req - Запрос Express
   * @param {Object} res - Ответ Express
   */
  static async getPhotoInfo(req, res) {
    try {
      const { photoPath } = req.params;
      
      // Декодируем путь к фотографии
      const decodedPath = decodeURIComponent(photoPath);
      
      // Формируем полный путь к файлу
      const fullPath = path.join('uploads', decodedPath);
      
      logger.info(`Запрос на получение информации о фотографии: ${fullPath}`);
      
      // Проверяем существование файла
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Файл не найден: ${fullPath}`);
        return res.status(404).json({
          status: 'error',
          message: 'Файл не найден'
        });
      }
      
      // Получаем информацию о фотографии
      const photoInfo = await photoConverter.getImageInfo(fullPath);
      
      // Добавляем URL к информации
      photoInfo.url = getFullPhotoUrl(decodedPath);
      
      // Отправляем информацию
      res.json({
        status: 'success',
        data: photoInfo
      });
      
    } catch (error) {
      logger.error(`Ошибка при получении информации о фотографии: ${error.message}`);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка при получении информации о фотографии'
      });
    }
  }
}

module.exports = GetPhotosController; 