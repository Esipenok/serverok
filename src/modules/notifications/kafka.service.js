const { Kafka } = require('kafkajs');
const logger = require('../../core/config/logger.config');

class KafkaService {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'willowe-notifications',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ 
      groupId: 'notifications-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });

    this.isConnected = false;
    this.notificationService = require('./notification.service');
  }

  /**
   * Подключение к Kafka
   */
  async connect() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka подключен успешно');
      
      // Запускаем обработчик сообщений
      await this.startMessageHandler();
      
    } catch (error) {
      logger.error('Ошибка подключения к Kafka:', error);
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
      logger.info('Kafka отключен');
    } catch (error) {
      logger.error('Ошибка отключения от Kafka:', error);
    }
  }

  /**
   * Отправка сообщения в топик
   */
  async sendMessage(topic, message, priority = 'medium') {
    if (!this.isConnected) {
      logger.warn('Kafka не подключен, отправка сообщения пропущена');
      return false;
    }

    try {
      const messageWithMetadata = {
        ...message,
        timestamp: Date.now(),
        priority: priority,
        source: 'willowe-app'
      };

      await this.producer.send({
        topic: topic,
        messages: [
          {
            key: message.userId || 'system',
            value: JSON.stringify(messageWithMetadata),
            headers: {
              priority: priority,
              messageType: message.type
            }
          }
        ]
      });

      logger.info(`Сообщение отправлено в топик ${topic}:`, message.type);
      return true;
    } catch (error) {
      logger.error(`Ошибка отправки сообщения в топик ${topic}:`, error);
      return false;
    }
  }

  /**
   * Запуск обработчика сообщений
   */
  async startMessageHandler() {
    try {
      // Подписываемся на все топики уведомлений
      const topics = [
        'high-priority-notifications',
        'medium-priority-notifications', 
        'low-priority-notifications'
      ];

      for (const topic of topics) {
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

      logger.info('Обработчик сообщений Kafka запущен');
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
      const priority = message.headers?.priority?.toString() || 'medium';
      
      logger.info(`Обработка сообщения из топика ${topic}, приоритет: ${priority}`);

      // Обрабатываем разные типы уведомлений
      switch (messageData.type) {
        case 'like':
          await this.notificationService.sendLikeNotification(messageData.targetUserId);
          break;
          
        case 'match':
          await this.notificationService.sendMatchNotification(
            messageData.targetUserId, 
            messageData.senderData
          );
          break;
          
        case 'fast-match':
          await this.notificationService.sendFastMatchNotification(
            messageData.targetUserId,
            messageData.senderData,
            messageData.requestId
          );
          break;
          
        case 'one-night':
          await this.notificationService.sendOneNightNotification(messageData.targetUserId);
          break;
          
        default:
          await this.notificationService.sendNotification(
            messageData.targetUserId,
            messageData.type,
            messageData.title,
            messageData.body,
            messageData.data
          );
      }

      logger.info(`Сообщение ${messageData.type} обработано успешно`);
    } catch (error) {
      logger.error('Ошибка обработки сообщения:', error);
    }
  }

  /**
   * Отправка уведомления о лайке
   */
  async sendLikeNotification(targetUserId, senderData = {}) {
    return this.sendMessage('medium-priority-notifications', {
      type: 'like',
      targetUserId,
      senderData
    }, 'medium');
  }

  /**
   * Отправка уведомления о мэтче
   */
  async sendMatchNotification(targetUserId, senderData) {
    return this.sendMessage('high-priority-notifications', {
      type: 'match',
      targetUserId,
      senderData
    }, 'high');
  }

  /**
   * Отправка уведомления о fast match
   */
  async sendFastMatchNotification(targetUserId, senderData, requestId) {
    return this.sendMessage('high-priority-notifications', {
      type: 'fast-match',
      targetUserId,
      senderData,
      requestId
    }, 'high');
  }

  /**
   * Отправка уведомления о one night
   */
  async sendOneNightNotification(targetUserId) {
    return this.sendMessage('medium-priority-notifications', {
      type: 'one-night',
      targetUserId
    }, 'medium');
  }

  /**
   * Отправка аналитического события
   */
  async sendAnalyticsEvent(eventType, eventData) {
    return this.sendMessage('low-priority-notifications', {
      type: 'analytics',
      eventType,
      eventData
    }, 'low');
  }
}

// Создаем единственный экземпляр сервиса
const kafkaService = new KafkaService();

module.exports = kafkaService; 