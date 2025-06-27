#!/bin/bash
# Оптимизированный скрипт обновления с автоматической очисткой

set -e

echo "=== ОПТИМИЗИРОВАННОЕ ОБНОВЛЕНИЕ ==="
echo "Дата: $(date)"

# Проверяем использование диска до обновления
echo "Использование диска до обновления:"
df -h /

# Останавливаем контейнеры
echo "Останавливаем контейнеры..."
docker-compose down

# Удаляем старые образы приложения
echo "Удаляем старые образы приложения..."
docker images | grep "app-app\|willowe-server-app" | awk '{print $3}' | xargs -r docker rmi -f

# Удаляем образы с тегом <none>
echo "Удаляем образы с тегом <none>..."
docker images | grep "<none>" | awk '{print $3}' | xargs -r docker rmi -f

# Очищаем build cache
echo "Очищаем build cache..."
docker builder prune -f

# Собираем новый образ с оптимизированным Dockerfile
echo "Собираем новый образ..."
if [ -f "Dockerfile.optimized" ]; then
    docker build -f Dockerfile.optimized -t app-app:latest .
else
    docker build -t app-app:latest .
fi

# Запускаем контейнеры
echo "Запускаем контейнеры..."
docker-compose up -d

# Ждем запуска
echo "Ожидание запуска сервера (15 секунд)..."
sleep 15

# Проверяем статус
echo "Проверка статуса контейнеров:"
docker ps

# Проверяем размер образов
echo "Размер образов:"
docker images | grep "app-app\|mongo"

# Проверяем использование диска после обновления
echo "Использование диска после обновления:"
df -h /

# Проверяем API
echo "Проверка API..."
HEALTH_CHECK=$(curl -s -L http://localhost:3000/api/health || echo "FAIL")
echo "Ответ от API: $HEALTH_CHECK"

if [[ "$HEALTH_CHECK" == *"success"* ]]; then
    echo "✅ API работает корректно"
else
    echo "⚠️ API не отвечает"
    echo "Логи контейнера:"
    docker logs dating_app_server --tail 20
fi

echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===" 