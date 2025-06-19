/**
 * Тестовый скрипт для проверки функциональности конвертера изображений
 * Запуск: node test.js
 */

const fs = require('fs');
const path = require('path');
const converter = require('./index');
const logger = require('../../../config/logger.config');

// Создаем тестовую директорию, если она не существует
const testDir = path.join('uploads', 'test');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Тестовый ID пользователя
const testUserId = 'test-user-123';

/**
 * Тестирует конвертацию изображения
 * @param {string} inputPath - Путь к тестовому изображению
 */
async function testImageConversion(inputPath) {
  try {
    console.log('====== Тестирование конвертера изображений ======');
    console.log(`Исходное изображение: ${inputPath}`);
    
    if (!fs.existsSync(inputPath)) {
      console.error(`Файл не найден: ${inputPath}`);
      return;
    }
    
    // Тестируем разные типы конвертации
    console.log('\n1. Тестирование конвертации для галереи:');
    const galleryPath = await converter.optimizeImage(inputPath, testUserId, 'gallery');
    console.log(`Результат: ${galleryPath}`);
    
    console.log('\n2. Тестирование создания миниатюры:');
    const thumbnailPath = await converter.createThumbnail(inputPath, testUserId);
    console.log(`Результат: ${thumbnailPath}`);
    
    console.log('\n3. Тестирование конвертации для профиля:');
    const profilePath = await converter.optimizeImage(inputPath, testUserId, 'profile');
    console.log(`Результат: ${profilePath}`);
    
    console.log('\n4. Получение информации об изображении:');
    const imageInfo = await converter.getImageInfo(path.join('uploads', 'users', testUserId, path.basename(galleryPath)));
    console.log('Информация о конвертированном изображении:');
    console.log(`- Ширина: ${imageInfo.width}px`);
    console.log(`- Высота: ${imageInfo.height}px`);
    console.log(`- Формат: ${imageInfo.format}`);
    console.log(`- Размер: ${(imageInfo.size / 1024).toFixed(2)} KB`);
    
    console.log('\nТестирование завершено успешно!');
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

// Проверяем, передан ли путь к файлу как аргумент
const testImagePath = process.argv[2] || path.join('uploads', 'test', 'test-image.jpg');

// Запускаем тест
testImageConversion(testImagePath);

// Инструкции по использованию
if (!process.argv[2]) {
  console.log('\nДля тестирования с другим изображением используйте:');
  console.log('node test.js путь/к/вашему/изображению.jpg');
} 