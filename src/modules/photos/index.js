// Photos module exports
const photosController = require('./photos.controller');
const photosMiddleware = require('./photos.middleware');
const photosRoutes = require('./photos.routes');
const photosService = require('./photos.service');
const photoUtils = require('./photo.utils');

const getPhotosController = require('./get_photos/get_photos.controller');
const getPhotosRoutes = require('./get_photos/get_photos.routes');

const MarketPhotosService = require('./MarketPhotosService');

const photoConverter = require('./photo_converter');

module.exports = {
  // Main photos
  photosController,
  photosMiddleware,
  photosRoutes,
  photosService,
  photoUtils,
  
  // Get photos
  getPhotosController,
  getPhotosRoutes,
  
  // Market photos
  MarketPhotosService,
  
  // Photo converter
  photoConverter
}; 