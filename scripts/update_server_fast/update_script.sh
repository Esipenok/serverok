#!/bin/bash
set -e
echo "=== BLUE-GREEN ОБНОВЛЕНИЕ ==="
echo "Текущая директория: $(pwd)"
cd /root/app
echo "Переход в директорию: $(pwd)"
echo "Проверка текущего статуса..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "Создание резервной копии..."
if [ -d "backup" ]; then rm -rf backup; fi
mkdir -p backup
cp -r * backup/ 2>/dev/null || true
echo "Подготовка нового кода..."
mkdir -p new_version
tar -xzf server_update.tar.gz -C new_version/
rm server_update.tar.gz
echo "Установка зависимостей для новой версии..."
cd new_version
npm install --production
cd ..
echo "Создание конфигурации для новой версии..."
cp docker-compose.yml docker-compose-new.yml
sed -i 's/dating_app_server/dating_app_server_new/g' docker-compose-new.yml
sed -i 's/dating_app_mongodb/dating_app_mongodb_new/g' docker-compose-new.yml
sed -i 's/3000:3000/3001:3000/g' docker-compose-new.yml
echo "Запуск новой версии на порту 3001..."
docker-compose -f docker-compose-new.yml up -d
echo "Ожидание запуска новой версии..."
sleep 15
echo "Проверка новой версии..."
NEW_HEALTH=$(curl -s http://localhost:3001/api/health || echo "FAIL")
echo "Ответ от новой версии: $NEW_HEALTH"
if [[ "$NEW_HEALTH" == *"success"* ]]; then
    echo "✅ Новая версия работает корректно"
    echo "Обновление Nginx конфигурации..."
    cat > /etc/nginx/sites-available/willowe.love.new << 'NGINX'
server {
    listen 80;
    server_name willowe.love www.willowe.love;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name willowe.love www.willowe.love;
    ssl_certificate /etc/letsencrypt/live/willowe.love/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/willowe.love/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
    cp /etc/nginx/sites-available/willowe.love.new /etc/nginx/sites-available/willowe.love
    nginx -t && systemctl reload nginx
    echo "✅ Трафик переключен на новую версию"
    echo "Остановка старой версии..."
    docker-compose down
    echo "Замена старой версии новой..."
    rm -rf app.js server.js package.json config/ auth/ users/ matches/ fast_match/ marketprofiles/ qr/ complain/ one_night/ filter_*/
    mv new_version/* .
    mv new_version/.* . 2>/dev/null || true
    rmdir new_version
    rm -f docker-compose-new.yml
    rm -f /etc/nginx/sites-available/willowe.love.new
    sed -i 's/3001:3000/3000:3000/g' docker-compose.yml
    echo "Запуск обновленной версии на порту 3000..."
    docker-compose up -d
    echo "Финальная проверка..."
    sleep 10
    FINAL_HEALTH=$(curl -s https://willowe.love/api/health || echo "FAIL")
    echo "Финальный ответ: $FINAL_HEALTH"
    if [[ "$FINAL_HEALTH" == *"success"* ]]; then
        echo "✅ Обновление завершено успешно"
    else
        echo "❌ Проблема с финальной версией"
    fi
else
    echo "❌ Новая версия не работает, откатываемся..."
    docker-compose -f docker-compose-new.yml down
    rm -rf new_version
    rm -f docker-compose-new.yml
    rm -f /etc/nginx/sites-available/willowe.love.new
    echo "✅ Откат к старой версии завершен"
fi
echo "Финальный статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=== BLUE-GREEN ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===" 