#!/bin/bash

# Скрипт для обновления только измененных файлов
# Использование: ./update_server_rsync.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Настройки
REMOTE_USER="root"
REMOTE_HOST="46.62.131.90"
REMOTE_DIR="/root/app"
SSH_KEY="C:/Users/Andrey/.ssh/id_ed25519"
LOCAL_DIR="./server"

echo -e "${YELLOW}=== ОБНОВЛЕНИЕ ТОЛЬКО ИЗМЕНЕННЫХ ФАЙЛОВ ===${NC}"

# Проверяем наличие SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Ошибка: SSH ключ не найден: $SSH_KEY${NC}"
    exit 1
fi

# Проверяем наличие локальной директории
if [ ! -d "$LOCAL_DIR" ]; then
    echo -e "${RED}Ошибка: Локальная директория не найдена: $LOCAL_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Синхронизация файлов с сервером...${NC}"

# Синхронизируем файлы, исключая ненужные
rsync -avz --delete \
    --exclude='node_modules/' \
    --exclude='.git/' \
    --exclude='uploads/' \
    --exclude='logs/' \
    --exclude='*.tar.gz' \
    --exclude='*.zip' \
    --exclude='.env' \
    --exclude='ssl/' \
    -e "ssh -i $SSH_KEY" \
    $LOCAL_DIR/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка при синхронизации файлов${NC}"
    exit 1
fi

echo -e "${GREEN}Файлы синхронизированы${NC}"

echo -e "${YELLOW}2. Перезапуск сервера...${NC}"

# Выполняем команды на сервере
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
    echo "=== ПЕРЕЗАПУСК СЕРВЕРА ==="
    
    # Переходим в директорию приложения
    cd /root/app
    
    # Останавливаем контейнеры
    echo "Остановка контейнеров..."
    docker-compose down
    
    # Устанавливаем зависимости (если package.json изменился)
    echo "Проверка зависимостей..."
    npm install --production
    
    # Запускаем контейнеры
    echo "Запуск контейнеров..."
    docker-compose up -d
    
    # Ждем запуска
    echo "Ожидание запуска серверов..."
    sleep 10
    
    # Проверяем статус
    echo "Проверка статуса контейнеров..."
    docker ps
    
    # Проверяем работоспособность API
    echo "Проверка API..."
    curl -s https://willowe.love/api/health || echo "API недоступен"
    
    echo "=== ПЕРЕЗАПУСК ЗАВЕРШЕН ==="
EOF

echo -e "${GREEN}=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===${NC}"
echo -e "${YELLOW}Проверьте логи сервера: docker logs dating_app_server${NC}" 