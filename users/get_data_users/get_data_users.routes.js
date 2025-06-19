const express = require('express');
const router = express.Router();
const { getLimitedUserData, getLimitedUsers } = require('./get_data_users.controller');

// Получить данные одного пользователя
router.get('/:userId', getLimitedUserData);

// Получить данные нескольких пользователей
router.post('/multiple', getLimitedUsers);

module.exports = router; 