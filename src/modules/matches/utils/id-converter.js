const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

/**
 * Преобразует строковый ID в MongoDB ObjectId, если возможно
 * @param {string} id - Строковый идентификатор для преобразования
 * @returns {ObjectId|null} - ObjectId или null, если преобразование невозможно
 */
exports.toObjectId = (id) => {
  if (!id) return null;
  
  try {
    // Если id уже является ObjectId, вернем его
    if (id instanceof ObjectId) return id;
    
    // Если id строка и соответствует формату ObjectId, преобразуем ее
    if (mongoose.isValidObjectId(id)) {
      return new ObjectId(id);
    }
    
    // Для числовых строковых ID просто вернём null - мы не пытаемся их преобразовать в ObjectId
    return null;
  } catch (error) {
    console.error(`Ошибка преобразования ID ${id} в ObjectId:`, error);
    return null;
  }
};

/**
 * Валидирует ID и возвращает его в виде строки
 * @param {string|ObjectId} id - ID для валидации
 * @returns {string|null} - Строковое представление ID или null
 */
exports.validateId = (id) => {
  if (!id) return null;
  
  try {
    if (id instanceof ObjectId) return id.toString();
    
    if (typeof id === 'string') {
      // Для строк в формате ObjectId
      if (mongoose.isValidObjectId(id)) {
        return id;
      }
      
      // Для числовых строковых ID
      if (/^\d+$/.test(id)) {
        return id;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Ошибка валидации ID ${id}:`, error);
    return null;
  }
}; 