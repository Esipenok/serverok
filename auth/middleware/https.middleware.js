/**
 * Middleware для перенаправления HTTP на HTTPS
 */
const redirectToHttps = (req, res, next) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  if (!isSecure && process.env.NODE_ENV === 'production') {
    const host = req.headers.host;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  
  next();
};

/**
 * Middleware для добавления заголовка Strict-Transport-Security
 */
const addHstsHeader = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  next();
};

module.exports = {
  redirectToHttps,
  addHstsHeader
}; 