// Fast Match module exports
const fastMatchController = require('./controllers/fast_match.controller');
const fastMatchRoutes = require('./routes/fast_match.routes');
const fastMatchModel = require('./models/fast_match.model');

const fastMatchAcceptController = require('./match/fast_match_accept.controller');

const idConverter = require('./utils/id-converter');

module.exports = {
  // Controllers
  fastMatchController,
  fastMatchAcceptController,
  
  // Routes
  fastMatchRoutes,
  
  // Models
  fastMatchModel,
  
  // Utils
  idConverter
}; 