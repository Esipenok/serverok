const express = require('express');
const router = express.Router();
const heartQrController = require('./heartQrController');

// Получить доступные стили QR-кодов с сердечками
router.get('/styles', heartQrController.getHeartQrStyles);

// Генерировать QR-код с сердечком по QR ID
router.get('/image/:qrId', heartQrController.generateHeartQrImage);

// Генерировать QR-код с сердечком для пользователя
router.get('/user/:userId', heartQrController.generateUserHeartQr);

// Тестировать генерацию QR-кода с сердечком
router.post('/test', heartQrController.testHeartQrGeneration);

module.exports = router; 