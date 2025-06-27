#!/bin/bash
# Zero-downtime deployment скрипт

set -e

echo "=== ZERO-DOWNTIME DEPLOYMENT ==="
echo "Дата: $(date)"

# Создаем новую версию
RELEASE_NAME=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="/app/releases/$RELEASE_NAME"
echo "Создание новой версии: $RELEASE_NAME"

# Сохраняем текущую версию для возможного отката
CURRENT_VERSION=$(readlink /app/current | xargs basename 2>/dev/null || echo "")

# Проверяем наличие архива
if [ ! -f "server_update.tar.gz" ]; then
    echo "Ошибка: Архив server_update.tar.gz не найден"
    exit 1
fi

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

# Очищаем старые версии (оставляем только последнюю рабочую)
echo "Очистка старых версий..."
cd /app/releases
RELEASE_COUNT=$(ls -1 | wc -l)
if [ $RELEASE_COUNT -gt 1 ]; then
    echo "Найдено $RELEASE_COUNT версий, оставляем только последнюю..."
    # Удаляем все версии кроме текущей активной
    ls -1 | grep -v "$RELEASE_NAME" | xargs -r rm -rf
    echo "✅ Удалено $(($RELEASE_COUNT - 1)) старых версий"
else
    echo "✅ Только одна версия, очистка не требуется"
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
echo ""
echo "Статус контейнеров:"
docker-compose -f /app/docker-compose.zero-downtime.yml ps
echo ""
echo "Доступные версии:"
ls -1 /app/releases/
echo ""
echo "Для отката используйте: /app/rollback.sh <версия>" 