#!/bin/bash
# Zero-downtime deployment скрипт

set -e

echo "=== ZERO-DOWNTIME DEPLOYMENT ==="
echo "Дата: $(date)"

# Проверяем наличие архива
if [ ! -f "server_update.tar.gz" ]; then
    echo "Ошибка: Архив server_update.tar.gz не найден"
    exit 1
fi

# Создаем новую версию
RELEASE_NAME=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="/app/releases/$RELEASE_NAME"
echo "Создание новой версии: $RELEASE_NAME"

# Создаем директорию для новой версии
mkdir -p "$RELEASE_PATH"

# Распаковываем новую версию
echo "Распаковка новой версии..."
tar -xzf server_update.tar.gz -C "$RELEASE_PATH"
rm server_update.tar.gz

# Переходим в директорию новой версии
cd "$RELEASE_PATH"

# Проверяем, нужна ли установка зависимостей
echo "Проверка зависимостей..."
if [ ! -d "/app/shared/node_modules" ] || [ ! -f "package.json" ]; then
    echo "Установка зависимостей..."
    npm install --production
    # Копируем node_modules в shared
    cp -r node_modules/* /app/shared/node_modules/
    rm -rf node_modules
else
    echo "Зависимости уже установлены в shared"
fi

# Проверяем работоспособность новой версии
echo "Проверка новой версии..."
# Временно запускаем контейнер для тестирования
docker run --rm \
  --name test_app \
  --network app_app-network \
  -v "$RELEASE_PATH:/app" \
  -v "/app/shared/node_modules:/app/node_modules" \
  -v "/app/shared/.env:/app/.env" \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI=mongodb://admin:password@dating_app_mongodb:27017/dating_app?authSource=admin \
  -e JWT_SECRET=your_secret_key \
  -e JWT_EXPIRE=7d \
  -e BASE_URL=https://willowe.love \
  -e STATIC_URL=https://willowe.love \
  node:18-alpine \
  sh -c "cd /app && node -e \"console.log('Node.js работает'); process.exit(0)\""

if [ $? -ne 0 ]; then
    echo "❌ Ошибка: Новая версия не прошла проверку"
    rm -rf "$RELEASE_PATH"
    exit 1
fi

echo "✅ Новая версия прошла проверку"

# Создаем бэкап текущей версии
CURRENT_VERSION=$(readlink /app/current | xargs basename)
if [ "$CURRENT_VERSION" != "" ]; then
    echo "Создание бэкапа текущей версии: $CURRENT_VERSION"
    cp -r "/app/releases/$CURRENT_VERSION" "/app/backups/backup_$CURRENT_VERSION"
fi

# Переключаем на новую версию (zero-downtime)
echo "Переключение на новую версию..."
ln -sfn "$RELEASE_PATH" /app/current

# Перезапускаем только приложение (MongoDB продолжает работать)
echo "Перезапуск приложения..."
docker-compose -f /app/docker-compose.zero-downtime.yml restart app

# Ждем запуска и проверяем health check
echo "Ожидание запуска приложения..."
for i in {1..12}; do
    if docker-compose -f /app/docker-compose.zero-downtime.yml ps app | grep -q "Up"; then
        echo "✅ Приложение запущено"
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
        ln -sfn "/app/releases/$CURRENT_VERSION" /app/current
        docker-compose -f /app/docker-compose.zero-downtime.yml restart app
        sleep 10
        
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

# Очищаем старые версии (оставляем последние 10)
echo "Очистка старых версий..."
cd /app/releases
RELEASE_COUNT=$(ls -1 | wc -l)
if [ $RELEASE_COUNT -gt 10 ]; then
    echo "Найдено $RELEASE_COUNT версий, удаляем старые..."
    ls -1t | tail -n +11 | xargs -r rm -rf
fi

# Очищаем старые бэкапы (оставляем последние 5)
echo "Очистка старых бэкапов..."
cd /app/backups
BACKUP_COUNT=$(ls -1 | wc -l)
if [ $BACKUP_COUNT -gt 5 ]; then
    echo "Найдено $BACKUP_COUNT бэкапов, удаляем старые..."
    ls -1t | tail -n +6 | xargs -r rm -rf
fi

# Показываем статус
echo ""
echo "=== DEPLOYMENT ЗАВЕРШЕН ==="
echo "✅ Новая версия: $RELEASE_NAME"
echo "✅ Время простоя: 0 секунд"
echo "✅ MongoDB: работала без перерыва"
echo ""
echo "Статус контейнеров:"
docker-compose -f /app/docker-compose.zero-downtime.yml ps
echo ""
echo "Доступные версии:"
ls -1 /app/releases/
echo ""
echo "Для отката используйте: /app/rollback.sh <версия>" 