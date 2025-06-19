const mongoose = require('mongoose');
const logger = require('./logger.config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating_app');
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // После успешного подключения инициализируем необходимые компоненты
    await initializeComponents();
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Инициализация необходимых компонентов после подключения к базе данных
 */
const initializeComponents = async () => {
  try {
    logger.info('Initializing database components...');
    
    // Инициализация счетчиков
    const { initCounter } = require('../auth/counters/models/Counter');
    const { initMarketCounter } = require('../marketprofiles/models/MarketCounter');
    
    await initCounter();
    logger.info('User counter initialized');
    
    await initMarketCounter();
    logger.info('Market counter initialized');
    
    // Обновление TTL индексов для FastMatch
    const FastMatch = require('../fast_match/models/fast_match.model');
    await FastMatch.ensureIndexes();
    logger.info('FastMatch TTL indexes updated');
    
    logger.info('All database components initialized successfully');
  } catch (error) {
    logger.error(`Error initializing database components: ${error.message}`);
    logger.error(error.stack);
    // Не завершаем процесс, так как основное подключение к БД уже установлено
  }
};

module.exports = connectDB; 