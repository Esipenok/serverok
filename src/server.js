require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const app = require('./app'); // Импортируем app из app.js
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http'); // Добавляем модуль http для создания сервера
const https = require('https');

// Core imports
const { 
  appConfig, 
  dbConfig, 
  loggerConfig, 
  cleanup
} = require('./core');

// Module imports
const { 
  auth, 
  fastMatch, 
  marketprofiles 
} = require('./modules');

// Infrastructure imports
const { kafka } = require('./infrastructure');

// Extract specific components
const { User } = auth;
const { fastMatchModel } = fastMatch;
const { MarketCounter } = marketprofiles;

// const { startTokenCleanup } = cleanup; // Отключено
const connectDB = dbConfig;
const logger = loggerConfig;
const { initializeKafka } = kafka;
const { metricsMiddleware, metricsEndpoint } = require('./core/middleware/metrics.middleware');

// Подключение к базе данных
connectDB();

// Инициализация Kafka с модулями
async function initializeKafkaService() {
  try {
    await initializeKafka();
    logger.info('Kafka Module Service инициализирован');
  } catch (error) {
    logger.error('Ошибка инициализации Kafka Module Service:', error);
    // Не завершаем процесс, так как приложение может работать без Kafka
  }
}

// Проверяем тестовый режим
if (process.argv.includes('--test')) {
  logger.info('Тестовый режим: проверка конфигурации...');
  console.log('✅ Конфигурация сервера корректна');
  process.exit(0);
}

// Инициализируем Kafka только если это не режим разработки или если Kafka включен
if (process.env.NODE_ENV !== 'development' || process.env.KAFKA_ENABLED === 'true') {
  initializeKafkaService();
} else {
  logger.info('Kafka отключен в режиме разработки');
}

// Обработчики событий подключения
mongoose.connection.on('connected', () => {
  console.log('MongoDB подключен');
});

mongoose.connection.on('error', (err) => {
  console.error('Ошибка подключения к MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB отключен');
});

// Метрики Prometheus
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

// Доступ к загруженным изображениям 
app.use('/uploads', express.static(path.join(__dirname, 'infrastructure', 'uploads')));
// Специально для голосовых сообщений
app.use('/uploads/audio', express.static(path.join(__dirname, 'infrastructure', 'uploads', 'audio')));
// Для обратной совместимости
app.use('/uploads/voice', express.static(path.join(__dirname, 'infrastructure', 'uploads', 'audio')));

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'infrastructure', 'uploads'));
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый формат файла. Разрешены только JPG, PNG, GIF и WEBP'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

// Функция для проверки валидности координат
const isValidCoordinates = (coords) => {
  const lat = parseFloat(coords.latitude);
  const lng = parseFloat(coords.longitude);
  
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
};

// Маршрут обновления геолокации
app.put('/api/users/:userId/location', async (req, res) => {
  console.log('Запрос на обновление геолокации:', req.params.userId, req.body);
  
  try {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'fail',
        message: 'Необходимо указать широту и долготу'
      });
    }
    
    const coords = { latitude, longitude };
    
    if (!isValidCoordinates(coords)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Недопустимые координаты'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Пользователь не найден'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    console.error('Ошибка при обновлении геолокации:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении геолокации'
    });
  }
});

// Маршрут обновления статуса пользователя
app.put('/api/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        status: 'fail',
        message: 'Необходимо указать статус'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Пользователь не найден'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    console.error('Ошибка при обновлении статуса:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении статуса'
    });
  }
});

// Запускаем очистку токенов (если настроено)
// Отключено для устранения ошибок таймаута
// if (process.env.TOKEN_CLEANUP_ENABLED !== 'false') {
//   const cleanupInterval = parseInt(process.env.TOKEN_CLEANUP_INTERVAL || '60', 10);
//   startTokenCleanup(cleanupInterval);
//   logger.info(`Token cleanup scheduled every ${cleanupInterval} minutes`);
// }

// Определение порта
const PORT = appConfig.port;

// Создание HTTP сервера
const httpServer = http.createServer(app);

// Запуск сервера в зависимости от окружения
if (appConfig.nodeEnv === 'production') {
  try {
    // Путь к SSL сертификатам
    const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'privkey.pem'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'), 'utf8');
    const ca = fs.readFileSync(path.join(__dirname, 'ssl', 'chain.pem'), 'utf8');

    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca
    };

    // Создание HTTPS сервера
    const httpsServer = https.createServer(credentials, app);

    // Запуск HTTPS сервера
    httpsServer.listen(443, () => {
      logger.info(`HTTPS Server running on port 443`);
    });

    // HTTP сервер только для перенаправления на HTTPS
    httpServer.listen(80, () => {
      logger.info(`HTTP Server running on port 80 (redirecting to HTTPS)`);
    });
  } catch (error) {
    logger.error(`SSL certificates not found, falling back to HTTP on port ${PORT}: ${error.message}`);
    // Если сертификаты не найдены, запускаем HTTP сервер на порту 3000
    httpServer.listen(PORT, () => {
      logger.info(`HTTP Server running on port ${PORT} (SSL certificates not found)`);
      logger.info(`Server URL: ${appConfig.baseUrl}`);
    });
  }
} else {
  // В режиме разработки используем только HTTP
  httpServer.listen(PORT, () => {
    logger.info(`Development server running on port ${PORT}`);
    logger.info(`Server URL: ${appConfig.baseUrl}`);
  });
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM получен, начинаем graceful shutdown...');
  try {
    const { kafkaModuleService } = require('./infrastructure/kafka/init');
    await kafkaModuleService.disconnect();
    logger.info('Kafka Module Service отключен');
  } catch (error) {
    logger.error('Ошибка отключения Kafka Module Service:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT получен, начинаем graceful shutdown...');
  try {
    const { kafkaModuleService } = require('./infrastructure/kafka/init');
    await kafkaModuleService.disconnect();
    logger.info('Kafka Module Service отключен');
  } catch (error) {
    logger.error('Ошибка отключения Kafka Module Service:', error);
  }
  process.exit(0);
});

module.exports = app;