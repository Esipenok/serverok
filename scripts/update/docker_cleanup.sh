#!/bin/bash
# Скрипт для очистки Docker на сервере
# Запускать периодически для освобождения места

echo "=== ОЧИСТКА DOCKER НА СЕРВЕРЕ ==="
echo "Дата: $(date)"

# Проверяем использование диска до очистки
echo "Использование диска до очистки:"
df -h /

# Останавливаем контейнеры
echo "Останавливаем контейнеры..."
docker-compose down

# Очищаем неиспользуемые образы, контейнеры, сети и volumes
echo "Очищаем неиспользуемые Docker ресурсы..."
docker system prune -a --volumes -f

# Очищаем build cache
echo "Очищаем build cache..."
docker builder prune -f

# Запускаем контейнеры обратно
echo "Запускаем контейнеры..."
docker-compose up -d

# Ждем запуска
echo "Ожидание запуска сервера (10 секунд)..."
sleep 10

# Проверяем статус контейнеров
echo "Проверка статуса контейнеров:"
docker ps

# Проверяем использование диска после очистки
echo "Использование диска после очистки:"
df -h /

# Проверяем работоспособность API
echo "Проверка API..."
HEALTH_CHECK=$(curl -s -L http://localhost:3000/api/health || echo "FAIL")
echo "Ответ от API: $HEALTH_CHECK"

if [[ "$HEALTH_CHECK" == *"success"* ]]; then
    echo "✅ API работает корректно"
else
    echo "⚠️ API не отвечает или отвечает с ошибкой"
    echo "Проверьте логи: docker logs dating_app_server"
fi

echo "=== ОЧИСТКА ЗАВЕРШЕНА ===" 