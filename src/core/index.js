// Core module exports
const appConfig = require('./config/app.config');
const dbConfig = require('./config/db.config');
const loggerConfig = require('./config/logger.config');

const metricsMiddleware = require('./middleware/metrics.middleware');

const ageCalculator = require('./utils/age-calculator');
const mongoSafety = require('./utils/mongo-safety');

const cleanup = require('./security/cleanup');
const securityConfig = require('./security/config');
const jwtConfig = require('./security/jwt.config');
const jwtMiddleware = require('./security/jwt.middleware');
const jwtUtils = require('./security/jwt.utils');
const BlacklistedToken = require('./security/models/BlacklistedToken');
const tokenService = require('./security/token.service');

// Import middleware from auth module
const rateLimiter = require('../modules/auth/middleware/rate-limiter');
const errorHandler = require('../modules/auth/middleware/error.middleware');
const validationMiddleware = require('../modules/auth/middleware/validation.middleware');
const httpsMiddleware = require('../modules/auth/middleware/https.middleware');

module.exports = {
  // Config
  appConfig,
  dbConfig,
  loggerConfig,
  
  // Middleware
  metricsMiddleware,
  rateLimiter,
  errorHandler,
  validationMiddleware,
  httpsMiddleware,
  
  // Utils
  ageCalculator,
  mongoSafety,
  
  // Security
  cleanup,
  securityConfig,
  jwtConfig,
  jwtMiddleware,
  jwtUtils,
  BlacklistedToken,
  tokenService
}; 