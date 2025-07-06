#!/bin/bash

# Останавливаем и удаляем старый контейнер
docker stop dating_app_server 2>/dev/null
docker rm dating_app_server 2>/dev/null

# Запускаем новый контейнер
docker run -d \
  --name dating_app_server \
  --network docker_app-network \
  -p 3000:3000 \
  -v /root/app:/app \
  -w /app \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI=mongodb://admin:password@dating_app_mongodb:27017/dating_app?authSource=admin \
  -e JWT_SECRET=your_secret_key \
  -e JWT_EXPIRE=7d \
  -e BASE_URL=https://willowe.love \
  -e STATIC_URL=https://willowe.love \
  -e REDIS_URL=redis://dating_app_redis:6379 \
  -e KAFKA_BROKER=dating_app_kafka:9092 \
  -e KAFKA_CLIENT_ID=dating_app_producer \
  -e KAFKA_GROUP_ID=dating_app_consumer \
  node:18 \
  bash -c "npm install --production && node scripts/setup-kafka-topics.js && node src/server.js"

echo "Контейнер dating_app_server запущен" 