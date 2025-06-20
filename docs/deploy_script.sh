#!/bin/bash

# Скрипт для деплоя сервера на удаленный хост
# Использование: ./deploy_script.sh

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

echo -e "${YELLOW}Начинаем деплой сервера на ${REMOTE_HOST}...${NC}"

# Проверяем наличие SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Ошибка: SSH ключ не найден: $SSH_KEY${NC}"
    exit 1
fi

# Создаем директорию для SSL-сертификатов
echo -e "${YELLOW}Создаем директорию для SSL-сертификатов...${NC}"
mkdir -p server/ssl

# Создаем архив с исходным кодом
echo -e "${YELLOW}Создаем архив с исходным кодом...${NC}"
tar --exclude='node_modules' --exclude='.git' --exclude='uploads/*' -czf server.tar.gz -C $LOCAL_DIR .

# Копируем архив на сервер
echo -e "${YELLOW}Копируем архив на сервер...${NC}"
scp -i "$SSH_KEY" server.tar.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# Выполняем команды на сервере
echo -e "${YELLOW}Выполняем команды на сервере...${NC}"
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << EOF
    # Создаем директории
    mkdir -p $REMOTE_DIR/uploads $REMOTE_DIR/logs $REMOTE_DIR/ssl
    
    # Распаковываем архив
    cd $REMOTE_DIR
    tar -xzf server.tar.gz
    rm server.tar.gz
    
    # Устанавливаем зависимости
    npm install --production
    
    # Останавливаем контейнеры
    docker-compose down
    
    # Запускаем контейнеры
    docker-compose up -d
    
    # Проверяем статус
    docker ps
    
    echo "Деплой завершен!"
EOF

# Удаляем локальный архив
rm server.tar.gz

echo -e "${GREEN}Деплой успешно завершен!${NC}"
echo -e "${YELLOW}Не забудьте настроить Nginx и SSL-сертификаты на сервере.${NC}" 