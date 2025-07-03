/**
 * Модуль для конвертирования изображений в формат WebP
 * Поддерживает конвертацию из форматов: JPEG, JPG, PNG, HEIF, HEIC
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const webp = require('webp-converter');
const logger = require('../../../core/config/logger.config');
const config = require('./config');

// Предоставляем права доступа к исполняемым файлам webp-converter
webp.grant_permission();

/**
 * Конвертирует изображение в формат WebP с оптимизацией
 * @param {string} inputPath - Путь к исходному изображению
 * @param {string} userId - ID пользователя
 * @param {Object} options - Опции конвертации
 * @returns {Promise<string>} - Путь к сконвертированному изображению
 */
async function convertToWebP(inputPath, userId, options = {}) {
  try {
    // Объединяем переданные опции с настройками по умолчанию
    const {
      width = config.imageTypes.gallery.width,
      quality = config.imageTypes.gallery.quality,
      effort = config.imageTypes.gallery.effort,
    } = options;
    
    // Генерируем имя файла и пути
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
    const outputDir = path.join('uploads', 'users', userId);
    const outputPath = path.join(outputDir, filename);
    
    // Проверяем существование директории
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Определяем формат входного файла
    const inputFormat = path.extname(inputPath).toLowerCase().substring(1);
    
    // Обрабатываем специальные форматы (HEIF/HEIC)
    if (inputFormat === 'heif' || inputFormat === 'heic') {
      return await convertHeicToWebP(inputPath, outputPath, { width, quality });
    }
    
    // Используем Sharp для конвертации остальных форматов
    await sharp(inputPath)
      .resize({
        width,
        withoutEnlargement: true, // Не увеличиваем маленькие изображения
        fit: 'inside'
      })
      .webp({
        quality,
        effort,
        lossless: config.webp.lossless,
        nearLossless: config.webp.nearLossless,
        smartSubsample: config.webp.smartSubsample,
        alphaQuality: config.webp.alphaQuality,
        reductionEffort: config.webp.reductionEffort,
        force: true
      })
      .toFile(outputPath);
    
    logger.info(`Изображение успешно конвертировано в WebP: ${outputPath}`);
    return `/uploads/users/${userId}/${filename}`;
  } catch (error) {
    logger.error(`Ошибка при конвертации изображения в WebP: ${error.message}`);
    throw new Error(`Ошибка при конвертации изображения: ${error.message}`);
  }
}

/**
 * Конвертирует HEIC/HEIF изображение в WebP
 * @param {string} inputPath - Путь к исходному HEIC изображению
 * @param {string} outputPath - Путь для сохранения WebP изображения
 * @param {Object} options - Опции конвертации
 * @returns {Promise<string>} - Путь к сконвертированному изображению
 */
async function convertHeicToWebP(inputPath, outputPath, options = {}) {
  try {
    // Сначала конвертируем HEIC в PNG с помощью Sharp
    const tempPngPath = path.join(config.tempDir, `${path.basename(inputPath)}.png`);
    
    // Проверяем существование директории для временных файлов
    if (!fs.existsSync(config.tempDir)) {
      fs.mkdirSync(config.tempDir, { recursive: true });
    }
    
    await sharp(inputPath)
      .resize({
        width: options.width,
        withoutEnlargement: true,
        fit: 'inside'
      })
      .png()
      .toFile(tempPngPath);
    
    // Затем конвертируем PNG в WebP с помощью webp-converter
    const result = await webp.cwebp(tempPngPath, outputPath, `-q ${options.quality}`);
    
    // Удаляем временный PNG файл
    fs.unlinkSync(tempPngPath);
    
    if (result.indexOf('100') === -1) {
      throw new Error(`Ошибка при конвертации HEIC в WebP: ${result}`);
    }
    
    // Возвращаем относительный путь к файлу
    return outputPath.replace(/\\/g, '/').replace('uploads/', '/uploads/');
  } catch (error) {
    logger.error(`Ошибка при конвертации HEIC/HEIF в WebP: ${error.message}`);
    throw error;
  }
}

/**
 * Оптимизирует размер изображения для различных целей
 * @param {string} inputPath - Путь к исходному изображению
 * @param {string} userId - ID пользователя
 * @param {string} purpose - Назначение изображения (profile, gallery, thumbnail, chat)
 * @param {string} customOutputPath - Пользовательский путь для сохранения (опционально)
 * @returns {Promise<string>} - Путь к оптимизированному изображению
 */
async function optimizeImage(inputPath, userId, purpose = 'gallery', customOutputPath = null) {
  // Используем настройки из конфигурации
  const options = config.imageTypes[purpose] || config.imageTypes.gallery;
  
  if (customOutputPath) {
    // Если указан пользовательский путь, используем его для сохранения
    try {
      // Определяем формат входного файла
      const inputFormat = path.extname(inputPath).toLowerCase().substring(1);
      
      // Создаем директорию, если она не существует
      const outputDir = path.dirname(customOutputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Обрабатываем специальные форматы (HEIF/HEIC)
      if (inputFormat === 'heif' || inputFormat === 'heic') {
        await convertHeicToWebP(inputPath, customOutputPath, options);
        return customOutputPath.replace(/\\/g, '/').replace('uploads/', '/uploads/');
      }
      
      // Используем Sharp для конвертации остальных форматов
      await sharp(inputPath)
        .resize({
          width: options.width,
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({
          quality: options.quality,
          effort: options.effort,
          lossless: config.webp.lossless,
          nearLossless: config.webp.nearLossless,
          smartSubsample: config.webp.smartSubsample,
          alphaQuality: config.webp.alphaQuality,
          reductionEffort: config.webp.reductionEffort,
          force: true
        })
        .toFile(customOutputPath);
      
      logger.info(`Изображение успешно сохранено по пути: ${customOutputPath}`);
      return customOutputPath.replace(/\\/g, '/').replace('uploads/', '/uploads/');
    } catch (error) {
      logger.error(`Ошибка при сохранении изображения: ${error.message}`);
      throw error;
    }
  } else {
    // Если пользовательский путь не указан, используем стандартный метод
    return await convertToWebP(inputPath, userId, options);
  }
}

/**
 * Создает миниатюру изображения
 * @param {string} inputPath - Путь к исходному изображению
 * @param {string} userId - ID пользователя
 * @returns {Promise<string>} - Путь к миниатюре
 */
async function createThumbnail(inputPath, userId) {
  return await optimizeImage(inputPath, userId, 'thumbnail');
}

/**
 * Обрабатывает массив загруженных файлов
 * @param {Array} files - Массив файлов
 * @param {string} userId - ID пользователя или ID маркетной карточки
 * @param {string} purpose - Назначение изображений
 * @param {string} type - Тип обрабатываемых файлов ('user' или 'market')
 * @returns {Promise<Array>} - Массив путей к обработанным изображениям
 */
async function processUploadedFiles(files, id, purpose = 'gallery', type = 'user') {
  if (!files || files.length === 0) {
    throw new Error('Файлы не загружены');
  }
  
  const processedFiles = [];
  
  for (const file of files) {
    try {
      // Проверяем, что файл существует и имеет ненулевой размер
      if (!fs.existsSync(file.path) || file.size === 0) {
        logger.warn(`Пропускаем файл ${file.originalname}: файл не существует или имеет нулевой размер`);
        continue;
      }
      
      let webpPath;
      
      if (type === 'market') {
        // Для маркетных карточек
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const outputDir = `uploads/market/${id}`;
        const outputPath = `${outputDir}/${filename}`;
        
        // Проверяем существование директории
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Используем оптимизацию с указанием пути
        await optimizeImage(file.path, null, purpose, outputPath);
        webpPath = `/uploads/market/${id}/${filename}`;
      } else {
        // Для пользователей (стандартный путь)
        webpPath = await optimizeImage(file.path, id, purpose);
      }
      
      processedFiles.push(webpPath);
      
      // Удаляем исходный файл после конвертации
      try {
        fs.unlinkSync(file.path);
        logger.info(`Исходный файл удален: ${file.path}`);
      } catch (error) {
        logger.warn(`Не удалось удалить исходный файл ${file.path}: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Ошибка при обработке файла ${file.originalname}: ${error.message}`);
      // Продолжаем обработку других файлов
    }
  }
  
  return processedFiles;
}

/**
 * Получает информацию о размере изображения
 * @param {string} imagePath - Путь к изображению
 * @returns {Promise<Object>} - Объект с информацией о размере
 */
async function getImageInfo(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: fs.statSync(imagePath).size
    };
  } catch (error) {
    logger.error(`Ошибка при получении информации об изображении: ${error.message}`);
    throw error;
  }
}

module.exports = {
  convertToWebP,
  optimizeImage,
  createThumbnail,
  processUploadedFiles,
  getImageInfo
}; 