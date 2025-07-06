const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Core imports
const { 
  appConfig, 
  errorHandler: errorHandlerModule, 
  securityConfig, 
  rateLimiter, 
  validationMiddleware, 
  httpsMiddleware 
} = require('./core');

// Module imports
const { 
  auth, 
  users, 
  photos, 
  matches, 
  filters, 
  fastMatch, 
  oneNight, 
  marketprofiles, 
  complain, 
  invites, 
  qr, 
  deleteAllData
} = require('./modules');

// Extract specific routes and middleware
const { authRoutes } = auth;
const { userRoutes, blockRoute, marketBlockRoute, getDataUsersRoutes } = users;
const { photosRoutes, getPhotosRoutes } = photos;
const { matchRoutes } = matches;
const { filterFastMatch, filterFinder, filterMarket, filterOneNight } = filters;
const { fastMatchRoutes } = fastMatch;
const { oneNightRoutes, oneNightStatusRoutes } = oneNight;
const { marketCardRoutes } = marketprofiles;
const { complaintRoutes } = complain;
const { inviteRoutes } = invites;
const { qrRoutes } = qr;
const { deleteAllDataRoutes } = deleteAllData;

// Extract filter routes
const fastMatchFilterRoutes = filterFastMatch.routes;
const filterFinderRoutes = filterFinder.routes;
const filterMarketRoutes = filterMarket.routes;
const oneNightFilterRoutes = filterOneNight.routes;

// Extract middleware
const { corsOptions, helmetConfig, cookieParser } = securityConfig;
const { standardLimiter } = rateLimiter;
const { protectFromInjection } = validationMiddleware;
const { redirectToHttps, addHstsHeader } = httpsMiddleware;

const { metricsMiddleware, metricsEndpoint } = require('./core/middleware/metrics.middleware');

const app = express();

// Настройка доверия к прокси для работы с Nginx (исправлено для rate limiter)
app.set('trust proxy', 1); // Доверяем только первому прокси

// Проверяем наличие SSL сертификатов
const sslCertExists = fs.existsSync(path.join(__dirname, 'ssl', 'cert.pem'));

// Перенаправление HTTP на HTTPS в production только если есть SSL сертификаты
if (process.env.NODE_ENV === 'production' && sslCertExists) {
  app.use(redirectToHttps);
  app.use(addHstsHeader);
  console.log('✅ SSL сертификаты найдены, HTTPS редирект включен');
} else if (process.env.NODE_ENV === 'production' && !sslCertExists) {
  console.log('⚠️  SSL сертификаты не найдены, HTTPS редирект отключен');
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
app.use('/uploads', express.static(path.join(__dirname, 'infrastructure', 'uploads')));

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

app.use('/api/fast-match', fastMatchFilterRoutes);
app.use('/api/fast-match-main', fastMatchRoutes);
app.use('/api/filter-market', filterMarketRoutes);
app.use('/api/market-cards', marketCardRoutes);
app.use('/api', blockRoute);
app.use('/api', marketBlockRoute);
app.use('/api/limited-users', getDataUsersRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/filter-finder', filterFinderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/filter-one-night', oneNightFilterRoutes);
app.use('/api/one-night', oneNightRoutes);
app.use('/api/one-night-status', oneNightStatusRoutes);

// Проверка токена для маршрутов /api/invites/
app.use('/api/invites', (req, res, next) => {
  console.log('[App] Запрос к /api/invites:', req.method, req.url);
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Требуется авторизация'
    });
  }
  console.log('[App] Авторизация прошла успешно для /api/invites');
  next();
});

app.use('/api/invites', inviteRoutes);

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
}, deleteAllDataRoutes);



app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

// Error handling
app.use(errorHandlerModule.errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Маршрут не найден'
  });
});



module.exports = app; 