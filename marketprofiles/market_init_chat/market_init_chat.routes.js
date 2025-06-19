const express = require('express');
const router = express.Router();
const { initiateChat } = require('./market_init_chat.controller');

// POST /api/market/initiate-chat
router.post('/initiate-chat', initiateChat);

module.exports = router; 