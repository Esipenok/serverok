const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { errorHandler } = require('./auth/middleware/error.middleware');
const { corsOptions, helmetConfig, cookieParser } = require('./security/config');
const { standardLimiter } = require('./auth/middleware/rate-limiter');
const { protectFromInjection } = require('./auth/middleware/validation.middleware');
const { redirectToHttps, addHstsHeader } = require('./auth/middleware/https.middleware');
const appConfig = require('./config/app.config');
const authRoutes = require('./auth/routes/auth.routes');
const userRoutes = require('./users/routes/user.routes');
const photosRoutes = require('./users/photos/photos.routes');
const getPhotosRoutes = require('./users/photos/get_photos');
const matchRoutes = require('./matches/routes/match.routes');
const fastMatchRoutes = require('./filter_fast_match/routes');
const fastMatchMainRoutes = require('./fast_match/routes/fast_match.routes');
const filterMarketRoutes = require('./filter_market/routes');
const marketCardRoutes = require('./marketprofiles/routes/marketCardRoutes');
const blockUnblockRoutes = require('./users/block_unblock_users');
const getDataUsersRoutes = require('./users/get_data_users/get_data_users.routes');
const qrRoutes = require('./qr/routes/qrRoutes');
const filterFinderRoutes = require('./filter_finder/routes');
const complaintRoutes = require('./complain/routes/complaintRoutes');
const oneNightRoutes = require('./filter_one_night/routes');
const oneNightInviteRoutes = require('./one_night/routes/one_night.routes');
const oneNightStatusRoutes = require('./one_night/one_night_status/one_night_status.routes');
const deleteAllUserDataRoutes = require('./users/delete_all_user/delete_all_user.routes');

const app = express();

// Настройка доверия к прокси для работы с Nginx
app.set('trust proxy', true);

// Перенаправление HTTP на HTTPS в production
if (process.env.NODE_ENV === 'production') {
  app.use(redirectToHttps);
  app.use(addHstsHeader);
}

// Базовые middleware безопасности
app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(cookieParser());

// Применяем стандартный rate limiter для всех маршрутов
// Специфические лимитеры применяются в конкретных маршрутах
app.use(standardLimiter);

// Защита от инъекций для всех маршрутов
app.use(protectFromInjection);

// Маршрут для удаления пользователя (размещаем в самом начале)
app.use('/api/delete-all-user-data', (req, res, next) => {
  console.log('[App] Запрос к /api/delete-all-user-data:', req.method, req.url);
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Требуется авторизация'
    });
  }
  console.log('[App] Авторизация прошла успешно для /api/delete-all-user-data');
  next();
}, deleteAllUserDataRoutes);

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log('[Request] Received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  next();
});

// Дополнительные проверки безопасности для маршрутов аутентификации
app.use('/api/auth', (req, res, next) => {
  // Проверяем Content-Type
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      status: 'error',
      message: 'Поддерживается только Content-Type: application/json'
    });
  }

  // Проверяем наличие необходимых заголовков
  if (req.method === 'POST') {
    const requiredHeaders = ['content-type', 'user-agent'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Отсутствуют обязательные заголовки: ${missingHeaders.join(', ')}`
      });
    }
  }

  next();
});

// Routes
app.use('/api/auth', authRoutes);

// Проверка токена для маршрутов /api/users/
app.use('/api/users', (req, res, next) => {
  console.log('[App] Запрос к /api/users:', req.method, req.url);
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Требуется авторизация'
    });
  }
  console.log('[App] Авторизация прошла успешно для /api/users');
  next();
});

// Маршруты для получения фотографий разных размеров
app.use('/api/images', getPhotosRoutes);

// Статические файлы (фотографии)
app.use('/uploads', express.static('uploads'));

// Логирование конфигурации сервера
console.log('[Server] Configuration:', {
  environment: appConfig.nodeEnv,
  baseUrl: appConfig.baseUrl,
  staticUrl: appConfig.staticUrl,
  port: appConfig.port
});

// Health check endpoint для проверки работоспособности API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API работает' });
});

// Остальные маршруты
app.use('/api/users', userRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/fast-match', fastMatchRoutes);
app.use('/api/fast-match-main', fastMatchMainRoutes);
app.use('/api/filter-market', filterMarketRoutes);
app.use('/api/market-cards', marketCardRoutes);
app.use('/api', blockUnblockRoutes);
app.use('/api/limited-users', getDataUsersRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/filter-finder', filterFinderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/filter-one-night', oneNightRoutes);
app.use('/api/one-night', oneNightInviteRoutes);
app.use('/api/one-night-status', oneNightStatusRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Маршрут не найден'
  });
});

module.exports = app; 