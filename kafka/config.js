const logger = require('../config/logger.config');

// Конфигурация Kafka для всех модулей приложения
const kafkaConfig = {
  // Основные настройки подключения
  client: {
    clientId: 'willowe-app',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    retry: {
      initialRetryTime: 100,
      retries: 8
    },
    connectionTimeout: 3000,
    authenticationTimeout: 1000
  },

  // Настройки producer'а
  producer: {
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
    maxInFlightRequests: 5
  },

  // Настройки consumer'а
  consumer: {
    groupId: 'willowe-consumers',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    rebalanceTimeout: 60000,
    maxWaitTimeInMs: 5000,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  },

  // Топики по приоритетам
  topics: {
    // КРИТИЧЕСКИ ВАЖНЫЕ (Высший приоритет)
    critical: {
      'photo-operations': {
        partitions: 8,
        retention: '1h',
        priority: 'critical',
        description: 'Операции с фотографиями (загрузка, обработка, отображение)'
      },
      'match-operations': {
        partitions: 6,
        retention: '24h',
        priority: 'critical',
        description: 'Создание и управление мэтчами'
      }
    },

    // ВЫСОКИЙ ПРИОРИТЕТ
    high: {
      'filter-operations': {
        partitions: 10,
        retention: '30m',
        priority: 'high',
        description: 'Все операции фильтрации (fast_match, finder, market, one_night)'
      }
    },

    // СРЕДНИЙ ПРИОРИТЕТ
    medium: {
      'auth-operations': {
        partitions: 4,
        retention: '7d',
        priority: 'medium',
        description: 'Регистрация, авторизация, аутентификация'
      },
      'fast-match-operations': {
        partitions: 5,
        retention: '1h',
        priority: 'medium',
        description: 'Операции fast match'
      },
      'market-operations': {
        partitions: 4,
        retention: '24h',
        priority: 'medium',
        description: 'Операции с market профилями'
      },
      'notification-operations': {
        partitions: 6,
        retention: '7d',
        priority: 'medium',
        description: 'Отправка уведомлений'
      },
      'one-night-operations': {
        partitions: 4,
        retention: '1h',
        priority: 'medium',
        description: 'Операции one night'
      },
      'qr-operations': {
        partitions: 3,
        retention: '24h',
        priority: 'medium',
        description: 'Генерация и обработка QR кодов'
      }
    },

    // НИЗКИЙ ПРИОРИТЕТ
    low: {
      'complain-operations': {
        partitions: 2,
        retention: '30d',
        priority: 'low',
        description: 'Жалобы пользователей'
      },
      'country-operations': {
        partitions: 2,
        retention: '7d',
        priority: 'low',
        description: 'Определение страны пользователя'
      },
      'invite-operations': {
        partitions: 2,
        retention: '7d',
        priority: 'low',
        description: 'Приглашения пользователей'
      }
    },

    // АНАЛИТИКА И МОНИТОРИНГ
    analytics: {
      'analytics-events': {
        partitions: 3,
        retention: '90d',
        priority: 'analytics',
        description: 'Аналитические события'
      },
      'system-metrics': {
        partitions: 2,
        retention: '30d',
        priority: 'analytics',
        description: 'Системные метрики'
      }
    }
  },

  // Маппинг модулей на топики
  moduleMapping: {
    // КРИТИЧЕСКИ ВАЖНЫЕ
    'users/photos': 'photo-operations',
    'matches': 'match-operations',
    
    // ВЫСОКИЙ ПРИОРИТЕТ
    'filter_fast_match': 'filter-operations',
    'filter_finder': 'filter-operations',
    'filter_market': 'filter-operations',
    'filter_one_night': 'filter-operations',
    
    // СРЕДНИЙ ПРИОРИТЕТ
    'auth': 'auth-operations',
    'fast_match': 'fast-match-operations',
    'marketprofiles': 'market-operations',
    'notifications': 'notification-operations',
    'one_night': 'one-night-operations',
    'qr': 'qr-operations',
    
    // НИЗКИЙ ПРИОРИТЕТ
    'complain': 'complain-operations',
    'country': 'country-operations',
    'invites': 'invite-operations'
  },

  // Настройки retry для разных типов операций
  retryConfig: {
    critical: {
      maxRetries: 5,
      initialDelay: 100,
      maxDelay: 5000
    },
    high: {
      maxRetries: 3,
      initialDelay: 200,
      maxDelay: 3000
    },
    medium: {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 2000
    },
    low: {
      maxRetries: 1,
      initialDelay: 1000,
      maxDelay: 1000
    }
  },

  // Настройки мониторинга
  monitoring: {
    healthCheckInterval: 30000, // 30 секунд
    metricsCollectionInterval: 60000, // 1 минута
    alertThresholds: {
      lag: 1000, // Максимальный lag
      errorRate: 0.05, // 5% ошибок
      latency: 5000 // 5 секунд
    }
  }
};

// Функция для получения топика по модулю
function getTopicForModule(moduleName) {
  return kafkaConfig.moduleMapping[moduleName] || 'analytics-events';
}

// Функция для получения приоритета по топику
function getPriorityForTopic(topicName) {
  for (const [priority, topics] of Object.entries(kafkaConfig.topics)) {
    if (topics[topicName]) {
      return topics[topicName].priority;
    }
  }
  return 'analytics';
}

// Функция для получения конфигурации retry по приоритету
function getRetryConfig(priority) {
  return kafkaConfig.retryConfig[priority] || kafkaConfig.retryConfig.medium;
}

// Функция для логирования операций
function logKafkaOperation(operation, topic, priority, data = {}) {
  logger.info(`Kafka ${operation}`, {
    topic,
    priority,
    timestamp: new Date().toISOString(),
    ...data
  });
}

module.exports = {
  kafkaConfig,
  getTopicForModule,
  getPriorityForTopic,
  getRetryConfig,
  logKafkaOperation
}; 