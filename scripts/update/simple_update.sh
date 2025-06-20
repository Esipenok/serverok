#!/bin/bash
# Простой скрипт для обновления API-сервера
# Запускать на сервере после копирования архива server_update.tar.gz

set -e  # Остановка при ошибках

echo "=== ОБНОВЛЕНИЕ API-СЕРВЕРА ==="
echo "Текущая директория: $(pwd)"

# Проверяем наличие архива
if [ ! -f "server_update.tar.gz" ]; then
    echo "Ошибка: Архив server_update.tar.gz не найден"
    exit 1
fi

# Создаем резервную копию
echo "Создание резервной копии..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r app.js server.js package.json config auth users matches fast_match marketprofiles qr complain one_night filter_* docker-compose.yml $BACKUP_DIR/ 2>/dev/null || true
echo "Резервная копия создана в $BACKUP_DIR"

# Останавливаем контейнеры
echo "Останавливаем контейнеры Docker..."
docker-compose down

# Распаковываем новую версию
echo "Распаковка новой версии..."
tar -xzf server_update.tar.gz
rm server_update.tar.gz

# Устанавливаем зависимости
echo "Установка зависимостей..."
npm install --production

# Запускаем контейнеры
echo "Запуск контейнеров Docker..."
docker-compose up -d

# Ждем запуска
echo "Ожидание запуска сервера (10 секунд)..."
sleep 10

# Проверяем статус
echo "Проверка статуса контейнеров..."
docker ps

# Проверяем работоспособность API
echo "Проверка API..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "FAIL")
echo "Ответ от API: $HEALTH_CHECK"

if [[ "$HEALTH_CHECK" == *"success"* ]]; then
    echo "✅ API работает корректно"
else
    echo "⚠️ API не отвечает или отвечает с ошибкой"
    echo "Проверьте логи: docker logs dating_app_server"
fi

echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===" 