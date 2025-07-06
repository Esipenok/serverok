#!/bin/bash
# Скрипт для настройки zero-downtime deployment структуры на сервере

set -e

echo "=== НАСТРОЙКА ZERO-DOWNTIME DEPLOYMENT ==="
echo "Дата: $(date)"

# Создаем основную структуру директорий
echo "Создание структуры директорий..."
mkdir -p /root/app/{releases,shared,backups}
mkdir -p /root/app/shared/{uploads,logs,node_modules,ssl,adminka_logs,adminka_backups,adminka_analytics}

# Создаем директорию для текущей версии
echo "Создание директории текущей версии..."
mkdir -p /root/app/releases/$(date +%Y%m%d_%H%M%S)

# Создаем символическую ссылку на текущую версию
echo "Создание символической ссылки current..."
ln -sfn /root/app/releases/$(date +%Y%m%d_%H%M%S) /root/app/current

# Копируем существующие данные в shared
echo "Перенос существующих данных в shared..."

# Основной сервер - infrastructure/uploads
if [ -d "/root/app/src/infrastructure/uploads" ]; then
    cp -r /root/app/src/infrastructure/uploads/* /root/app/shared/uploads/ 2>/dev/null || true
fi

# Основной сервер - infrastructure/ssl
if [ -d "/root/app/src/infrastructure/ssl" ]; then
    cp -r /root/app/src/infrastructure/ssl/* /root/app/shared/ssl/ 2>/dev/null || true
fi

# Основной сервер - logs
if [ -d "/root/app/src/logs" ]; then
    cp -r /root/app/src/logs/* /root/app/shared/logs/ 2>/dev/null || true
fi

# Админка - logs
if [ -d "/root/app/adminka/logs" ]; then
    cp -r /root/app/adminka/logs/* /root/app/shared/adminka_logs/ 2>/dev/null || true
fi

# Админка - backups
if [ -d "/root/app/adminka/backups" ]; then
    cp -r /root/app/adminka/backups/* /root/app/shared/adminka_backups/ 2>/dev/null || true
fi

# Админка - analytics-data.json
if [ -f "/root/app/adminka/analytics/analytics-data.json" ]; then
    mkdir -p /root/app/shared/adminka_analytics
    cp /root/app/adminka/analytics/analytics-data.json /root/app/shared/adminka_analytics/ 2>/dev/null || true
fi

# node_modules для основного сервера
if [ -d "/root/app/src/node_modules" ]; then
    cp -r /root/app/src/node_modules/* /root/app/shared/node_modules/ 2>/dev/null || true
fi

# Создаем .env файл если его нет
if [ ! -f "/root/app/shared/.env" ]; then
    echo "Создание .env файла..."
    cat > /root/app/shared/.env << 'EOF'
NODE_ENV=production
PORT=3000
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=dating_app
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
BASE_URL=https://willowe.love
STATIC_URL=https://willowe.love
REDIS_URL=redis://dating_app_redis:6379
KAFKA_BROKER=dating_app_kafka:9092
KAFKA_CLIENT_ID=dating_app_producer
KAFKA_GROUP_ID=dating_app_consumer
EOF
fi

# Устанавливаем права доступа
echo "Установка прав доступа..."
chmod -R 755 /root/app/shared
chmod -R 777 /root/app/shared/uploads
chmod -R 777 /root/app/shared/logs
chmod -R 777 /root/app/shared/adminka_logs
chmod -R 777 /root/app/shared/adminka_backups
chmod 755 /root/app/shared/ssl

# Создаем скрипт для очистки старых версий
echo "Создание скрипта очистки..."
cat > /root/app/cleanup_old_releases.sh << 'EOF'
#!/bin/bash
# Скрипт для очистки старых версий (оставляет последние 10)

echo "Очистка старых версий..."
cd /root/app/releases

# Подсчитываем количество версий
RELEASE_COUNT=$(ls -1 | wc -l)

if [ $RELEASE_COUNT -gt 10 ]; then
    echo "Найдено $RELEASE_COUNT версий, удаляем старые..."
    ls -1t | tail -n +11 | xargs -r rm -rf
    echo "Очистка завершена"
else
    echo "Версий меньше 10, очистка не требуется"
fi
EOF

chmod +x /root/app/cleanup_old_releases.sh

# Создаем скрипт для rollback
echo "Создание скрипта rollback..."
cat > /root/app/rollback.sh << 'EOF'
#!/bin/bash
# Скрипт для отката к предыдущей версии

if [ -z "$1" ]; then
    echo "Использование: $0 <версия>"
    echo "Пример: $0 20241227_1430"
    echo "Доступные версии:"
    ls -1 /root/app/releases/
    exit 1
fi

VERSION=$1
RELEASE_PATH="/root/app/releases/$VERSION"

if [ ! -d "$RELEASE_PATH" ]; then
    echo "Ошибка: Версия $VERSION не найдена"
    echo "Доступные версии:"
    ls -1 /root/app/releases/
    exit 1
fi

echo "Откат к версии $VERSION..."

# Останавливаем приложения
docker stop dating_app_server willowe_admin_panel || true
docker rm dating_app_server willowe_admin_panel || true

# Переключаем на предыдущую версию
ln -sfn "$RELEASE_PATH" /root/app/current

# Восстанавливаем shared данные
echo "Восстановление shared данных..."

# Основной сервер
if [ -d "/root/app/shared/uploads" ]; then
    mkdir -p /root/app/current/src/infrastructure/uploads
    cp -r /root/app/shared/uploads/* /root/app/current/src/infrastructure/uploads/
fi

if [ -d "/root/app/shared/ssl" ]; then
    mkdir -p /root/app/current/src/infrastructure/ssl
    cp -r /root/app/shared/ssl/* /root/app/current/src/infrastructure/ssl/
fi

if [ -d "/root/app/shared/logs" ]; then
    mkdir -p /root/app/current/src/logs
    cp -r /root/app/shared/logs/* /root/app/current/src/logs/
fi

# Админка
if [ -d "/root/app/shared/adminka_logs" ]; then
    mkdir -p /root/app/current/adminka/logs
    cp -r /root/app/shared/adminka_logs/* /root/app/current/adminka/logs/
fi

if [ -d "/root/app/shared/adminka_backups" ]; then
    mkdir -p /root/app/current/adminka/backups
    cp -r /root/app/shared/adminka_backups/* /root/app/current/adminka/backups/
fi

if [ -f "/root/app/shared/adminka_analytics/analytics-data.json" ]; then
    mkdir -p /root/app/current/adminka/analytics
    cp /root/app/shared/adminka_analytics/analytics-data.json /root/app/current/adminka/analytics/
fi

# Запускаем приложения
echo "Запуск приложений..."

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
  -v /root/app/current/adminka:/app \
  -w /app \
  -e NODE_ENV=production \
  -e PORT=3001 \
  node:18 \
  sh -c 'npm install --production && node server.js'

# Ждем запуска
sleep 15

# Проверяем статус
echo "Статус контейнеров:"
docker ps | grep -E "(dating_app_server|willowe_admin_panel)"

echo "Откат завершен"
EOF

chmod +x /root/app/rollback.sh

echo "=== НАСТРОЙКА ЗАВЕРШЕНА ==="
echo ""
echo "Структура создана:"
echo "/root/app/"
echo "├── current/ -> /root/app/releases/$(date +%Y%m%d_%H%M%S)/"
echo "├── releases/"
echo "├── shared/"
echo "│   ├── uploads/           # Загруженные файлы"
echo "│   ├── logs/              # Логи основного сервера"
echo "│   ├── ssl/               # SSL сертификаты"
echo "│   ├── node_modules/      # Зависимости"
echo "│   ├── adminka_logs/      # Логи админки"
echo "│   ├── adminka_backups/   # Бэкапы админки"
echo "│   ├── adminka_analytics/ # Данные аналитики"
echo "│   └── .env"
echo "└── backups/"
echo ""
echo "Скрипты созданы:"
echo "- /root/app/cleanup_old_releases.sh - очистка старых версий"
echo "- /root/app/rollback.sh - откат к предыдущей версии"
echo ""
echo "Следующий шаг: запустите zero_downtime_deploy.sh для деплоя" 