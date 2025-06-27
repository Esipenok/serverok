# Zero-Downtime Deployment

## 🎯 Обзор

Система zero-downtime deployment позволяет обновлять приложение без остановки сервиса. MongoDB продолжает работать, а приложение переключается на новую версию мгновенно.

## 🏗️ Архитектура

```
/app/
├── current/ -> /app/releases/20241227_1600/  # Символическая ссылка на текущую версию
├── releases/                                 # Все версии приложения
│   ├── 20241227_1430/
│   ├── 20241227_1500/
│   └── 20241227_1600/
├── shared/                                   # Общие данные
│   ├── uploads/                             # Загруженные файлы
│   ├── logs/                                # Логи приложения
│   ├── node_modules/                        # Общие зависимости
│   ├── ssl/                                 # SSL сертификаты
│   └── .env                                 # Переменные окружения
├── backups/                                 # Резервные копии
└── docker-compose.zero-downtime.yml        # Конфигурация Docker
```

## 🚀 Процесс обновления

### 1. Автоматическое обновление (через Git)
```bash
# При push в master ветку автоматически:
# 1. Создается архив с кодом
# 2. Архив копируется на сервер
# 3. Запускается zero-downtime deployment
# 4. Время простоя: 0 секунд
```

### 2. Ручное обновление
```bash
# На сервере:
cd /app
bash zero_downtime_deploy.sh
```

## 🔧 Управление версиями

### Просмотр версий
```bash
ls -la /app/releases/
```

### Откат к предыдущей версии
```bash
# Откат к конкретной версии
/app/rollback.sh 20241227_1500

# Просмотр доступных версий
/app/rollback.sh
```

### Очистка старых версий
```bash
# Автоматическая очистка (оставляет последние 10 версий)
/app/cleanup_old_releases.sh
```

## 📊 Мониторинг

### Проверка статуса
```bash
# Статус контейнеров
docker-compose -f /app/docker-compose.zero-downtime.yml ps

# Логи приложения
docker logs dating_app_server

# Проверка API
curl http://localhost:3000/api/health
```

### Health Check
Приложение автоматически проверяется каждые 30 секунд:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 🛠️ Установка

### 1. Настройка структуры на сервере
```bash
# Скопируйте скрипт на сервер
scp scripts/setup_zero_downtime.sh root@46.62.131.90:/tmp/

# Запустите настройку
ssh root@46.62.131.90 "bash /tmp/setup_zero_downtime.sh"
```

### 2. Обновление Docker Compose
```bash
# Скопируйте новый docker-compose файл
scp docker-compose.zero-downtime.yml root@46.62.131.90:/app/docker-compose.zero-downtime.yml

# Остановите старые контейнеры
ssh root@46.62.131.90 "cd /app && docker-compose down"

# Запустите новые контейнеры
ssh root@46.62.131.90 "cd /app && docker-compose -f docker-compose.zero-downtime.yml up -d"
```

### 3. Настройка GitHub Actions
Замените `.github/workflows/deploy.yml` на `.github/workflows/deploy-zero-downtime.yml`

## 📈 Преимущества

### ✅ Zero-Downtime
- Время простоя: 0 секунд
- MongoDB работает без перерыва
- Пользователи не замечают обновления

### ✅ Быстрота
- Обновление за 30-60 секунд
- Нет пересборки Docker образов
- Общие зависимости

### ✅ Надежность
- Автоматический rollback при ошибках
- Проверка версии перед переключением
- Сохранение всех данных

### ✅ Экономия места
- Общие node_modules (149MB → 1 раз)
- Автоочистка старых версий
- Оптимизированные архивы

## 🔍 Troubleshooting

### Проблема: API не отвечает после обновления
```bash
# Проверьте логи
docker logs dating_app_server

# Откатитесь к предыдущей версии
/app/rollback.sh <предыдущая_версия>
```

### Проблема: Недостаточно места на диске
```bash
# Очистите старые версии
/app/cleanup_old_releases.sh

# Очистите Docker
docker system prune -a
```

### Проблема: Ошибки в зависимостях
```bash
# Переустановите зависимости
cd /app/shared
rm -rf node_modules
cd /app/current
npm install --production
cp -r node_modules/* /app/shared/node_modules/
```

## 📝 Логи и мониторинг

### Логи deployment
```bash
# Логи GitHub Actions
# Смотрите в GitHub → Actions → Deploy to Production

# Логи на сервере
tail -f /app/shared/logs/combined.log
```

### Метрики
- Время deployment: ~30-60 секунд
- Размер архива: ~184MB → ~50MB (только код)
- Количество версий: до 10
- Количество бэкапов: до 5 