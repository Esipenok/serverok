// QR module exports
const qrController = require('./controllers/qrController');
const qrRoutes = require('./routes/qrRoutes');
const QrCode = require('./models/QrCode');

module.exports = {
  qrController,
  qrRoutes,
  QrCode
}; 