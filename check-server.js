/**
 * Скрипт для проверки работоспособности сервера
 * Использование: node check-server.js
 */

const http = require('http');
const appConfig = require('./config/app.config');

// URL для проверки
const healthCheckUrl = `${appConfig.baseUrl}/api/health`;

console.log(`Проверка доступности сервера: ${healthCheckUrl}`);

// Отправляем HTTP запрос
http.get(healthCheckUrl, (res) => {
  let data = '';
  
  // Собираем данные
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // Обрабатываем ответ
  res.on('end', () => {
    console.log(`Статус ответа: ${res.statusCode}`);
    console.log(`Тело ответа: ${data}`);
    
    if (res.statusCode === 200) {
      console.log('Сервер работает корректно!');
    } else {
      console.error('Сервер вернул ошибку!');
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`Ошибка при проверке сервера: ${err.message}`);
  process.exit(1);
}); 