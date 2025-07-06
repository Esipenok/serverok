# Инструкции по развертыванию административной панели

## Быстрый запуск

### 1. Через Docker (рекомендуется)

```bash
# Перейти в папку административной панели
cd adminka

# Запустить через Docker Compose
docker-compose up --build -d

# Проверить статус
docker-compose ps
```

### 2. Локальный запуск

```bash
# Перейти в папку административной панели
cd adminka

# Установить зависимости
npm install

# Запустить сервер
npm start
```

### 3. Через bat файл (Windows)

```bash
# Двойной клик на файл start.bat
# Или запуск из командной строки:
start.bat
```

## Доступ к панели

После запуска административная панель будет доступна по адресу:
- **URL**: http://localhost:3001
- **Логин**: admin
- **Пароль**: qwe

## Конфигурация

### Переменные окружения

Создайте файл `.env` в папке `adminka`:

```env
PORT=3001
MAIN_APP_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=qwe
NODE_ENV=production
```

### Настройка для production

1. **Измените учетные данные администратора**:
   ```env
   ADMIN_USERNAME=ваш_логин
   ADMIN_PASSWORD=ваш_сложный_пароль
   ```

2. **Настройте URL основного приложения**:
   ```env
   MAIN_APP_URL=https://your-domain.com
   ```

3. **Настройте порт** (если нужно):
   ```env
   PORT=3001
   ```

## Интеграция с основным приложением

### Требования

1. Основное приложение должно быть запущено
2. Endpoint `/api/complaints/all` должен быть доступен
3. Endpoint `/api/complaints/stats` должен быть доступен

### Проверка интеграции

```bash
# Проверка статуса основного приложения
curl http://localhost:3000/api/health

# Проверка доступа к жалобам (с учетными данными)
curl "http://localhost:3000/api/complaints/all?username=admin&password=qwe"
```

## Мониторинг и логи

### Просмотр логов

```bash
# Docker логи
docker-compose logs -f admin-panel

# Локальные логи (если запущено через npm)
# Логи выводятся в консоль
```

### Проверка статуса

```bash
# Проверка API административной панели
curl http://localhost:3001/api/health

# Проверка статуса сервера
curl "http://localhost:3001/api/server-status?username=admin&password=qwe"
```

## Безопасность

### Рекомендации

1. **Измените пароль по умолчанию**
2. **Используйте HTTPS в production**
3. **Ограничьте доступ по IP** (если нужно)
4. **Настройте firewall**

### Настройка HTTPS

```bash
# Создайте SSL сертификаты
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout private.key -out certificate.crt

# Добавьте в .env
SSL_KEY_PATH=./private.key
SSL_CERT_PATH=./certificate.crt
```

## Устранение неполадок

### Проблемы с подключением

1. **Проверьте, что основной сервер запущен**
2. **Проверьте URL в MAIN_APP_URL**
3. **Проверьте учетные данные администратора**

### Проблемы с Docker

```bash
# Пересоберите образ
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Проверьте логи
docker-compose logs admin-panel
```

### Проблемы с жалобами

1. **Проверьте, что endpoint `/api/complaints/all` работает**
2. **Проверьте подключение к MongoDB**
3. **Проверьте права доступа**

## Обновление

### Обновление кода

```bash
# Остановить сервис
docker-compose down

# Обновить код
git pull

# Пересобрать и запустить
docker-compose up --build -d
```

### Обновление зависимостей

```bash
# Локально
npm update

# Через Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Резервное копирование

### Экспорт данных

Административная панель поддерживает экспорт жалоб в CSV формат через веб-интерфейс.

### Резервное копирование конфигурации

```bash
# Сохраните важные файлы
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup
```

## Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Убедитесь в правильности конфигурации
3. Проверьте подключение к основному приложению
4. Обратитесь к документации основного приложения 