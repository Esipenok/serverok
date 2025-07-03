// Auth module exports
const authController = require('./controllers/auth.controller');
const authRoutes = require('./routes/auth.routes');

const adminAuth = require('./middleware/adminAuth');
const auth = require('./middleware/auth');
const authMiddleware = require('./middleware/auth.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const httpsMiddleware = require('./middleware/https.middleware');
const rateLimiter = require('./middleware/rate-limiter');
const validationMiddleware = require('./middleware/validation.middleware');

const User = require('./models/User');
const Counter = require('./counters/models/Counter');

module.exports = {
  // Controllers
  authController,
  
  // Routes
  authRoutes,
  
  // Middleware
  adminAuth,
  auth,
  authMiddleware,
  errorMiddleware,
  httpsMiddleware,
  rateLimiter,
  validationMiddleware,
  
  // Models
  User,
  Counter
}; 