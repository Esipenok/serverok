const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

// Временный middleware для тестирования - ничего не проверяет
const dummyAuth = (req, res, next) => {
  // Установим фиктивное значение userId для тестирования
  req.userId = req.body.userId || req.query.userId || '123456789012';
  next();
};

/**
 * Маршруты для работы с QR-кодами
 */

// Получить все QR-коды пользователя
router.get('/user/:userId', dummyAuth, qrController.getUserQrCodes);

// Получить данные QR-кода для клиентской генерации
router.get('/data/:qrId', qrController.getQrData);

// Создать постоянный QR-код для пользователя
router.post('/permanent', dummyAuth, qrController.createPermanentQr);

// Создать передаваемый QR-код
router.post('/transferable', dummyAuth, qrController.createTransferableQr);

// Привязать передаваемый QR-код к пользователю
router.post('/claim/:qrId', dummyAuth, qrController.claimTransferableQr);

// Сканировать QR-код
router.get('/scan/:qrId/:userId', dummyAuth, qrController.scanQr);

// Удалить QR-код
router.delete('/:qrId', dummyAuth, qrController.deleteQrCode);

// Создать партию передаваемых QR-кодов (только для админов)
router.post('/batch/transferable', dummyAuth, qrController.generateTransferableBatch);

// Генерировать пустой QR-код
router.post('/generate-empty', dummyAuth, qrController.generateEmptyQr);

// Отвязать передаваемый QR-код от пользователя
router.post('/unlink/:qrId', dummyAuth, qrController.unlinkTransferableQr);

// Удалить отсканированного пользователя из QR списка
router.delete('/remove-scanned-user/:userId/:scannedUserId', dummyAuth, qrController.removeScannedUser);

module.exports = router; 