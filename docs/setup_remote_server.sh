#!/bin/bash

# Скрипт для первоначальной настройки удаленного сервера
# Использование: ./setup_remote_server.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Настройки
REMOTE_USER="root"
REMOTE_HOST="46.62.131.90"
SSH_KEY="C:/Users/Andrey/.ssh/id_ed25519"
DOMAIN="willowe.love"

echo -e "${YELLOW}Начинаем настройку сервера ${REMOTE_HOST}...${NC}"

# Проверяем наличие SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Ошибка: SSH ключ не найден: $SSH_KEY${NC}"
    exit 1
fi

# Выполняем команды на сервере
echo -e "${YELLOW}Выполняем команды на сервере...${NC}"
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << EOF
    # Обновляем пакеты
    apt update
    apt upgrade -y
    
    # Устанавливаем необходимые пакеты
    apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
    
    # Запускаем и включаем Docker
    systemctl start docker
    systemctl enable docker
    
    # Создаем директории для приложения
    mkdir -p /root/app /root/app/uploads /root/app/logs /root/app/ssl
    chmod -R 777 /root/app/uploads /root/app/logs
    chmod -R 755 /root/app/ssl
    
    # Создаем конфигурацию Nginx
    cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX'
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
    
    # Включаем сайт
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    
    # Получаем SSL-сертификат
    certbot --nginx -d $DOMAIN -d www.$DOMAIN
    
    # Копируем сертификаты в директорию приложения
    mkdir -p /root/app/ssl
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /root/app/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/cert.pem /root/app/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/chain.pem /root/app/ssl/
    chmod -R 755 /root/app/ssl
    
    # Настраиваем автоматическое обновление сертификата
    echo "0 3 * * * root certbot renew --quiet" > /etc/cron.d/certbot-renew
    
    echo "Настройка сервера завершена!"
EOF

echo -e "${GREEN}Настройка сервера успешно завершена!${NC}"
echo -e "${YELLOW}Теперь вы можете выполнить деплой приложения.${NC}" 