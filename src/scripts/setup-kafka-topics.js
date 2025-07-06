const { Kafka } = require('kafkajs');
const logger = require('../src/core/config/logger.config');

// Конфигурация Kafka
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'dating_app_setup',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const admin = kafka.admin();

// Конфигурация топиков по приоритетам
const topicsConfig = {
  // КРИТИЧНО (⭐⭐⭐⭐⭐) - максимальная производительность
  'photos': {
    numPartitions: 8,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '3600000' }, // 1 час
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'matches': {
    numPartitions: 6,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '86400000' }, // 24 часа
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },

  // ВЫСОКИЙ (⭐⭐⭐⭐) - быстрая обработка
  'filters': {
    numPartitions: 10,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '1800000' }, // 30 минут
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },

  // СРЕДНИЙ (⭐⭐⭐) - баланс производительности
  'auth': {
    numPartitions: 4,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 дней
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'fast_match': {
    numPartitions: 4,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '3600000' }, // 1 час
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'marketprofiles': {
    numPartitions: 4,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 дней
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'one_night': {
    numPartitions: 4,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '3600000' }, // 1 час
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'qr': {
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 дней
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },

  // НИЗКИЙ (⭐⭐) - базовая функциональность
  'complain': {
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 дней
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'country': {
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 дней
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  'invites': {
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 дней
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'compression.type', value: 'lz4' }
    ]
  }
};

async function setupKafkaTopics() {
  try {
    logger.info('🚀 Начинаем настройку Kafka топиков...');
    
    // Подключаемся к Kafka
    await admin.connect();
    logger.info('✅ Подключение к Kafka установлено');

    // Получаем список существующих топиков
    const existingTopics = await admin.listTopics();
    logger.info(`📋 Найдено существующих топиков: ${existingTopics.length}`);

    // Создаем топики
    const topicsToCreate = [];
    
    for (const [topicName, config] of Object.entries(topicsConfig)) {
      if (!existingTopics.includes(topicName)) {
        topicsToCreate.push({
          topic: topicName,
          ...config
        });
        logger.info(`📝 Подготовлен топик: ${topicName} (${config.numPartitions} партиций)`);
      } else {
        logger.info(`✅ Топик уже существует: ${topicName}`);
      }
    }

    if (topicsToCreate.length > 0) {
      logger.info(`🔧 Создаем ${topicsToCreate.length} новых топиков...`);
      
      await admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true
      });
      
      logger.info('✅ Все топики успешно созданы!');
    } else {
      logger.info('✅ Все необходимые топики уже существуют');
    }

    // Выводим итоговую информацию
    const finalTopics = await admin.listTopics();
    logger.info(`📊 Итого топиков в системе: ${finalTopics.length}`);
    
    // Получаем детальную информацию о топиках
    const topicMetadata = await admin.fetchTopicMetadata({
      topics: Object.keys(topicsConfig)
    });
    
    logger.info('📋 Детальная информация о топиках:');
    topicMetadata.topics.forEach(topic => {
      logger.info(`  - ${topic.name}: ${topic.partitions.length} партиций`);
    });

  } catch (error) {
    logger.error('❌ Ошибка при настройке Kafka топиков:', error);
    throw error;
  } finally {
    await admin.disconnect();
    logger.info('🔌 Отключение от Kafka');
  }
}

// Функция для проверки статуса топиков
async function checkTopicsStatus() {
  try {
    await admin.connect();
    
    const topics = await admin.listTopics();
    const metadata = await admin.fetchTopicMetadata({ topics });
    
    logger.info('📊 Статус топиков Kafka:');
    metadata.topics.forEach(topic => {
      const config = topicsConfig[topic.name];
      const priority = config ? 
        (config.numPartitions >= 8 ? '⭐⭐⭐⭐⭐ КРИТИЧНО' :
         config.numPartitions >= 6 ? '⭐⭐⭐⭐ ВЫСОКИЙ' :
         config.numPartitions >= 4 ? '⭐⭐⭐ СРЕДНИЙ' : '⭐⭐ НИЗКИЙ') : '❓ НЕИЗВЕСТНО';
      
      logger.info(`  ${topic.name}: ${topic.partitions.length} партиций (${priority})`);
    });
    
  } catch (error) {
    logger.error('❌ Ошибка при проверке статуса топиков:', error);
  } finally {
    await admin.disconnect();
  }
}

// Экспортируем функции
module.exports = {
  setupKafkaTopics,
  checkTopicsStatus
};

// Если скрипт запущен напрямую
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkTopicsStatus();
  } else {
    setupKafkaTopics()
      .then(() => {
        logger.info('🎉 Настройка Kafka завершена успешно!');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('💥 Ошибка при настройке Kafka:', error);
        process.exit(1);
      });
  }
} 