# Настройка HTTP-сервера

В этом документе описывается процесс настройки HTTP-сервера для работы с приложением Flutter.

## Предварительные требования

- Сервер с установленной ОС Linux (Ubuntu/Debian рекомендуется)
- Установленный Docker и Docker Compose
- Установленный Node.js (версия 18+)
- Доступ к серверу по SSH

## Шаг 1: Подготовка сервера

1. Подключитесь к серверу по SSH:
   ```bash
   ssh root@46.62.131.90
   ```

2. Установите необходимые пакеты:
   ```bash
   apt update
   apt install -y docker.io docker-compose nodejs npm git
   ```

3. Создайте рабочую директорию:
   ```bash
   mkdir -p /root/app
   cd /root/app
   ```

## Шаг 2: Загрузка кода на сервер

1. С локальной машины скопируйте файлы на сервер:
   ```bash
   ./server/update-server.sh
   ```

   Или вручную:
   ```bash
   rsync -avz --exclude 'node_modules' --exclude '.git' ./server/ root@46.62.131.90:/root/app/
   ```

## Шаг 3: Настройка переменных окружения

1. На сервере создайте файл `.env`:
   ```bash
   cd /root/app
   cp .env.example .env
   nano .env
   ```

2. Отредактируйте переменные окружения в соответствии с вашими требованиями.

## Шаг 4: Запуск сервера

1. Запустите сервер с помощью Docker Compose:
   ```bash
   cd /root/app
   docker-compose up -d
   ```

2. Проверьте статус контейнеров:
   ```bash
   docker ps
   ```

3. Проверьте логи:
   ```bash
   docker logs app
   ```

## Шаг 5: Проверка работоспособности

1. Проверьте доступность API:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Или используйте скрипт проверки:
   ```bash
   node check-server.js
   ```

## Обновление сервера

Для обновления сервера используйте скрипт:
```bash
./update-server.sh
```

## Мониторинг сервера

Для мониторинга сервера используйте скрипт:
```bash
./monitor.sh
```

## Перезапуск сервера

Для перезапуска сервера выполните:
```bash
cd /root/app
docker-compose down
docker-compose up -d
```

## Переход на HTTPS

В будущем, когда будет приобретен домен, для перехода на HTTPS:

1. Приобретите домен и настройте DNS-записи типа A, указывающие на IP-адрес сервера.
2. Установите certbot для получения SSL-сертификата Let's Encrypt:
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
3. Обновите конфигурацию приложения для использования HTTPS.

## Устранение неполадок

### Проблема: Сервер не запускается

Проверьте логи:
```bash
docker logs app
```

### Проблема: Не удается подключиться к API

Проверьте, что порт открыт:
```bash
netstat -tuln | grep 3000
```

Проверьте настройки брандмауэра:
```bash
ufw status
```

Если порт закрыт, откройте его:
```bash
ufw allow 3000/tcp
``` 