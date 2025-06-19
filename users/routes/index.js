const express = require('express');
const router = express.Router();
const blockRoutes = require('./block.route');

// Подключаем маршруты блокировки
router.use('/', blockRoutes);

module.exports = router; 