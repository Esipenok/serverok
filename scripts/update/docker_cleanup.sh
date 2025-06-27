#!/bin/bash
# Скрипт для очистки Docker ресурсов

echo "=== DOCKER CLEANUP ==="
echo "Дата: $(date)"

echo "Очистка остановленных контейнеров..."
STOPPED_CONTAINERS=$(docker container ls -a --filter "status=exited" --filter "status=created" -q)
if [ -n "$STOPPED_CONTAINERS" ]; then
    echo "Найдено остановленных контейнеров: $(echo "$STOPPED_CONTAINERS" | wc -l)"
    docker container rm $STOPPED_CONTAINERS
    echo "✅ Остановленные контейнеры удалены"
else
    echo "✅ Остановленных контейнеров не найдено"
fi

echo "Очистка неиспользуемых образов..."
UNUSED_IMAGES=$(docker images -f "dangling=true" -q)
if [ -n "$UNUSED_IMAGES" ]; then
    echo "Найдено неиспользуемых образов: $(echo "$UNUSED_IMAGES" | wc -l)"
    docker rmi $UNUSED_IMAGES
    echo "✅ Неиспользуемые образы удалены"
else
    echo "✅ Неиспользуемых образов не найдено"
fi

echo "Очистка неиспользуемых volumes..."
docker volume prune -f

echo "Очистка неиспользуемых networks..."
docker network prune -f

echo "Очистка неиспользуемых образов (все неиспользуемые)..."
docker image prune -a -f

echo ""
echo "=== CLEANUP ЗАВЕРШЕН ==="
echo "Статус контейнеров:"
docker ps -a
echo ""
echo "Используемые образы:"
docker images 