# Команды для работы с удаленным сервером


Доступные сервисы: - тут данные о работе сервисов
🌐 Приложение: http://46.62.131.90:3000
�� Kafka UI: http://46.62.131.90:9000
📈 Alloy (мониторинг): http://46.62.131.90:12345
🔍 Kafka Exporter: http://46.62.131.90:9308
🔍 Redis Exporter: http://46.62.131.90:9121
�� Node Exporter: http://46.62.131.90:9100


Закачака файлов по отдельности
scp -i "C:\Users\Andrey\.ssh\id_ed25519" test-kafka.js root@46.62.131.90:/app/test-kafka.js

## Подключение к серверу

```bash
# Подключение по SSH
ssh -i "C:\Users\Andrey\.ssh\id_ed25519" root@46.62.131.90

# Переход в директорию приложения
cd /app
```

## Управление контейнерами

### 1. Остановка контейнеров

#### Остановка всех контейнеров
```bash
# Остановка всех контейнеров (docker-compose)
docker-compose down

# Остановка всех контейнеров (zero-downtime)
docker-compose -f docker-compose.zero-downtime.yml down

# Принудительная остановка всех контейнеров
docker stop $(docker ps -q)
docker rm $(docker ps -aq)
```

#### Остановка отдельных контейнеров
```bash
# Остановка основного приложения
docker stop dating_app_server
docker rm dating_app_server

# Остановка MongoDB
docker stop dating_app_mongodb
docker rm dating_app_mongodb

# Остановка Nginx
docker stop dating_app_nginx
docker rm dating_app_nginx

# Остановка Redis (если используется)
docker stop dating_app_redis
docker rm dating_app_redis

# Остановка Kafka (если используется)
docker stop dating_app_kafka
docker rm dating_app_kafka

# Остановка Zookeeper (если используется)
docker stop dating_app_zookeeper
docker rm dating_app_zookeeper
```

### 2. Проверка статуса контейнеров

ssh -i "C:\Users\Andrey\.ssh\id_ed25519" root@46.62.131.90 "cd /root/app/docker && docker-compose -f docker-compose.zero-downtime.yml ps"

#### Общая информация
```bash
# Список всех контейнеров (работающих)
docker ps

# Список всех контейнеров (включая остановленные)
docker ps -a

# Статус контейнеров через docker-compose
docker-compose ps

# Статус контейнеров через docker-compose (zero-downtime)
docker-compose -f docker-compose.zero-downtime.yml ps

# Информация о ресурсах контейнеров
docker stats
```

#### Детальная информация по контейнерам
```bash
# Информация о конкретном контейнере
docker inspect dating_app_server

# Логи контейнера
docker logs dating_app_server

# Логи контейнера (последние 50 строк)
docker logs --tail 50 dating_app_server

# Логи контейнера в реальном времени
docker logs -f dating_app_server

# Использование ресурсов контейнера
docker stats dating_app_server
```

### 3. Запуск контейнеров

#### Запуск всех контейнеров
```bash
# Запуск всех контейнеров (docker-compose)
docker-compose up -d

# Запуск всех контейнеров (zero-downtime)
docker-compose -f docker-compose.zero-downtime.yml up -d

# Перезапуск всех контейнеров
docker-compose restart

# Перезапуск всех контейнеров (zero-downtime)
docker-compose -f docker-compose.zero-downtime.yml restart
```

#### Запуск отдельных контейнеров
```bash
# Запуск MongoDB
docker-compose up -d mongodb

# Запуск основного приложения
docker-compose up -d app

# Запуск Nginx
docker-compose up -d nginx

# Запуск Redis
docker-compose up -d redis

# Запуск Kafka
docker-compose up -d kafka

# Запуск Zookeeper
docker-compose up -d zookeeper
```

#### Запуск через docker run (если нужно)
```bash
# Запуск MongoDB
docker run -d \
  --name dating_app_mongodb \
  --network app_app-network \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:latest

# Запуск основного приложения
docker run -d \
  --name dating_app_server \
  --network app_app-network \
  -p 3000:3000 \
  -v /app:/app \
  -v /app/shared/node_modules:/app/node_modules \
  -v /app/shared/.env:/app/.env \
  -e NODE_ENV=production \
  node:18-alpine \
  sh -c "cd /app && npm start"
```

## Мониторинг и диагностика

### Проверка работоспособности
```bash
# Проверка API
curl -s -L https://willowe.love/api/health

# Проверка локального API
curl -s http://localhost:3000/api/health

# Проверка MongoDB
docker exec dating_app_mongodb mongosh --eval "db.adminCommand('ping')"

# Проверка Redis (если используется)
docker exec dating_app_redis redis-cli ping
```

### Логи и отладка
```bash
# Просмотр логов приложения
docker logs dating_app_server

# Просмотр логов MongoDB
docker logs dating_app_mongodb

# Просмотр логов Nginx
docker logs dating_app_nginx

# Просмотр логов в реальном времени
docker logs -f dating_app_server

# Поиск ошибок в логах
docker logs dating_app_server | grep -i error
docker logs dating_app_server | grep -i exception
```

### Системная информация
```bash
# Использование диска
df -h

# Использование памяти
free -h

# Загрузка CPU
top

# Сетевые соединения
netstat -tulpn

# Docker информация
docker system df
docker info
```

## Очистка и обслуживание

### Очистка Docker ресурсов
```bash
# Очистка остановленных контейнеров
docker container prune -f

# Очистка неиспользуемых образов
docker image prune -f

# Очистка неиспользуемых volumes
docker volume prune -f

# Очистка неиспользуемых networks
docker network prune -f

# Полная очистка всех неиспользуемых ресурсов
docker system prune -a -f
```

### Резервное копирование
```bash
# Создание бэкапа MongoDB
docker exec dating_app_mongodb mongodump --out /backup/$(date +%Y%m%d_%H%M%S)

# Создание бэкапа файлов
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz /app --exclude=/app/node_modules --exclude=/app/logs
```

## Полезные команды

### Перезапуск сервисов
```bash
# Перезапуск только приложения (zero-downtime)
docker-compose -f docker-compose.zero-downtime.yml restart app

# Перезапуск Nginx
docker-compose restart nginx

# Перезапуск MongoDB
docker-compose restart mongodb
```

### Проверка конфигурации
```bash
# Проверка docker-compose конфигурации
docker-compose config

# Проверка docker-compose конфигурации (zero-downtime)
docker-compose -f docker-compose.zero-downtime.yml config
```

### Экстренные команды
```bash
# Принудительная остановка всех контейнеров
docker kill $(docker ps -q)

# Удаление всех контейнеров
docker rm -f $(docker ps -aq)

# Удаление всех образов
docker rmi -f $(docker images -q)

# Полная очистка Docker
docker system prune -a -f --volumes
```

## Быстрые команды для копирования

### Остановка всех контейнеров
```bash
docker-compose down
```

### Запуск всех контейнеров
```bash
docker-compose up -d
```

### Проверка статуса
```bash
docker ps
```

### Просмотр логов приложения
```bash
docker logs dating_app_server
```

### Проверка API
```bash
curl -s -L https://willowe.love/api/health
``` 