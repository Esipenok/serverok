# 🚀 Руководство по развертыванию Kafka

## 📋 **Обзор изменений в docker-compose**

### **Что добавлено:**

1. **Оптимизированная конфигурация Zookeeper**
   - Увеличен heap size до 512MB
   - Настроено максимальное количество соединений
   - Добавлены health checks

2. **Оптимизированная конфигурация Kafka**
   - 8 network threads и 8 IO threads
   - Увеличены буферы сокетов
   - Настроена компрессия LZ4
   - Автоматическое создание топиков

3. **Kafka Manager для мониторинга**
   - Веб-интерфейс на порту 9000
   - Управление топиками и consumer groups

4. **Автоматическое создание топиков**
   - Скрипт `setup-kafka-topics.js` запускается при старте
   - Создаются все необходимые топики с правильными настройками

## 🛠 **Запуск системы**

### **1. Запуск всех сервисов**
```bash
# Запуск всех сервисов
docker-compose -f docker-compose.zero-downtime.yml up -d

# Проверка статуса
docker-compose -f docker-compose.zero-downtime.yml ps
```

### **2. Проверка логов**
```bash
# Логи Kafka
docker-compose -f docker-compose.zero-downtime.yml logs kafka

# Логи Zookeeper
docker-compose -f docker-compose.zero-downtime.yml logs zookeeper

# Логи приложения
docker-compose -f docker-compose.zero-downtime.yml logs app
```

### **3. Проверка топиков**
```bash
# Вход в контейнер Kafka
docker exec -it dating_app_kafka bash

# Проверка списка топиков
kafka-topics.sh --list --bootstrap-server localhost:9092

# Детальная информация о топике
kafka-topics.sh --describe --topic matches --bootstrap-server localhost:9092
```

## 📊 **Мониторинг**

### **1. Kafka Manager (веб-интерфейс)**
```
URL: http://localhost:9000
```

**Возможности:**
- Просмотр всех топиков
- Мониторинг consumer groups
- Просмотр лагов
- Управление топиками

### **2. Командная строка**
```bash
# Проверка статуса топиков
node scripts/setup-kafka-topics.js check

# Запуск мониторинга
node scripts/kafka-monitor.js

# Непрерывный мониторинг (каждые 5 минут)
node scripts/kafka-monitor.js continuous 5
```

### **3. Проверка consumer groups**
```bash
# Список групп
kafka-consumer-groups.sh --list --bootstrap-server localhost:9092

# Детали группы
kafka-consumer-groups.sh --describe --group dating_app_consumer --bootstrap-server localhost:9092
```

## 🔧 **Конфигурация топиков**

### **Приоритеты и настройки:**

| Приоритет | Топики | Партиции | Retention | Описание |
|-----------|--------|----------|-----------|----------|
| **⭐⭐⭐⭐⭐ КРИТИЧНО** | `photos`, `matches` | 6-8 | 1-24ч | Основные функции |
| **⭐⭐⭐⭐ ВЫСОКИЙ** | `filters` | 10 | 30м | Быстрая фильтрация |
| **⭐⭐⭐ СРЕДНИЙ** | `auth`, `fast_match`, `marketprofiles`, `one_night`, `qr` | 3-4 | 1ч-7д | Обычные операции |
| **⭐⭐ НИЗКИЙ** | `complain`, `country`, `invites` | 2 | 30д | Вспомогательные функции |

### **Автоматическое создание:**
```javascript
// При запуске приложения автоматически создаются:
- photos (8 партиций, 1 час retention)
- matches (6 партиций, 24 часа retention)
- filters (10 партиций, 30 минут retention)
- auth (4 партиции, 7 дней retention)
- fast_match (4 партиции, 1 час retention)
- marketprofiles (4 партиции, 7 дней retention)
- one_night (4 партиции, 1 час retention)
- qr (3 партиции, 30 дней retention)
- complain (2 партиции, 30 дней retention)
- country (2 партиции, 30 дней retention)
- invites (2 партиции, 30 дней retention)
```

## 📈 **Метрики и алерты**

### **Ключевые метрики для отслеживания:**

1. **Throughput (пропускная способность)**
   - Количество сообщений в секунду по топикам
   - Норма: 100-1000 msg/sec для критичных топиков

2. **Latency (задержка)**
   - Время обработки сообщений
   - Норма: < 100ms для критичных операций

3. **Consumer Lag (отставание потребителей)**
   - Количество необработанных сообщений
   - Алерт: > 1000 сообщений

4. **Error Rate (частота ошибок)**
   - Процент ошибок в обработчиках
   - Алерт: > 5%

### **Команды для проверки:**
```bash
# Проверка лагов
kafka-consumer-groups.sh --describe --group dating_app_consumer --bootstrap-server localhost:9092

# Проверка метрик топика
kafka-topics.sh --describe --topic matches --bootstrap-server localhost:9092

# Мониторинг в реальном времени
node scripts/kafka-monitor.js continuous 2
```

## 🚨 **Troubleshooting**

### **Частые проблемы:**

#### **1. Kafka не запускается**
```bash
# Проверка логов
docker-compose logs kafka

# Проверка Zookeeper
docker-compose logs zookeeper

# Перезапуск
docker-compose restart kafka
```

#### **2. Топики не создаются**
```bash
# Ручное создание топика
kafka-topics.sh --create --topic matches --partitions 6 --replication-factor 1 --bootstrap-server localhost:9092

# Проверка скрипта
node scripts/setup-kafka-topics.js
```

#### **3. Высокие лаги**
```bash
# Проверка consumer groups
kafka-consumer-groups.sh --describe --group dating_app_consumer --bootstrap-server localhost:9092

# Увеличение количества партиций
kafka-topics.sh --alter --topic matches --partitions 8 --bootstrap-server localhost:9092
```

#### **4. Ошибки подключения**
```bash
# Проверка сети
docker network ls
docker network inspect willowe_app-network

# Проверка портов
netstat -an | grep 9092
```

## 🔄 **Масштабирование**

### **Горизонтальное масштабирование:**

1. **Увеличение количества партиций**
```bash
kafka-topics.sh --alter --topic filters --partitions 20 --bootstrap-server localhost:9092
```

2. **Добавление брокеров**
```yaml
# В docker-compose.yml добавить:
kafka-2:
  image: bitnami/kafka:3.6
  environment:
    - KAFKA_BROKER_ID=2
    - KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181
    - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092
    - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka-2:9092
```

3. **Увеличение репликации**
```bash
kafka-topics.sh --alter --topic matches --replication-factor 2 --bootstrap-server localhost:9092
```

## 📝 **Логирование**

### **Настройка логов:**
```javascript
// В kafka/config.js
const logger = require('../config/logger.config');

// Логирование всех операций
logger.info('Kafka operation', {
  topic: 'matches',
  operation: 'send',
  data: { userId: '123', action: 'create' }
});
```

### **Просмотр логов:**
```bash
# Логи приложения
docker-compose logs -f app

# Логи Kafka
docker-compose logs -f kafka

# Логи в файле
tail -f logs/kafka.log
```

## 🎯 **Рекомендации по производительности**

### **1. Оптимизация топиков:**
- Используйте компрессию LZ4 для экономии места
- Настройте retention policy под требования
- Мониторьте размер партиций

### **2. Оптимизация потребителей:**
- Используйте batch processing
- Настройте auto-commit интервалы
- Мониторьте consumer lag

### **3. Мониторинг:**
- Настройте алерты на высокие лаги
- Отслеживайте throughput по топикам
- Мониторьте ошибки обработки

## 🎉 **Заключение**

Система Kafka полностью настроена и готова к работе:

✅ **Автоматическое создание топиков** при запуске  
✅ **Оптимизированная конфигурация** для всех модулей  
✅ **Мониторинг и алерты** через Kafka Manager  
✅ **Масштабируемость** для высоких нагрузок  
✅ **Отказоустойчивость** с health checks  

Приложение готово к продакшену! 🚀 