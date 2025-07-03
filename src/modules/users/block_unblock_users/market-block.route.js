const express = require('express');
const router = express.Router();
const marketBlockController = require('./market-block.controller');

// Блокировка пользователя в маркете
router.post('/', marketBlockController.blockMarketUser);

// Разблокировка пользователя в маркете
router.post('/unblock', marketBlockController.unblockMarketUser);

// Получение списка заблокированных пользователей в маркете
router.get('/:userId/blocked-market-users', marketBlockController.getBlockedMarketUsers);

module.exports = router; 