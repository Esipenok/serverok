const express = require('express');
const router = express.Router();
const { getAllMarketData } = require('./get_all_market_data.controller');

// POST /api/market/get-all-market-data
router.post('/get-all-market-data', getAllMarketData);

module.exports = router; 