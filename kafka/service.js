const { Kafka } = require('kafkajs');
const { kafkaConfig, getTopicForModule, getPriorityForTopic, getRetryConfig, logKafkaOperation } = require('./config');
const logger = require('../config/logger.config');

class KafkaModuleService {
  constructor() {
    this.kafka = new Kafka(kafkaConfig.client);
    this.producer = this.kafka.producer(kafkaConfig.producer);
    this.consumer = this.kafka.consumer(kafkaConfig.consumer);
    this.isConnected = false;
    this.messageHandlers = new Map();
  }

  /**
   * Подключение к Kafka
   */
  async connect() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka Module Service подключен');
      
      // Запускаем обработчик сообщений
      await this.startMessageHandler();
      
    } catch (error) {
      logger.error('Ошибка подключения Kafka Module Service:', error);
      throw error;
    }
  }

  /**
   * Отключение от Kafka
   */
  async disconnect() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Module Service отключен');
    } catch (error) {
      logger.error('Ошибка отключения Kafka Module Service:', error);
    }
  }

  /**
   * Отправка сообщения по модулю
   */
  async sendModuleMessage(moduleName, operation, data, priority = null) {
    if (!this.isConnected) {
      logger.warn('Kafka не подключен, отправка сообщения пропущена');
      return false;
    }

    try {
      const topic = getTopicForModule(moduleName);
      const messagePriority = priority || getPriorityForTopic(topic);
      const retryConfig = getRetryConfig(messagePriority);

      const messageWithMetadata = {
        module: moduleName,
        operation: operation,
        data: data,
        timestamp: Date.now(),
        priority: messagePriority,
        source: 'willowe-app'
      };

      await this.producer.send({
        topic: topic,
        messages: [
          {
            key: `${moduleName}-${operation}`,
            value: JSON.stringify(messageWithMetadata),
            headers: {
              priority: messagePriority,
              module: moduleName,
              operation: operation
            }
          }
        ]
      });

      logKafkaOperation('SEND', topic, messagePriority, {
        module: moduleName,
        operation: operation
      });

      return true;
    } catch (error) {
      logger.error(`Ошибка отправки сообщения для модуля ${moduleName}:`, error);
      return false;
    }
  }

  /**
   * Регистрация обработчика для модуля
   */
  registerModuleHandler(moduleName, handler) {
    this.messageHandlers.set(moduleName, handler);
    logger.info(`Обработчик зарегистрирован для модуля: ${moduleName}`);
  }

  /**
   * Запуск обработчика сообщений
   */
  async startMessageHandler() {
    try {
      // Подписываемся на все топики
      const allTopics = [];
      Object.values(kafkaConfig.topics).forEach(priorityGroup => {
        Object.keys(priorityGroup).forEach(topic => {
          allTopics.push(topic);
        });
      });

      for (const topic of allTopics) {
        await this.consumer.subscribe({ 
          topic: topic, 
          fromBeginning: false 
        });
      }

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            await this.processMessage(topic, message);
          } catch (error) {
            logger.error('Ошибка обработки сообщения:', error);
          }
        }
      });

      logger.info('Обработчик сообщений Kafka Module Service запущен');
    } catch (error) {
      logger.error('Ошибка запуска обработчика сообщений:', error);
    }
  }

  /**
   * Обработка входящего сообщения
   */
  async processMessage(topic, message) {
    try {
      const messageData = JSON.parse(message.value.toString());
      const { module, operation, data, priority } = messageData;
      
      logKafkaOperation('RECEIVE', topic, priority, {
        module: module,
        operation: operation
      });

      // Находим обработчик для модуля
      const handler = this.messageHandlers.get(module);
      if (handler) {
        await handler(operation, data, messageData);
        logger.info(`Сообщение ${operation} для модуля ${module} обработано`);
      } else {
        logger.warn(`Обработчик не найден для модуля: ${module}`);
      }

    } catch (error) {
      logger.error('Ошибка обработки сообщения:', error);
    }
  }

  /**
   * Специализированные методы для каждого модуля
   */

  // КРИТИЧЕСКИ ВАЖНЫЕ МОДУЛИ
  async sendPhotoOperation(operation, data) {
    return this.sendModuleMessage('users/photos', operation, data, 'critical');
  }

  async sendMatchOperation(operation, data) {
    return this.sendModuleMessage('matches', operation, data, 'critical');
  }

  // ВЫСОКИЙ ПРИОРИТЕТ
  async sendFilterOperation(moduleName, operation, data) {
    return this.sendModuleMessage(moduleName, operation, data, 'high');
  }

  // СРЕДНИЙ ПРИОРИТЕТ
  async sendAuthOperation(operation, data) {
    return this.sendModuleMessage('auth', operation, data, 'medium');
  }

  async sendFastMatchOperation(operation, data) {
    return this.sendModuleMessage('fast_match', operation, data, 'medium');
  }

  async sendMarketOperation(operation, data) {
    return this.sendModuleMessage('marketprofiles', operation, data, 'medium');
  }

  async sendNotificationOperation(operation, data) {
    return this.sendModuleMessage('notifications', operation, data, 'medium');
  }

  async sendOneNightOperation(operation, data) {
    return this.sendModuleMessage('one_night', operation, data, 'medium');
  }

  async sendQROperation(operation, data) {
    return this.sendModuleMessage('qr', operation, data, 'medium');
  }

  // НИЗКИЙ ПРИОРИТЕТ
  async sendComplainOperation(operation, data) {
    return this.sendModuleMessage('complain', operation, data, 'low');
  }

  async sendCountryOperation(operation, data) {
    return this.sendModuleMessage('country', operation, data, 'low');
  }

  async sendInviteOperation(operation, data) {
    return this.sendModuleMessage('invites', operation, data, 'low');
  }

  // АНАЛИТИКА
  async sendAnalyticsEvent(eventType, eventData) {
    return this.sendModuleMessage('analytics', eventType, eventData, 'analytics');
  }

  async sendSystemMetric(metricType, metricData) {
    return this.sendModuleMessage('system', metricType, metricData, 'analytics');
  }
}

// Создаем единственный экземпляр сервиса
const kafkaModuleService = new KafkaModuleService();

module.exports = kafkaModuleService; 