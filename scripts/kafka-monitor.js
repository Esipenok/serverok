const { Kafka } = require('kafkajs');
const logger = require('../config/logger.config');

// Конфигурация Kafka
const kafka = new Kafka({
  clientId: 'dating_app_monitor',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const admin = kafka.admin();
const consumer = kafka.consumer({ groupId: 'monitor_group' });

// Метрики для отслеживания
const metrics = {
  topics: {},
  consumers: {},
  producers: {},
  errors: 0,
  startTime: Date.now()
};

// Функция для получения метрик топиков
async function getTopicMetrics() {
  try {
    const topics = await admin.listTopics();
    const metadata = await admin.fetchTopicMetadata({ topics });
    
    logger.info('📊 Метрики топиков Kafka:');
    
    for (const topic of metadata.topics) {
      const topicName = topic.name;
      const partitionCount = topic.partitions.length;
      
      // Получаем информацию о партициях
      const partitionInfo = topic.partitions.map(partition => ({
        partitionId: partition.partitionId,
        leader: partition.leader,
        replicas: partition.replicas.length,
        isr: partition.isr.length
      }));
      
      // Определяем приоритет по количеству партиций
      const priority = partitionCount >= 8 ? '⭐⭐⭐⭐⭐ КРИТИЧНО' :
                      partitionCount >= 6 ? '⭐⭐⭐⭐ ВЫСОКИЙ' :
                      partitionCount >= 4 ? '⭐⭐⭐ СРЕДНИЙ' : '⭐⭐ НИЗКИЙ';
      
      logger.info(`  📋 ${topicName}:`);
      logger.info(`    - Партиций: ${partitionCount} (${priority})`);
      logger.info(`    - Лидеры: ${partitionInfo.filter(p => p.leader !== -1).length}/${partitionCount}`);
      logger.info(`    - Реплики: ${partitionInfo[0]?.replicas || 0} на партицию`);
      
      // Сохраняем метрики
      metrics.topics[topicName] = {
        partitionCount,
        priority,
        partitionInfo,
        timestamp: Date.now()
      };
    }
    
  } catch (error) {
    logger.error('❌ Ошибка при получении метрик топиков:', error);
    metrics.errors++;
  }
}

// Функция для мониторинга потребителей
async function monitorConsumers() {
  try {
    // Получаем информацию о группах потребителей
    const groups = await admin.listGroups();
    
    logger.info('👥 Группы потребителей:');
    
    for (const group of groups.groups) {
      const groupId = group.groupId;
      
      try {
        const groupInfo = await admin.describeGroups([groupId]);
        const groupDescription = groupInfo.groups[0];
        
        if (groupDescription) {
          const memberCount = groupDescription.members.length;
          const protocol = groupDescription.protocol || 'N/A';
          
          logger.info(`  🔄 ${groupId}:`);
          logger.info(`    - Участников: ${memberCount}`);
          logger.info(`    - Протокол: ${protocol}`);
          logger.info(`    - Состояние: ${groupDescription.state}`);
          
          // Сохраняем метрики
          metrics.consumers[groupId] = {
            memberCount,
            protocol,
            state: groupDescription.state,
            timestamp: Date.now()
          };
        }
      } catch (groupError) {
        logger.warn(`⚠️ Не удалось получить информацию о группе ${groupId}:`, groupError.message);
      }
    }
    
  } catch (error) {
    logger.error('❌ Ошибка при мониторинге потребителей:', error);
    metrics.errors++;
  }
}

// Функция для проверки лагов потребителей
async function checkConsumerLags() {
  try {
    const groups = await admin.listGroups();
    
    logger.info('⏱️ Проверка лагов потребителей:');
    
    for (const group of groups.groups) {
      const groupId = group.groupId;
      
      try {
        // Получаем информацию о лагах для всех топиков группы
        const offsets = await admin.fetchOffsets({
          groupId: groupId,
          topics: Object.keys(metrics.topics)
        });
        
        if (offsets.length > 0) {
          logger.info(`  📈 ${groupId}:`);
          
          for (const offset of offsets) {
            const topicName = offset.topic;
            const partition = offset.partition;
            const lag = offset.lag;
            
            if (lag > 0) {
              const lagStatus = lag > 1000 ? '🔴 ВЫСОКИЙ' : lag > 100 ? '🟡 СРЕДНИЙ' : '🟢 НИЗКИЙ';
              logger.info(`    - ${topicName}:${partition}: ${lag} сообщений (${lagStatus})`);
            }
          }
        }
      } catch (lagError) {
        logger.warn(`⚠️ Не удалось проверить лаги для группы ${groupId}:`, lagError.message);
      }
    }
    
  } catch (error) {
    logger.error('❌ Ошибка при проверке лагов:', error);
    metrics.errors++;
  }
}

// Функция для проверки здоровья системы
async function checkSystemHealth() {
  try {
    logger.info('🏥 Проверка здоровья системы Kafka:');
    
    // Проверяем подключение к Zookeeper через Kafka
    const clusterInfo = await admin.describeCluster();
    
    logger.info(`  🖥️ Брокеров в кластере: ${clusterInfo.brokers.length}`);
    logger.info(`  🆔 ID контроллера: ${clusterInfo.controller?.id || 'N/A'}`);
    
    // Проверяем каждый брокер
    for (const broker of clusterInfo.brokers) {
      logger.info(`    - Брокер ${broker.nodeId}: ${broker.host}:${broker.port}`);
    }
    
    // Проверяем общие метрики
    const uptime = Date.now() - metrics.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);
    
    logger.info(`  ⏰ Время работы монитора: ${uptimeMinutes} минут`);
    logger.info(`  ❌ Количество ошибок: ${metrics.errors}`);
    
    // Определяем общее состояние системы
    const totalTopics = Object.keys(metrics.topics).length;
    const totalConsumers = Object.keys(metrics.consumers).length;
    const errorRate = metrics.errors / (uptimeMinutes || 1);
    
    if (errorRate > 1) {
      logger.error('🔴 Состояние системы: КРИТИЧНО - много ошибок');
    } else if (errorRate > 0.1) {
      logger.warn('🟡 Состояние системы: ВНИМАНИЕ - есть ошибки');
    } else {
      logger.info('🟢 Состояние системы: ОТЛИЧНО');
    }
    
    logger.info(`  📊 Итого топиков: ${totalTopics}`);
    logger.info(`  👥 Итого потребителей: ${totalConsumers}`);
    
  } catch (error) {
    logger.error('❌ Ошибка при проверке здоровья системы:', error);
    metrics.errors++;
  }
}

// Основная функция мониторинга
async function runMonitoring() {
  try {
    logger.info('🚀 Запуск мониторинга Kafka...');
    
    await admin.connect();
    
    // Выполняем все проверки
    await getTopicMetrics();
    await monitorConsumers();
    await checkConsumerLags();
    await checkSystemHealth();
    
    logger.info('✅ Мониторинг завершен успешно');
    
  } catch (error) {
    logger.error('💥 Критическая ошибка мониторинга:', error);
    metrics.errors++;
  } finally {
    await admin.disconnect();
  }
}

// Функция для непрерывного мониторинга
async function startContinuousMonitoring(intervalMinutes = 5) {
  logger.info(`🔄 Запуск непрерывного мониторинга (интервал: ${intervalMinutes} минут)`);
  
  // Первый запуск
  await runMonitoring();
  
  // Устанавливаем интервал
  setInterval(async () => {
    logger.info('🔄 Выполнение плановой проверки...');
    await runMonitoring();
  }, intervalMinutes * 60 * 1000);
}

// Экспортируем функции
module.exports = {
  runMonitoring,
  startContinuousMonitoring,
  getTopicMetrics,
  monitorConsumers,
  checkConsumerLags,
  checkSystemHealth
};

// Если скрипт запущен напрямую
if (require.main === module) {
  const command = process.argv[2];
  const interval = parseInt(process.argv[3]) || 5;
  
  if (command === 'continuous') {
    startContinuousMonitoring(interval);
  } else {
    runMonitoring()
      .then(() => {
        logger.info('🎉 Мониторинг завершен!');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('💥 Ошибка мониторинга:', error);
        process.exit(1);
      });
  }
} 