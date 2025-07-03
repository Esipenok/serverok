const express = require('express');
const router = express.Router();
const blockRoutes = require('./block.route');
const marketBlockRoutes = require('./market-block.route');

// Используем маршруты для блокировки/разблокировки
router.use('/block', blockRoutes);
router.use('/market/block', marketBlockRoutes);

module.exports = router; 