// Главный файл для экспорта всех компонентов системы счетчиков лайков

const likeCounterService = require('./like-counter.service');
const likeCounterController = require('./like-counter.controller');
const likeCounterRoutes = require('./like-counter.routes');

module.exports = {
  likeCounterService,
  likeCounterController,
  likeCounterRoutes
}; 