# План миграции сервера на удаленный хост с HTTPS

## Шаг 1: Подготовка локального сервера к переносу

1. Создать директорию для SSL-сертификатов:
```bash
mkdir -p server/ssl
```

2. Обновить конфигурацию для работы с HTTPS:
   - Обновить `server/config/app.config.js` для использования домена willowe.love
   - Обновить `server/security/config.js` для включения HSTS
   - Обновить `server/auth/middleware/https.middleware.js` для перенаправления на HTTPS

3. Убедиться, что в `server/docker-compose.yml` правильно настроены тома для SSL-сертификатов

## Шаг 2: Подключение к удаленному серверу

1. Подключиться по SSH:
```bash
ssh -i "C:\Users\Andrey\.ssh\id_ed25519" root@46.62.131.90
```

2. Создать рабочую директорию:
```bash
mkdir -p /root/app
```

## Шаг 3: Настройка домена и SSL

1. Проверить настройки DNS для домена willowe.love:
```bash
dig willowe.love
```

2. Установить Nginx:
```bash
apt update
apt install -y nginx
```

3. Создать конфигурацию Nginx для домена:
```bash
nano /etc/nginx/sites-available/willowe.love
```

4. Добавить базовую конфигурацию:
```nginx
server {
    listen 80;
    server_name willowe.love www.willowe.love;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. Включить сайт:
```bash
ln -s /etc/nginx/sites-available/willowe.love /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

6. Установить Certbot для получения SSL-сертификата:
```bash
apt install -y certbot python3-certbot-nginx
```

7. Получить SSL-сертификат:
```bash
certbot --nginx -d willowe.love -d www.willowe.love
```

8. Скопировать сертификаты в директорию приложения:
```bash
mkdir -p /root/app/ssl
cp /etc/letsencrypt/live/willowe.love/privkey.pem /root/app/ssl/
cp /etc/letsencrypt/live/willowe.love/cert.pem /root/app/ssl/
cp /etc/letsencrypt/live/willowe.love/chain.pem /root/app/ssl/
chmod -R 755 /root/app/ssl
```

## Шаг 4: Перенос кода на сервер

1. С локальной машины скопировать файлы на сервер:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'uploads/*' ./server/ root@46.62.131.90:/root/app/
```

2. Создать директории для загрузок и логов:
```bash
mkdir -p /root/app/uploads /root/app/logs
chmod -R 777 /root/app/uploads /root/app/logs
```

## Шаг 5: Настройка переменных окружения

1. Создать файл `.env`:
```bash
cd /root/app
nano .env
```

2. Добавить следующие переменные:
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password@mongodb:27017/dating_app?authSource=admin
JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRE=7d
BASE_URL=https://willowe.love
STATIC_URL=https://willowe.love
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=dating_app
TOKEN_CLEANUP_ENABLED=true
TOKEN_CLEANUP_INTERVAL=60
```

## Шаг 6: Запуск сервера с Docker Compose

1. Запустить сервер:
```bash
cd /root/app
docker-compose down
docker-compose up -d
```

2. Проверить статус контейнеров:
```bash
docker ps
```

3. Проверить логи:
```bash
docker logs dating_app_server
```

## Шаг 7: Проверка работоспособности

1. Проверить доступность API по HTTPS:
```bash
curl https://willowe.love/api/health
```

2. Проверить автоматическое перенаправление с HTTP на HTTPS:
```bash
curl -I http://willowe.love/api/health
```

## Шаг 8: Настройка автоматического обновления сертификата

1. Добавить задачу в cron:
```bash
echo "0 3 * * * root certbot renew --quiet" > /etc/cron.d/certbot-renew
```

## Шаг 9: Обновление клиентского приложения Flutter

1. Обновить API URL в приложении Flutter:
   - Изменить `lib/services/server_service/api_config.dart` для использования HTTPS и домена willowe.love

## Дополнительные рекомендации

1. Настроить резервное копирование базы данных
2. Настроить мониторинг сервера
3. Регулярно проверять журналы на наличие ошибок
4. Настроить автоматическое обновление сервера 