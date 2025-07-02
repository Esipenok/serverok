# ⚡ Быстрый старт Kafka

## 🚀 **Запуск за 3 шага**

### **1. Запуск всех сервисов**
```bash
docker-compose -f docker-compose.zero-downtime.yml up -d
```

### **2. Проверка статуса**
```bash
# Проверка всех контейнеров
docker-compose -f docker-compose.zero-downtime.yml ps

# Проверка логов приложения
docker-compose -f docker-compose.zero-downtime.yml logs app
```

### **3. Проверка топиков**
```bash
# Проверка создания топиков
node scripts/setup-kafka-topics.js check

# Или через Kafka Manager
# Откройте: http://localhost:9000
```

## 📊 **Мониторинг**

### **Веб-интерфейс**
```
Kafka Manager: http://localhost:9000
```

### **Командная строка**
```bash
# Разовый мониторинг
node scripts/kafka-monitor.js

# Непрерывный мониторинг
node scripts/kafka-monitor.js continuous 5
```

## 🔧 **Полезные команды**

### **Проверка топиков**
```bash
# Вход в контейнер Kafka
docker exec -it dating_app_kafka bash

# Список топиков
kafka-topics.sh --list --bootstrap-server localhost:9092

# Информация о топике
kafka-topics.sh --describe --topic matches --bootstrap-server localhost:9092
```

### **Проверка consumer groups**
```bash
# Список групп
kafka-consumer-groups.sh --list --bootstrap-server localhost:9092

# Детали группы
kafka-consumer-groups.sh --describe --group dating_app_consumer --bootstrap-server localhost:9092
```

### **Логи**
```bash
# Логи Kafka
docker-compose -f docker-compose.zero-downtime.yml logs kafka

# Логи приложения
docker-compose -f docker-compose.zero-downtime.yml logs app

# Логи в реальном времени
docker-compose -f docker-compose.zero-downtime.yml logs -f app
```

## 🚨 **Если что-то не работает**

### **Kafka не запускается**
```bash
# Перезапуск Kafka
docker-compose -f docker-compose.zero-downtime.yml restart kafka

# Проверка логов
docker-compose -f docker-compose.zero-downtime.yml logs kafka
```

### **Топики не создаются**
```bash
# Ручное создание
node scripts/setup-kafka-topics.js

# Проверка статуса
node scripts/setup-kafka-topics.js check
```

### **Приложение не подключается**
```bash
# Проверка переменных окружения
docker exec -it dating_app_server env | grep KAFKA

# Перезапуск приложения
docker-compose -f docker-compose.zero-downtime.yml restart app
```

## 📋 **Что создается автоматически**

### **Топики по приоритетам:**
- **⭐⭐⭐⭐⭐ КРИТИЧНО**: `photos` (8 партиций), `matches` (6 партиций)
- **⭐⭐⭐⭐ ВЫСОКИЙ**: `filters` (10 партиций)
- **⭐⭐⭐ СРЕДНИЙ**: `auth`, `fast_match`, `marketprofiles`, `one_night`, `qr` (3-4 партиции)
- **⭐⭐ НИЗКИЙ**: `complain`, `country`, `invites` (2 партиции)

### **Сервисы:**
- **Zookeeper**: Порт 2181
- **Kafka**: Порт 9092
- **Kafka Manager**: Порт 9000
- **Приложение**: Порт 3000

## ✅ **Готово!**

Система Kafka полностью настроена и интегрирована во все модули приложения:

- ✅ Автоматическое создание топиков
- ✅ Оптимизированная конфигурация
- ✅ Мониторинг через веб-интерфейс
- ✅ Health checks
- ✅ Логирование всех операций

**Приложение готово к работе!** 🎉 