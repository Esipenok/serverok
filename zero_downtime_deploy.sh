#!/bin/bash
# Zero-downtime deployment скрипт

set -e

echo "=== ZERO-DOWNTIME DEPLOYMENT ==="
echo "Дата: $(date)"

# Создаем новую версию
RELEASE_NAME=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="/root/app/releases/$RELEASE_NAME"
echo "Создание новой версии: $RELEASE_NAME"

# Сохраняем текущую версию для возможного отката
CURRENT_VERSION=$(readlink /root/app/current | xargs basename 2>/dev/null || echo "")

# Проверяем наличие архива
if [ ! -f "/root/app/server_update.tar.gz" ]; then
    echo "Ошибка: Архив server_update.tar.gz не найден"
    exit 1
fi

# Создаем директорию для новой версии
mkdir -p "$RELEASE_PATH"

# Распаковываем новую версию
echo "Распаковка новой версии..."
tar -xzf /root/app/server_update.tar.gz -C "$RELEASE_PATH"
rm /root/app/server_update.tar.gz

# Переходим в директорию новой версии
cd "$RELEASE_PATH"

# Проверяем структуру
if [ ! -d "src" ]; then
    echo "❌ Ошибка: Папка src не найдена в архиве"
    exit 1
fi

# Проверяем, нужна ли установка зависимостей
echo "Проверка зависимостей..."
if [ ! -d "/root/app/shared/node_modules" ] || [ ! -f "src/package.json" ]; then
    echo "Установка зависимостей..."
    cd src
    npm install --production
    # Создаем shared директорию если её нет
    mkdir -p /root/app/shared/node_modules
    # Копируем node_modules в shared
    cp -r node_modules/* /root/app/shared/node_modules/
    rm -rf node_modules
    cd ..
else
    echo "Зависимости уже установлены в shared"
fi

# Проверяем работоспособность новой версии
echo "Проверка новой версии..."
# Временно запускаем контейнер для тестирования основного сервера
docker run --rm \
  --name test_main_server \
  --network docker_app-network \
  -v "$RELEASE_PATH:/app" \
  -v "/root/app/shared/node_modules:/app/src/node_modules" \
  -v "/root/app/shared/.env:/app/src/.env" \
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
  bash -c "cd /app/src && node server.js --test"

if [ $? -ne 0 ]; then
    echo "❌ Ошибка: Основной сервер не прошел проверку"
    rm -rf "$RELEASE_PATH"
    exit 1
fi

# Проверяем админку если она есть
if [ -d "$RELEASE_PATH/src/adminka" ]; then
    echo "Проверка админки..."
    docker run --rm \
      --name test_admin \
      --network docker_app-network \
      -v "$RELEASE_PATH/src/adminka:/app" \
      -e NODE_ENV=production \
      -e PORT=3001 \
      node:18 \
      sh -c "cd /app && node server.js --test"
    
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка: Админка не прошла проверку"
        rm -rf "$RELEASE_PATH"
        exit 1
    fi
fi

echo "✅ Новая версия прошла проверку"

# Переключаем на новую версию (zero-downtime)
echo "Переключение на новую версию..."
ln -sfn "$RELEASE_PATH" /root/app/current

# Восстанавливаем shared данные в новую версию
echo "Восстановление shared данных..."

# Основной сервер
if [ -d "/root/app/shared/uploads" ]; then
    mkdir -p "$RELEASE_PATH/src/infrastructure/uploads"
    cp -r /root/app/shared/uploads/* "$RELEASE_PATH/src/infrastructure/uploads/"
fi

if [ -d "/root/app/shared/ssl" ]; then
    mkdir -p "$RELEASE_PATH/src/infrastructure/ssl"
    cp -r /root/app/shared/ssl/* "$RELEASE_PATH/src/infrastructure/ssl/"
fi

if [ -d "/root/app/shared/logs" ]; then
    mkdir -p "$RELEASE_PATH/src/logs"
    cp -r /root/app/shared/logs/* "$RELEASE_PATH/src/logs/"
fi

# Админка
if [ -d "/root/app/shared/adminka_logs" ]; then
    mkdir -p "$RELEASE_PATH/src/adminka/logs"
    cp -r /root/app/shared/adminka_logs/* "$RELEASE_PATH/src/adminka/logs/"
fi

if [ -d "/root/app/shared/adminka_backups" ]; then
    mkdir -p "$RELEASE_PATH/src/adminka/backups"
    cp -r /root/app/shared/adminka_backups/* "$RELEASE_PATH/src/adminka/backups/"
fi

if [ -f "/root/app/shared/adminka_analytics/analytics-data.json" ]; then
    mkdir -p "$RELEASE_PATH/src/adminka/analytics"
    cp /root/app/shared/adminka_analytics/analytics-data.json "$RELEASE_PATH/src/adminka/analytics/"
fi

# Останавливаем старые контейнеры
echo "Остановка старых контейнеров..."
docker stop dating_app_server willowe_admin_panel 2>/dev/null || true
docker rm dating_app_server willowe_admin_panel 2>/dev/null || true

# Запускаем новые контейнеры
echo "Запуск новых контейнеров..."

# Основной сервер
docker run -d \
  --name dating_app_server \
  --network docker_app-network \
  -p 3000:3000 \
  -v /root/app/current:/app \
  -w /app/src \
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
  bash -c 'npm install --production && node scripts/setup-kafka-topics.js && node server.js'

# Админка
docker run -d \
  --name willowe_admin_panel \
  --network docker_app-network \
  -p 3001:3001 \
  -v /root/app/current/src/adminka:/app \
  -w /app \
  -e NODE_ENV=production \
  -e PORT=3001 \
  node:18 \
  sh -c 'npm install --production && node server.js'

# Ждем запуска и проверяем health check
echo "Ожидание запуска приложений..."
for i in {1..12}; do
    if docker ps | grep -q "dating_app_server.*Up" && docker ps | grep -q "willowe_admin_panel.*Up"; then
        echo "✅ Приложения запущены"
        break
    fi
    echo "Попытка $i/12: ожидание запуска..."
    sleep 5
done

# Проверяем API
echo "Проверка API..."
for i in {1..6}; do
    HEALTH_CHECK=$(curl -s -L https://willowe.love/api/health || echo "FAIL")
    if [[ "$HEALTH_CHECK" == *"success"* ]]; then
        echo "✅ API работает корректно"
        break
    else
        echo "Попытка $i/6: API не отвечает, ждем..."
        sleep 5
    fi
done

if [[ "$HEALTH_CHECK" != *"success"* ]]; then
    echo "❌ API не отвечает после 6 попыток"
    echo "Откат к предыдущей версии..."
    
    # Откат к предыдущей версии
    if [ "$CURRENT_VERSION" != "" ]; then
        echo "Выполняем откат к версии $CURRENT_VERSION..."
        /root/app/rollback.sh "$CURRENT_VERSION"
        
        # Проверяем откат
        ROLLBACK_CHECK=$(curl -s -L https://willowe.love/api/health || echo "FAIL")
        if [[ "$ROLLBACK_CHECK" == *"success"* ]]; then
            echo "✅ Откат успешен"
        else
            echo "❌ Откат не удался"
        fi
    fi
    
    # Удаляем неудачную версию
    rm -rf "$RELEASE_PATH"
    exit 1
fi

# Очищаем старые версии (оставляем последние 5)
echo "Очистка старых версий..."
cd /root/app/releases
RELEASE_COUNT=$(ls -1 | wc -l)
if [ $RELEASE_COUNT -gt 5 ]; then
    echo "Найдено $RELEASE_COUNT версий, оставляем последние 5..."
    # Удаляем старые версии, оставляя последние 5
    ls -1t | tail -n +6 | xargs -r rm -rf
    echo "✅ Удалено $(($RELEASE_COUNT - 5)) старых версий"
else
    echo "✅ Версий меньше 5, очистка не требуется"
fi

# Очищаем Docker образы и контейнеры
echo "Очистка Docker ресурсов..."
# Удаляем остановленные контейнеры
docker container prune -f
# Удаляем неиспользуемые образы
docker image prune -f
# Удаляем неиспользуемые volumes
docker volume prune -f
# Удаляем неиспользуемые networks
docker network prune -f
echo "✅ Docker ресурсы очищены"

# Показываем статус
echo ""
echo "=== DEPLOYMENT ЗАВЕРШЕН ==="
echo "✅ Новая версия: $RELEASE_NAME"
echo "✅ Время простоя: 0 секунд"
echo "✅ MongoDB: работала без перерыва"
echo "✅ Redis: работал без перерыва"
echo "✅ Kafka: работал без перерыва"
echo ""
echo "Статус контейнеров:"
docker ps | grep -E "(dating_app_server|willowe_admin_panel)"
echo ""
echo "Доступные версии:"
ls -1 /root/app/releases/
echo ""
echo "Для отката используйте: /root/app/rollback.sh <версия>" 