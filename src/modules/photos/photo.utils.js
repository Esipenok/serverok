/**
 * Утилиты для работы с фотографиями
 * Централизованный модуль для обработки URL фотографий и других операций с изображениями
 */

const path = require('path');
const fs = require('fs');
const appConfig = require('../../core/config/app.config');

/**
 * Получает полный URL для фотографии
 * @param {string} photoPath - Относительный или абсолютный путь к фотографии
 * @returns {string|null} - Полный URL к фотографии или null, если путь не указан
 */
const getFullPhotoUrl = (photoPath) => {
  return appConfig.getFullPhotoUrl(photoPath);
};

/**
 * Преобразует массив путей к фотографиям в массив полных URL
 * @param {Array<string>} photos - Массив путей к фотографиям
 * @returns {Array<string>} - Массив полных URL к фотографиям
 */
const getFullPhotoUrls = (photos) => {
  if (!photos) return [];
  if (!Array.isArray(photos)) {
    return [getFullPhotoUrl(photos)].filter(Boolean);
  }
  return photos.map(photo => getFullPhotoUrl(photo)).filter(Boolean);
};

/**
 * Проверяет существование файла фотографии
 * @param {string} photoPath - Путь к фотографии
 * @returns {boolean} - true, если файл существует, иначе false
 */
const photoExists = (photoPath) => {
  if (!photoPath) return false;
  
  // Если это полный URL, считаем что файл существует
  if (photoPath.startsWith('http')) return true;
  
  // Для относительных путей проверяем файл на диске
  const normalizedPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
  return fs.existsSync(path.join(process.cwd(), normalizedPath));
};

/**
 * Возвращает первую фотографию из массива или null
 * @param {Array<string>} photos - Массив путей к фотографиям
 * @returns {string|null} - URL первой фотографии или null
 */
const getFirstPhotoUrl = (photos) => {
  if (!photos || (Array.isArray(photos) && photos.length === 0)) {
    return null;
  }
  
  const photoArray = Array.isArray(photos) ? photos : [photos];
  return getFullPhotoUrl(photoArray[0]);
};

/**
 * Форматирует данные пользователя, добавляя полные URL для фотографий
 * @param {Object} userData - Данные пользователя
 * @returns {Object} - Отформатированные данные пользователя
 */
const formatUserWithPhotos = (userData) => {
  if (!userData) return null;
  
  const formattedUser = { ...userData };
  
  // Преобразуем в объект, если это документ Mongoose
  const user = formattedUser.toObject ? formattedUser.toObject() : formattedUser;
  
  // Обрабатываем фотографии
  if (user.photos) {
    user.photos = getFullPhotoUrls(user.photos);
    user.photoUrl = user.photos.length > 0 ? user.photos[0] : null;
  }
  
  return user;
};

module.exports = {
  getFullPhotoUrl,
  getFullPhotoUrls,
  photoExists,
  getFirstPhotoUrl,
  formatUserWithPhotos
}; 