/**
 * Middleware для перенаправления HTTP на HTTPS
 * В настоящее время отключено для работы с HTTP
 */
const redirectToHttps = (req, res, next) => {
  // Отключаем перенаправление на HTTPS
  next();
};

/**
 * Middleware для добавления заголовка Strict-Transport-Security
 * В настоящее время отключено для работы с HTTP
 */
const addHstsHeader = (req, res, next) => {
  // Отключаем добавление заголовка HSTS
  next();
};

module.exports = {
  redirectToHttps,
  addHstsHeader
}; 