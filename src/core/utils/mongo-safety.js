/**
 * Утилиты для безопасной работы с MongoDB
 */

/**
 * Создает безопасный объект запроса для MongoDB
 * @param {Object} query - Исходный объект запроса
 * @returns {Object} - Безопасный объект запроса
 */
const createSafeQuery = (query) => {
  if (!query || typeof query !== 'object') return {};
  
  const safeQuery = {};
  
  // Обрабатываем только безопасные поля
  const allowedFields = ['userId', 'email', 'name', 'gender', 'lookingFor', 'isProfileCompleted'];
  
  for (const field of allowedFields) {
    if (query[field] !== undefined) {
      safeQuery[field] = query[field];
    }
  }
  
  return safeQuery;
};

/**
 * Создает безопасный объект обновления для MongoDB
 * @param {Object} update - Исходный объект обновления
 * @returns {Object} - Безопасный объект обновления
 */
const createSafeUpdate = (update) => {
  if (!update || typeof update !== 'object') return {};
  
  const safeUpdate = {};
  
  // Запрещаем операторы MongoDB в ключах
  for (const key in update) {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      // Проверяем, что ключ не начинается с $
      if (!key.startsWith('$')) {
        safeUpdate[key] = update[key];
      }
    }
  }
  
  return safeUpdate;
};

/**
 * Создает безопасные опции для MongoDB
 * @param {Object} options - Исходные опции
 * @returns {Object} - Безопасные опции
 */
const createSafeOptions = (options) => {
  if (!options || typeof options !== 'object') return {};
  
  const safeOptions = {};
  
  // Разрешаем только определенные опции
  if (options.limit !== undefined) {
    safeOptions.limit = Math.min(parseInt(options.limit) || 10, 100); // Максимум 100 записей
  }
  
  if (options.skip !== undefined) {
    safeOptions.skip = parseInt(options.skip) || 0;
  }
  
  if (options.sort) {
    const safeSort = {};
    
    // Разрешаем сортировку только по определенным полям
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email'];
    
    for (const field of allowedSortFields) {
      if (options.sort[field] !== undefined) {
        safeSort[field] = options.sort[field] === 'desc' || options.sort[field] === -1 ? -1 : 1;
      }
    }
    
    if (Object.keys(safeSort).length > 0) {
      safeOptions.sort = safeSort;
    }
  }
  
  return safeOptions;
};

/**
 * Создает безопасный ID для MongoDB
 * @param {string} id - ID для проверки
 * @returns {string|null} - Безопасный ID или null, если ID недействителен
 */
const createSafeId = (id) => {
  if (!id || typeof id !== 'string') return null;
  
  // Проверяем, что ID соответствует формату MongoDB ObjectId или является строкой без спецсимволов
  if (/^[0-9a-fA-F]{24}$/.test(id) || /^[a-zA-Z0-9_-]+$/.test(id)) {
    return id;
  }
  
  return null;
};

module.exports = {
  createSafeQuery,
  createSafeUpdate,
  createSafeOptions,
  createSafeId
}; 