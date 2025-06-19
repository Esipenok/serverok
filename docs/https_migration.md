# Миграция с HTTP на HTTPS

В этом документе описывается процесс перехода с HTTP на HTTPS после приобретения домена.

## Шаг 1: Приобретение домена

1. Выберите регистратора доменных имен:
   - REG.RU (https://www.reg.ru/)
   - RU-CENTER (https://www.nic.ru/)
   - Namecheap (https://www.namecheap.com/)
   - GoDaddy (https://www.godaddy.com/)

2. Зарегистрируйте домен (например, yourapp.com).

## Шаг 2: Настройка DNS

1. Добавьте A-запись, указывающую на IP-адрес вашего сервера:
   ```
   A @ 46.62.131.90
   A www 46.62.131.90
   ```

2. Дождитесь обновления DNS (обычно занимает от нескольких минут до 48 часов).

## Шаг 3: Установка Nginx

1. Установите Nginx на сервер:
   ```bash
   apt update
   apt install -y nginx
   ```

2. Создайте конфигурационный файл для вашего домена:
   ```bash
   nano /etc/nginx/sites-available/yourapp.com
   ```

3. Добавьте базовую конфигурацию:
   ```nginx
   server {
       listen 80;
       server_name yourapp.com www.yourapp.com;
       
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

4. Создайте символическую ссылку и перезапустите Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/yourapp.com /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

## Шаг 4: Получение SSL-сертификата

### Вариант 1: Let's Encrypt (бесплатно)

1. Установите Certbot:
   ```bash
   apt install -y certbot python3-certbot-nginx
   ```

2. Получите сертификат:
   ```bash
   certbot --nginx -d yourapp.com -d www.yourapp.com
   ```

3. Настройте автоматическое обновление сертификата:
   ```bash
   echo "0 3 * * * root certbot renew --quiet" > /etc/cron.d/certbot-renew
   ```

### Вариант 2: Коммерческий SSL-сертификат

1. Приобретите SSL-сертификат у доверенного центра сертификации.
2. Установите сертификат согласно инструкциям поставщика.

## Шаг 5: Обновление конфигурации приложения

1. Обновите файл `server/config/app.config.js`:
   ```javascript
   baseUrl: process.env.BASE_URL || 'https://yourapp.com',
   staticUrl: process.env.STATIC_URL || 'https://yourapp.com',
   ```

2. Обновите файл `lib/services/server_service/api_config.dart`:
   ```dart
   static const String baseUrl = 'https://yourapp.com';
   ```

3. Обновите файл `.env`:
   ```
   BASE_URL=https://yourapp.com
   STATIC_URL=https://yourapp.com
   ```

## Шаг 6: Включение HTTPS редиректа

1. Разкомментируйте код в `server/app.js`:
   ```javascript
   // Перенаправление HTTP на HTTPS в production
   if (process.env.NODE_ENV === 'production') {
     app.use(redirectToHttps);
     app.use(addHstsHeader);
   }
   ```

2. Обновите файл `server/security/config.js`, включив HSTS:
   ```javascript
   hsts: {
     maxAge: 31536000, // 1 год
     includeSubDomains: true,
     preload: true
   },
   ```

3. Обновите файл `server/auth/middleware/https.middleware.js`:
   ```javascript
   const redirectToHttps = (req, res, next) => {
     const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
     
     if (!isSecure && process.env.NODE_ENV === 'production') {
       const host = req.headers.host;
       return res.redirect(301, `https://${host}${req.originalUrl}`);
     }
     
     next();
   };

   const addHstsHeader = (req, res, next) => {
     res.setHeader(
       'Strict-Transport-Security',
       'max-age=31536000; includeSubDomains; preload'
     );
     
     next();
   };
   ```

## Шаг 7: Перезапуск сервера

1. Перезапустите приложение:
   ```bash
   cd /root/app
   docker-compose down
   docker-compose up -d
   ```

## Шаг 8: Проверка работоспособности

1. Проверьте доступность сайта по HTTPS:
   ```
   https://yourapp.com/api/health
   ```

2. Проверьте автоматическое перенаправление с HTTP на HTTPS:
   ```
   http://yourapp.com/api/health
   ```

## Дополнительные рекомендации

1. Настройте мониторинг срока действия сертификата.
2. Добавьте ваш домен в HSTS Preload List (https://hstspreload.org/).
3. Регулярно проверяйте безопасность вашего сайта с помощью SSL Labs (https://www.ssllabs.com/ssltest/).
4. Обновите документацию API с новым доменным именем.
5. Обновите Firebase и другие внешние сервисы с новым доменным именем. 