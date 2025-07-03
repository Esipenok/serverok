// Kafka infrastructure exports
const config = require('./config');
const init = require('./init');
const service = require('./service');
const kafkaModuleService = require('./service');

const filterHandler = require('./handlers/filter-handler');
const matchHandler = require('./handlers/match-handler');
const photoHandler = require('./handlers/photo-handler');

module.exports = {
  config,
  init,
  service,
  filterHandler,
  matchHandler,
  photoHandler,
  kafkaModuleService,
  initializeKafka: init.initializeKafka
}; 