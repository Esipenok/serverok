const kafkaModuleService = require('./service');
const { loggerConfig } = require('../../core');
const logger = loggerConfig;

// Импорт обработчиков
const photoHandler = require('./handlers/photo-handler');
const matchHandler = require('./handlers/match-handler');
const filterHandler = require('./handlers/filter-handler');

/**
 * Инициализация Kafka с регистрацией всех обработчиков
 */
async function initializeKafka() {
  try {
    logger.info('Инициализация Kafka Module Service...');

    // Подключаемся к Kafka
    await kafkaModuleService.connect();

    // Регистрируем обработчики для каждого модуля
    logger.info('Регистрация обработчиков...');

    // КРИТИЧЕСКИ ВАЖНЫЕ МОДУЛИ
    kafkaModuleService.registerModuleHandler('users/photos', photoHandler.handle.bind(photoHandler));
    kafkaModuleService.registerModuleHandler('matches', matchHandler.handle.bind(matchHandler));

    // ВЫСОКИЙ ПРИОРИТЕТ - ФИЛЬТРЫ
    kafkaModuleService.registerModuleHandler('filter_fast_match', filterHandler.handle.bind(filterHandler));
    kafkaModuleService.registerModuleHandler('filter_finder', filterHandler.handle.bind(filterHandler));
    kafkaModuleService.registerModuleHandler('filter_market', filterHandler.handle.bind(filterHandler));
    kafkaModuleService.registerModuleHandler('filter_one_night', filterHandler.handle.bind(filterHandler));

    // СРЕДНИЙ ПРИОРИТЕТ - Базовые обработчики
    kafkaModuleService.registerModuleHandler('auth', createBasicHandler('auth'));
    kafkaModuleService.registerModuleHandler('fast_match', createBasicHandler('fast_match'));
    kafkaModuleService.registerModuleHandler('marketprofiles', createBasicHandler('marketprofiles'));
    kafkaModuleService.registerModuleHandler('notifications', createBasicHandler('notifications'));
    kafkaModuleService.registerModuleHandler('one_night', createBasicHandler('one_night'));
    kafkaModuleService.registerModuleHandler('qr', createBasicHandler('qr'));

    // НИЗКИЙ ПРИОРИТЕТ - Базовые обработчики
    kafkaModuleService.registerModuleHandler('complain', createBasicHandler('complain'));
    kafkaModuleService.registerModuleHandler('country', createBasicHandler('country'));
    kafkaModuleService.registerModuleHandler('invites', createBasicHandler('invites'));

    logger.info('✅ Kafka Module Service инициализирован успешно');
    return kafkaModuleService;

  } catch (error) {
    logger.error('❌ Ошибка инициализации Kafka Module Service:', error);
    throw error;
  }
}

/**
 * Создание базового обработчика для модулей
 */
function createBasicHandler(moduleName) {
  return async (operation, data, messageData) => {
    try {
      logger.info(`Обработка операции ${operation} для модуля ${moduleName}:`, data);
      
      // Здесь можно добавить специфичную логику для каждого модуля
      // Пока просто логируем операцию
      
      // Примеры специфичной логики:
      switch (moduleName) {
        case 'auth':
          await handleAuthOperation(operation, data);
          break;
        case 'fast_match':
          await handleFastMatchOperation(operation, data);
          break;
        case 'marketprofiles':
          await handleMarketOperation(operation, data);
          break;
        case 'notifications':
          await handleNotificationOperation(operation, data);
          break;
        case 'one_night':
          await handleOneNightOperation(operation, data);
          break;
        case 'qr':
          await handleQROperation(operation, data);
          break;
        case 'complain':
          await handleComplainOperation(operation, data);
          break;
        case 'country':
          await handleCountryOperation(operation, data);
          break;
        case 'invites':
          await handleInviteOperation(operation, data);
          break;
        default:
          logger.warn(`Неизвестный модуль: ${moduleName}`);
      }
      
    } catch (error) {
      logger.error(`Ошибка обработки операции ${operation} для модуля ${moduleName}:`, error);
      throw error;
    }
  };
}

// Базовые обработчики для каждого модуля
async function handleAuthOperation(operation, data) {
  logger.info(`Auth операция: ${operation}`, data);
  // Логика для auth операций
}

async function handleFastMatchOperation(operation, data) {
  logger.info(`Fast Match операция: ${operation}`, data);
  // Логика для fast match операций
}

async function handleMarketOperation(operation, data) {
  logger.info(`Market операция: ${operation}`, data);
  // Логика для market операций
}

async function handleNotificationOperation(operation, data) {
  logger.info(`Notification операция: ${operation}`, data);
  // Логика для notification операций
}

async function handleOneNightOperation(operation, data) {
  logger.info(`One Night операция: ${operation}`, data);
  // Логика для one night операций
}

async function handleQROperation(operation, data) {
  logger.info(`QR операция: ${operation}`, data);
  // Логика для QR операций
}

async function handleComplainOperation(operation, data) {
  logger.info(`Complain операция: ${operation}`, data);
  // Логика для complain операций
}

async function handleCountryOperation(operation, data) {
  logger.info(`Country операция: ${operation}`, data);
  // Логика для country операций
}

async function handleInviteOperation(operation, data) {
  logger.info(`Invite операция: ${operation}`, data);
  // Логика для invite операций
}

module.exports = {
  initializeKafka,
  kafkaModuleService
}; 