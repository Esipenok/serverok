/**
 * Скрипт для проверки работоспособности сервера
 * Использование: node check-server.js
 */

const https = require('https');
const http = require('http');
const appConfig = require('./config/app.config');

// URL для проверки
const healthCheckUrl = `${appConfig.baseUrl}/api/health`;

console.log(`Проверка доступности сервера: ${healthCheckUrl}`);

// Функция для отправки HTTP/HTTPS запроса
function sendRequest(protocol, options, callback) {
  const req = protocol.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      callback(null, { statusCode: res.statusCode, data });
    });
  });

  req.on('error', (error) => {
    callback(error);
  });

  req.end();
}

// Проверяем доступность сервера по HTTP (должен перенаправлять на HTTPS)
console.log('Проверка HTTP -> HTTPS редиректа...');
const httpOptions = {
  hostname: 'willowe.love',
  port: 80,
  path: '/api/health',
  method: 'GET'
};

sendRequest(http, httpOptions, (error, response) => {
  if (error) {
    console.error('Ошибка HTTP запроса:', error.message);
  } else {
    console.log(`HTTP статус: ${response.statusCode}`);
    if (response.statusCode === 301 || response.statusCode === 302) {
      console.log('✅ HTTP успешно перенаправляет на HTTPS');
    } else {
      console.warn('⚠️ HTTP не перенаправляет на HTTPS');
    }
  }

  // Проверяем доступность сервера по HTTPS
  console.log('\nПроверка HTTPS соединения...');
  const httpsOptions = {
    hostname: 'willowe.love',
    port: 443,
    path: '/api/health',
    method: 'GET'
  };

  sendRequest(https, httpsOptions, (error, response) => {
    if (error) {
      console.error('Ошибка HTTPS запроса:', error.message);
    } else {
      console.log(`HTTPS статус: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.log('✅ HTTPS работает корректно');
        try {
          const data = JSON.parse(response.data);
          console.log('Ответ сервера:', data);
        } catch (e) {
          console.log('Ответ сервера (не JSON):', response.data);
        }
      } else {
        console.warn('⚠️ HTTPS вернул некорректный статус');
      }
    }
  });
}); 