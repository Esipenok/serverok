/**
 * Скрипт для удаления коллекции chatunlockstatuses
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Загружаем переменные окружения
dotenv.config();

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anonim_chat';

console.log('Подключаемся к MongoDB...');
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Подключение к MongoDB установлено');
  
  // Удаляем коллекцию
  mongoose.connection.db.dropCollection('chatunlockstatuses')
    .then(() => {
      console.log('Коллекция chatunlockstatuses успешно удалена');
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Ошибка при удалении коллекции:', err.message);
      if (err.message.includes('ns not found')) {
        console.log('Коллекция не существует или уже удалена');
      }
      mongoose.disconnect();
    });
})
.catch(err => {
  console.error('Ошибка подключения к MongoDB:', err);
  process.exit(1);
}); 