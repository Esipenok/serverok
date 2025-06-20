#!/bin/bash

# Скрипт для обновления удаленного сервера
# Использование: ./update_server.sh

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

echo -e "${YELLOW}=== ОБНОВЛЕНИЕ УДАЛЕННОГО СЕРВЕРА ===${NC}"

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

echo -e "${YELLOW}1. Создание архива с исходным кодом...${NC}"

# Создаем архив с исходным кодом (исключаем node_modules и другие ненужные файлы)
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='uploads/*' \
    --exclude='logs/*' \
    --exclude='*.tar.gz' \
    --exclude='*.zip' \
    -czf server_update.tar.gz -C $LOCAL_DIR .

if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка при создании архива${NC}"
    exit 1
fi

echo -e "${GREEN}Архив создан: server_update.tar.gz${NC}"

echo -e "${YELLOW}2. Копирование архива на сервер...${NC}"

# Копируем архив на сервер
scp -i "$SSH_KEY" server_update.tar.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка при копировании архива на сервер${NC}"
    rm -f server_update.tar.gz
    exit 1
fi

echo -e "${GREEN}Архив скопирован на сервер${NC}"

echo -e "${YELLOW}3. Обновление сервера...${NC}"

# Выполняем команды на сервере
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'EOF'
    echo "=== ОБНОВЛЕНИЕ СЕРВЕРА ==="
    
    # Переходим в директорию приложения
    cd /root/app
    
    # Останавливаем контейнеры
    echo "Остановка контейнеров..."
    docker-compose down
    
    # Создаем резервную копию текущего кода
    echo "Создание резервной копии..."
    if [ -d "backup" ]; then
        rm -rf backup
    fi
    mkdir -p backup
    cp -r * backup/ 2>/dev/null || true
    
    # Распаковываем новый архив
    echo "Распаковка нового кода..."
    tar -xzf server_update.tar.gz
    
    # Удаляем архив
    rm server_update.tar.gz
    
    # Устанавливаем зависимости
    echo "Установка зависимостей..."
    npm install --production
    
    # Создаем необходимые директории
    mkdir -p uploads logs ssl
    
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
    
    echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ==="
EOF

# Удаляем локальный архив
rm -f server_update.tar.gz

echo -e "${GREEN}=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===${NC}"
echo -e "${YELLOW}Проверьте логи сервера: docker logs dating_app_server${NC}" 