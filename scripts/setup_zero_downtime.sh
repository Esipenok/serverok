#!/bin/bash
# Скрипт для настройки zero-downtime deployment структуры на сервере

set -e

echo "=== НАСТРОЙКА ZERO-DOWNTIME DEPLOYMENT ==="
echo "Дата: $(date)"

# Создаем основную структуру директорий
echo "Создание структуры директорий..."
mkdir -p /app/{releases,shared,backups}
mkdir -p /app/shared/{uploads,logs,node_modules,ssl}

# Создаем директорию для текущей версии
echo "Создание директории текущей версии..."
mkdir -p /app/releases/$(date +%Y%m%d_%H%M%S)

# Создаем символическую ссылку на текущую версию
echo "Создание символической ссылки current..."
ln -sfn /app/releases/$(date +%Y%m%d_%H%M%S) /app/current

# Копируем существующие файлы в shared
echo "Перенос существующих данных в shared..."
if [ -d "/app/uploads" ]; then
    cp -r /app/uploads/* /app/shared/uploads/ 2>/dev/null || true
fi

if [ -d "/app/logs" ]; then
    cp -r /app/logs/* /app/shared/logs/ 2>/dev/null || true
fi

if [ -d "/app/ssl" ]; then
    cp -r /app/ssl/* /app/shared/ssl/ 2>/dev/null || true
fi

if [ -d "/app/node_modules" ]; then
    cp -r /app/node_modules/* /app/shared/node_modules/ 2>/dev/null || true
fi

# Создаем .env файл если его нет
if [ ! -f "/app/shared/.env" ]; then
    echo "Создание .env файла..."
    cat > /app/shared/.env << 'EOF'
NODE_ENV=production
PORT=3000
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=dating_app
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
BASE_URL=https://willowe.love
STATIC_URL=https://willowe.love
EOF
fi

# Устанавливаем права доступа
echo "Установка прав доступа..."
chmod -R 755 /app/shared
chmod -R 777 /app/shared/uploads
chmod -R 777 /app/shared/logs
chmod 755 /app/shared/ssl

# Создаем скрипт для очистки старых версий
echo "Создание скрипта очистки..."
cat > /app/cleanup_old_releases.sh << 'EOF'
#!/bin/bash
# Скрипт для очистки старых версий (оставляет последние 10)

echo "Очистка старых версий..."
cd /app/releases

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

chmod +x /app/cleanup_old_releases.sh

# Создаем скрипт для rollback
echo "Создание скрипта rollback..."
cat > /app/rollback.sh << 'EOF'
#!/bin/bash
# Скрипт для отката к предыдущей версии

if [ -z "$1" ]; then
    echo "Использование: $0 <версия>"
    echo "Пример: $0 20241227_1430"
    echo "Доступные версии:"
    ls -1 /app/releases/
    exit 1
fi

VERSION=$1
RELEASE_PATH="/app/releases/$VERSION"

if [ ! -d "$RELEASE_PATH" ]; then
    echo "Ошибка: Версия $VERSION не найдена"
    echo "Доступные версии:"
    ls -1 /app/releases/
    exit 1
fi

echo "Откат к версии $VERSION..."

# Останавливаем приложение
docker stop dating_app_server || true
docker rm dating_app_server || true

# Переключаем на предыдущую версию
ln -sfn "$RELEASE_PATH" /app/current

# Запускаем приложение
cd /app
docker-compose up -d app

# Ждем запуска
sleep 10

# Проверяем статус
docker ps | grep dating_app_server

echo "Откат завершен"
EOF

chmod +x /app/rollback.sh

echo "=== НАСТРОЙКА ЗАВЕРШЕНА ==="
echo ""
echo "Структура создана:"
echo "/app/"
echo "├── current/ -> /app/releases/$(date +%Y%m%d_%H%M%S)/"
echo "├── releases/"
echo "├── shared/"
echo "│   ├── uploads/"
echo "│   ├── logs/"
echo "│   ├── node_modules/"
echo "│   └── .env"
echo "└── backups/"
echo ""
echo "Скрипты созданы:"
echo "- /app/cleanup_old_releases.sh - очистка старых версий"
echo "- /app/rollback.sh - откат к предыдущей версии"
echo ""
echo "Следующий шаг: обновите docker-compose.yml для работы с новой структурой" 