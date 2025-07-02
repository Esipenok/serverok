# Kafka Integration Guide

## 🎯 Обзор

Kafka интегрирован в проект для асинхронной обработки уведомлений и событий. Это позволяет:
- Разгрузить основной поток запросов
- Обеспечить надежную доставку уведомлений
- Масштабировать обработку событий
- Устанавливать приоритеты для разных типов событий

## 🏗️ Архитектура

### Компоненты
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Server    │    │   Kafka Broker  │    │  Notification   │
│   (Producer)    │───▶│   (Message      │───▶│   Service       │
│                 │    │    Queue)       │    │   (Consumer)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Топики и приоритеты

| Топик | Приоритет | Партиции | Retention | Назначение |
|-------|-----------|----------|-----------|------------|
| `high-priority-notifications` | Высокий | 3 | 24 часа | Мэтчи, Fast Match |
| `medium-priority-notifications` | Средний | 5 | 7 дней | Лайки, One Night |
| `low-priority-notifications` | Низкий | 2 | 30 дней | Аналитика, логи |

## 🚀 Установка и настройка

### 1. Запуск Kafka и Zookeeper

```bash
# Локальная разработка
./docs/start_kafka.bat

# Продакшн (через Docker Compose)
docker-compose -f docker-compose.zero-downtime.yml up -d kafka zookeeper
```

### 2. Создание топиков

```bash
# Настройка топиков
node scripts/setup-kafka-topics.js
```

### 3. Проверка работы

```bash
# Тест интеграции
node tests/test-kafka-integration.js
```

## 📝 Использование

### Отправка уведомлений через Kafka

```javascript
const kafkaService = require('./notifications/kafka.service');

// Высокий приоритет - мэтчи
await kafkaService.sendMatchNotification('user123', {
  name: 'Анна',
  age: 25,
  photoUrl: 'https://example.com/photo.jpg'
});

// Средний приоритет - лайки
await kafkaService.sendLikeNotification('user456', {
  name: 'Мария',
  age: 28
});

// Низкий приоритет - аналитика
await kafkaService.sendAnalyticsEvent('user_login', {
  userId: 'user123',
  timestamp: Date.now()
});
```

### Прямая отправка сообщений

```javascript
// Отправка в конкретный топик
await kafkaService.sendMessage('high-priority-notifications', {
  type: 'custom-notification',
  targetUserId: 'user123',
  title: 'Новое сообщение',
  body: 'У вас новое сообщение'
}, 'high');
```

## 🔧 Конфигурация

### Переменные окружения

```env
# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=willowe-notifications
KAFKA_GROUP_ID=notifications-group

# Настройки retry
KAFKA_RETRY_INITIAL=100
KAFKA_RETRY_RETRIES=8
```

### Настройки топиков

```javascript
// Высокий приоритет - быстрая обработка
{
  topic: 'high-priority-notifications',
  numPartitions: 3,        // Параллельная обработка
  retention.ms: 86400000,  // 24 часа
  cleanup.policy: 'delete'
}

// Средний приоритет - баланс
{
  topic: 'medium-priority-notifications', 
  numPartitions: 5,        // Больше параллелизма
  retention.ms: 604800000, // 7 дней
  cleanup.policy: 'delete'
}
```

## 📊 Мониторинг

### Проверка статуса Kafka

```bash
# Статус контейнеров
docker-compose -f docker-compose.zero-downtime.yml ps kafka zookeeper

# Логи Kafka
docker logs dating_app_kafka

# Логи Zookeeper
docker logs dating_app_zookeeper
```

### Проверка топиков

```bash
# Подключение к Kafka контейнеру
docker exec -it dating_app_kafka bash

# Список топиков
kafka-topics.sh --list --bootstrap-server localhost:9092

# Информация о топике
kafka-topics.sh --describe --topic high-priority-notifications --bootstrap-server localhost:9092
```

### Мониторинг сообщений

```bash
# Просмотр сообщений в топике
kafka-console-consumer.sh --topic high-priority-notifications --from-beginning --bootstrap-server localhost:9092

# Отправка тестового сообщения
kafka-console-producer.sh --topic test-topic --bootstrap-server localhost:9092
```

## 🛠️ Troubleshooting

### Частые проблемы

#### 1. Kafka не подключается
```bash
# Проверьте статус контейнеров
docker ps | grep kafka

# Проверьте логи
docker logs dating_app_kafka

# Проверьте сеть
docker network ls
```

#### 2. Сообщения не обрабатываются
```bash
# Проверьте consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Проверьте lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group notifications-group
```

#### 3. Высокая задержка
```bash
# Увеличьте количество партиций
kafka-topics.sh --alter --topic medium-priority-notifications --partitions 10 --bootstrap-server localhost:9092

# Проверьте количество consumer'ов
# Должно быть <= количеству партиций
```

## 🔄 Миграция с синхронных уведомлений

### Поэтапная миграция

1. **Этап 1**: Добавить Kafka параллельно с существующей системой
2. **Этап 2**: Постепенно переводить новые функции на Kafka
3. **Этап 3**: Мигрировать существующие функции
4. **Этап 4**: Отключить старую систему

### Пример миграции

```javascript
// Старый код
await notificationService.sendLikeNotification(userId);

// Новый код с fallback
try {
  await kafkaService.sendLikeNotification(userId);
} catch (error) {
  // Fallback к старой системе
  await notificationService.sendLikeNotification(userId);
}
```

## 📈 Производительность

### Оптимизация

1. **Партиции**: Количество партиций = количество параллельных consumer'ов
2. **Batch size**: Увеличьте для лучшей пропускной способности
3. **Retention**: Настройте под ваши требования
4. **Compression**: Включите для экономии места

### Метрики для отслеживания

- **Lag**: Задержка обработки сообщений
- **Throughput**: Количество сообщений в секунду
- **Error rate**: Процент ошибок
- **Latency**: Время обработки сообщения

## 🔒 Безопасность

### Рекомендации

1. **Аутентификация**: Настройте SASL/SSL в продакшне
2. **Авторизация**: Ограничьте доступ к топикам
3. **Шифрование**: Включите шифрование сообщений
4. **Аудит**: Логируйте все операции

### Конфигурация безопасности

```yaml
# docker-compose.yml
kafka:
  environment:
    - KAFKA_CFG_SASL_ENABLED_MECHANISMS=PLAIN
    - KAFKA_CFG_SASL_MECHANISM_INTER_BROKER_PROTOCOL=PLAIN
    - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:SASL_PLAINTEXT
```

## 📚 Дополнительные ресурсы

- [KafkaJS Documentation](https://kafka.js.org/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#design) 