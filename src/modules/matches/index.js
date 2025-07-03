// Matches module exports
const matchController = require('./controllers/match.controller');
const matchRoutes = require('./routes/match.routes');
const matchModel = require('./models/match.model');

const deleteMatchController = require('./delete_match/delete_match.controller');
const deleteMatchRoutes = require('./delete_match/delete_match.routes');

const getAllMatchesController = require('./get_all_matches/get_all_matches.controller');
const getAllMatchesRoutes = require('./get_all_matches/get_all_matches.routes');

const getUserLikesController = require('./get_user_likes/get_user_likes.controller');
const getUserLikesRoutes = require('./get_user_likes/get_user_likes.routes');

const idConverter = require('./utils/id-converter');

module.exports = {
  // Main matches
  matchController,
  matchRoutes,
  matchModel,
  
  // Delete match
  deleteMatchController,
  deleteMatchRoutes,
  
  // Get all matches
  getAllMatchesController,
  getAllMatchesRoutes,
  
  // Get user likes
  getUserLikesController,
  getUserLikesRoutes,
  
  // Utils
  idConverter
}; 