const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Настройки CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 часа
};

// Настройки rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100, // максимум 100 запросов с одного IP
  message: 'Too many requests from this IP, please try again later. Stop spamming! Take a break!'
});

// Улучшенные настройки helmet для мобильного приложения
const helmetConfig = {
  // Content Security Policy - определяет, откуда могут загружаться ресурсы
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://storage.googleapis.com"], // Разрешаем скрипты из Google Storage
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Разрешаем стили из Google Fonts
      imgSrc: ["'self'", "data:", "https:", "blob:", "http:"], // Разрешаем изображения из любых источников
      connectSrc: ["'self'", "https:", "http:"], // Разрешаем соединения с любыми источниками
      fontSrc: ["'self'", "https://fonts.gstatic.com"], // Разрешаем шрифты из Google Fonts
      objectSrc: ["'none'"], // Запрещаем объекты (Flash и т.д.)
      mediaSrc: ["'self'", "https:", "http:"], // Разрешаем медиа из любых источников
      frameSrc: ["'none'"], // Запрещаем фреймы
      // В продакшене включаем автоматическое обновление HTTP до HTTPS
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  // Cross-Origin Embedder Policy - контролирует загрузку ресурсов с других источников
  crossOriginEmbedderPolicy: { policy: "credentialless" }, // Менее строгий режим для мобильных API
  // Cross-Origin Opener Policy - контролирует, как окна могут взаимодействовать друг с другом
  crossOriginOpenerPolicy: { policy: "same-origin" },
  // Cross-Origin Resource Policy - контролирует, какие сайты могут загружать ресурсы
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Разрешаем загрузку ресурсов с других источников
  // DNS Prefetch Control - контролирует предварительное разрешение DNS
  dnsPrefetchControl: { allow: false },
  // Frameguard - защита от clickjacking
  frameguard: { action: "deny" },
  // Hide Powered By - скрывает информацию о сервере
  hidePoweredBy: true,
  // HSTS - включаем в production
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 год
    includeSubDomains: true,
    preload: true
  } : false,
  // No Sniff - предотвращает MIME-sniffing
  noSniff: true,
  // Referrer Policy - контролирует, какая информация о реферере передается
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // XSS Filter - защита от XSS-атак
  xssFilter: true,
  // Запрещаем кэширование для API-запросов
  noCache: true
};

module.exports = {
  corsOptions,
  limiter,
  helmetConfig,
  cookieParser
}; 