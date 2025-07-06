# Настройка Zero-Downtime Deployment для Willowe

## Обзор системы

Zero-downtime deployment система обеспечивает обновление сервера без простоя, используя:
- **Символические ссылки** для мгновенного переключения версий
- **Тестирование** новой версии перед переключением
- **Автоматический откат** при проблемах
- **Сохранение важных данных** в shared папках

## Установка на сервер

### 1. Загрузка скриптов

**Способ 1: Автоматическая загрузка (рекомендуется)**

```powershell
# На локальной машине
powershell -ExecutionPolicy Bypass -File upload_scripts_to_server.ps1
```

**Способ 2: Ручная загрузка**

```bash
# На сервере (46.62.131.90)
cd /root/app

# Загружаем скрипты (используйте правильный URL вашего репозитория)
wget https://raw.githubusercontent.com/Esipenok/serverok/master/setup_zero_downtime.sh
wget https://raw.githubusercontent.com/Esipenok/serverok/master/zero_downtime_deploy.sh

# Делаем исполняемыми
chmod +x setup_zero_downtime.sh
chmod +x zero_downtime_deploy.sh
```

**Способ 3: SCP загрузка**

```bash
# Скопируйте файлы через SCP с локальной машины
scp setup_zero_downtime.sh root@46.62.131.90:/root/app/
scp zero_downtime_deploy.sh root@46.62.131.90:/root/app/
chmod +x /root/app/setup_zero_downtime.sh /root/app/zero_downtime_deploy.sh
```

### 2. Первоначальная настройка

```bash
# Запускаем настройку структуры
bash /root/app/setup_zero_downtime.sh
```

**Важно:** После выполнения этой команды будет создана вся необходимая структура папок и скрипты для управления версиями.

### 3. Проверка установки

```bash
# Проверяем структуру
ls -la /root/app/

# Проверяем скрипты
ls -la /root/app/setup_zero_downtime.sh
ls -la /root/app/zero_downtime_deploy.sh

# Проверяем права доступа
ls -la /root/app/rollback.sh
ls -la /root/app/cleanup_old_releases.sh
```

Это создаст:
- `/root/app/releases/` - папка для версий
- `/root/app/shared/` - общие данные
- `/root/app/current/` - символическая ссылка на текущую версию
- `/root/app/backups/` - папка для бэкапов
- `/root/app/setup_zero_downtime.sh` - скрипт настройки
- `/root/app/zero_downtime_deploy.sh` - скрипт деплоя

### 4. Настройка GitHub Secrets

В настройках репозитория GitHub (`Settings` → `Secrets and variables` → `Actions`) добавьте:

- `SSH_PRIVATE_KEY` - приватный SSH ключ для подключения к серверу
- `SSH_USER` - имя пользователя (обычно `root`)
- `SERVER_IP` - IP адрес сервера (`46.62.131.90`)

## Структура файлов

```
/root/app/
├── current/ -> /root/app/releases/YYYYMMDD_HHMMSS/
├── releases/
│   ├── 20241227_1430/
│   ├── 20241227_1500/
│   └── ...
├── shared/
│   ├── uploads/           # Загруженные файлы
│   ├── logs/              # Логи основного сервера
│   ├── ssl/               # SSL сертификаты
│   ├── node_modules/      # Зависимости
│   ├── adminka_logs/      # Логи админки
│   ├── adminka_backups/   # Бэкапы админки
│   ├── adminka_analytics/ # Данные аналитики
│   └── .env               # Переменные окружения
├── backups/               # Бэкапы всего проекта
├── setup_zero_downtime.sh # Скрипт настройки
└── zero_downtime_deploy.sh # Скрипт деплоя
```

## Как работает система

### 1. Автоматический деплой (при пуше в master)

1. **GitHub Actions** создает архив из папки `src`
2. Исключает чувствительные данные
3. Загружает архив на сервер
4. Запускает `zero_downtime_deploy.sh`

### 2. Процесс zero-downtime деплоя

1. **Создание новой версии** в `/root/app/releases/`
2. **Распаковка архива** в новую версию
3. **Тестирование** новой версии в отдельном контейнере
4. **Восстановление shared данных** в новую версию
5. **Переключение символической ссылки** на новую версию
6. **Перезапуск контейнеров** с новой версией
7. **Проверка работоспособности**
8. **Автоматический откат** при проблемах

## Преимущества zero-downtime

✅ **Нулевой простой** - сервисы работают без перерыва  
✅ **Безопасность** - тестирование перед переключением  
✅ **Автоматический откат** - при проблемах возврат к предыдущей версии  
✅ **Сохранение данных** - все важные файлы сохраняются  
✅ **Простота отката** - возможность вернуться к любой версии  

## Управление версиями

### Просмотр доступных версий

```bash
ls -1 /root/app/releases/
```

### Откат к предыдущей версии

```bash
/root/app/rollback.sh 20241227_1430
```

### Очистка старых версий

```bash
/root/app/cleanup_old_releases.sh
```

## Мониторинг

### Проверка статуса

```bash
# Статус контейнеров
docker ps | grep -E "(dating_app_server|willowe_admin_panel)"

# Текущая версия
ls -la /root/app/current

# Логи
docker logs dating_app_server --tail 50
docker logs willowe_admin_panel --tail 50
```

### Проверка доступности

```bash
# Основной сервер
curl http://localhost:3000/api/health

# Админка
curl http://localhost:3001
```

## Восстановление из бэкапа

### Восстановление всей системы

```bash
# Остановка контейнеров
docker stop dating_app_server willowe_admin_panel

# Восстановление из бэкапа
cd /root/app
tar -xzf backups/willowe-backup-YYYYMMDD-HHMMSS.tar.gz

# Перезапуск
docker start dating_app_server willowe_admin_panel
```

## Устранение неполадок

### Если деплой не прошел

1. Проверьте логи GitHub Actions
2. Проверьте статус контейнеров: `docker ps -a`
3. Проверьте логи контейнеров: `docker logs <container_name>`
4. Выполните откат: `/root/app/rollback.sh <version>`

### Если контейнеры не запускаются

```bash
# Проверьте переменные окружения
docker inspect dating_app_server | grep -A 10 "Env"

# Проверьте права доступа
ls -la /root/app/current/src/
ls -la /root/app/current/src/adminka/

# Проверьте shared данные
ls -la /root/app/shared/
```

### Полная переустановка

```bash
# Остановка всех контейнеров
docker stop $(docker ps -q)

# Удаление структуры
rm -rf /root/app

# Повторная настройка
bash setup_zero_downtime.sh
```

## Сравнение с простой системой

| Функция | Zero-Downtime | Простая система |
|---------|---------------|-----------------|
| Время простоя | 0 секунд | ~30 секунд |
| Безопасность | Высокая (тестирование) | Средняя |
| Сложность | Высокая | Низкая |
| Откат | Автоматический | Ручной |
| Ресурсы | Больше | Меньше |

## Рекомендации

- **Используйте zero-downtime** для продакшена
- **Тестируйте** на staging окружении
- **Мониторьте** логи после деплоя
- **Делайте бэкапы** перед критическими обновлениями
- **Документируйте** изменения в коде 