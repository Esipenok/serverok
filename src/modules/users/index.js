// Users module exports
const userController = require('./controllers/user.controller');
const userRoutes = require('./routes/user.routes');

const blockController = require('./block_unblock_users/block.controller');
const blockRoute = require('./block_unblock_users/block.route');
const marketBlockController = require('./block_unblock_users/market-block.controller');
const marketBlockRoute = require('./block_unblock_users/market-block.route');

const getDataUsersController = require('./get_data_users/get_data_users.controller');
const getDataUsersRoutes = require('./get_data_users/get_data_users.routes');

module.exports = {
  // Controllers
  userController,
  
  // Routes
  userRoutes,
  
  // Block/Unblock
  blockController,
  blockRoute,
  marketBlockController,
  marketBlockRoute,
  
  // Get Data Users
  getDataUsersController,
  getDataUsersRoutes
}; 