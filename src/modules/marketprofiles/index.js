// Market Profiles module exports
const marketCardRoutes = require('./routes/marketCardRoutes');
const MarketCard = require('./models/MarketCard');
const MarketCounter = require('./models/MarketCounter');

const getAllMarketDataController = require('./get_all_market_data/get_all_market_data.controller');
const getAllMarketDataRoutes = require('./get_all_market_data/get_all_market_data.routes');

const marketInitChatController = require('./market_init_chat/market_init_chat.controller');
const marketInitChatRoutes = require('./market_init_chat/market_init_chat.routes');

module.exports = {
  // Routes
  marketCardRoutes,
  
  // Models
  MarketCard,
  MarketCounter,
  
  // Get all market data
  getAllMarketDataController,
  getAllMarketDataRoutes,
  
  // Market init chat
  marketInitChatController,
  marketInitChatRoutes
}; 