const express = require('express');
const app = express();

// Тестируем импорт маршрутов
try {
  console.log('Пытаемся импортировать маршруты...');
  const deleteAllDataRoutes = require('./delete_all_data/delete_all_data.routes');
  console.log('✅ Маршруты успешно импортированы');
  
  // Подключаем маршруты
  app.use('/api/delete-all-user-data', (req, res, next) => {
    console.log('[Test] Запрос к /api/delete-all-user-data:', req.method, req.url);
    next();
  }, deleteAllDataRoutes);
  
  console.log('✅ Маршруты подключены');
  
  // Тестируем обработку запроса
  const testReq = {
    method: 'DELETE',
    url: '/1',
    params: { userId: '1' },
    headers: {}
  };
  
  const testRes = {
    status: (code) => {
      console.log(`📤 Ответ с кодом: ${code}`);
      return testRes;
    },
    json: (data) => {
      console.log(`📤 JSON ответ:`, data);
      return testRes;
    }
  };
  
  console.log('🧪 Тестируем обработку запроса...');
  deleteAllDataRoutes.handle(testReq, testRes, () => {
    console.log('✅ Обработка завершена');
  });
  
} catch (error) {
  console.error('❌ Ошибка при импорте маршрутов:', error.message);
  console.error(error.stack);
}

console.log('Тест завершен'); 