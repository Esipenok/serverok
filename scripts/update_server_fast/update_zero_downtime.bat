@echo off
REM Устанавливаем кодировку UTF-8 для корректной работы с русскими символами
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Скрипт для обновления без простоя сервера (Blue-Green Deployment)
REM Использование: update_zero_downtime.bat

REM Настройки
set "REMOTE_USER=root"
set "REMOTE_HOST=46.62.131.90"
set "REMOTE_DIR=/root/app"
set "SSH_KEY=C:\Users\Andrey\.ssh\id_ed25519"
set "LOCAL_DIR=..\.."

echo.
echo ========================================
echo    ОБНОВЛЕНИЕ БЕЗ ПРОСТОЯ СЕРВЕРА
echo ========================================
echo.

REM Проверяем наличие SSH ключа
if not exist "%SSH_KEY%" (
    echo [ОШИБКА] SSH ключ не найден: %SSH_KEY%
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

echo [1/4] Создание архива с исходным кодом...
echo Текущая директория: %CD%
echo Локальная директория: %LOCAL_DIR%

REM Создаем архив с исходным кодом
cd /d "%LOCAL_DIR%"
echo Переход в директорию: %CD%

tar --exclude='node_modules' ^
    --exclude='.git' ^
    --exclude='uploads/*' ^
    --exclude='logs/*' ^
    --exclude='*.tar.gz' ^
    --exclude='*.zip' ^
    -czf server_update.tar.gz .

if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось создать архив
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

echo [УСПЕХ] Архив создан: server_update.tar.gz
echo Размер архива:
dir server_update.tar.gz

echo.
echo [2/4] Копирование архива на сервер...
echo Команда: scp -i "%SSH_KEY%" server_update.tar.gz %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/

REM Копируем архив на сервер
scp -i "%SSH_KEY%" server_update.tar.gz %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/

if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скопировать архив на сервер
    echo Проверьте:
    echo 1. SSH ключ: %SSH_KEY%
    echo 2. Подключение к серверу: %REMOTE_USER%@%REMOTE_HOST%
    echo 3. Директорию на сервере: %REMOTE_DIR%
    del server_update.tar.gz
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

echo [УСПЕХ] Архив скопирован на сервер

echo.
echo [3/4] Blue-Green обновление...
echo Создание скрипта для выполнения на сервере...

REM Создаем временный файл с командами для выполнения на сервере
echo #!/bin/bash > temp_commands.sh
echo set -e >> temp_commands.sh
echo echo "=== BLUE-GREEN ОБНОВЛЕНИЕ ===" >> temp_commands.sh
echo echo "Текущая директория: \$(pwd)" >> temp_commands.sh
echo cd %REMOTE_DIR% >> temp_commands.sh
echo echo "Переход в директорию: \$(pwd)" >> temp_commands.sh
echo echo "Проверка текущего статуса..." >> temp_commands.sh
echo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> temp_commands.sh
echo echo "Создание резервной копии..." >> temp_commands.sh
echo 'if [ -d "backup" ]; then rm -rf backup; fi' >> temp_commands.sh
echo mkdir -p backup >> temp_commands.sh
echo 'cp -r * backup/ 2>/dev/null || true' >> temp_commands.sh
echo echo "Подготовка нового кода..." >> temp_commands.sh
echo mkdir -p new_version >> temp_commands.sh
echo tar -xzf server_update.tar.gz -C new_version/ >> temp_commands.sh
echo rm server_update.tar.gz >> temp_commands.sh
echo echo "Установка зависимостей для новой версии..." >> temp_commands.sh
echo cd new_version >> temp_commands.sh
echo npm install --production >> temp_commands.sh
echo cd .. >> temp_commands.sh
echo echo "Создание конфигурации для новой версии..." >> temp_commands.sh
echo cp docker-compose.yml docker-compose-new.yml >> temp_commands.sh
echo "sed -i 's/dating_app_server/dating_app_server_new/g' docker-compose-new.yml" >> temp_commands.sh
echo "sed -i 's/dating_app_mongodb/dating_app_mongodb_new/g' docker-compose-new.yml" >> temp_commands.sh
echo "sed -i 's/3000:3000/3001:3000/g' docker-compose-new.yml" >> temp_commands.sh
echo echo "Запуск новой версии на порту 3001..." >> temp_commands.sh
echo docker-compose -f docker-compose-new.yml up -d >> temp_commands.sh
echo echo "Ожидание запуска новой версии..." >> temp_commands.sh
echo sleep 15 >> temp_commands.sh
echo echo "Проверка новой версии..." >> temp_commands.sh
echo 'NEW_HEALTH=$(curl -s http://localhost:3001/api/health || echo "FAIL")' >> temp_commands.sh
echo 'echo "Ответ от новой версии: $NEW_HEALTH"' >> temp_commands.sh
echo 'if [[ "$NEW_HEALTH" == *"success"* ]]; then' >> temp_commands.sh
echo '    echo "✅ Новая версия работает корректно"' >> temp_commands.sh
echo '    echo "Обновление Nginx конфигурации..."' >> temp_commands.sh
echo '    cat > /etc/nginx/sites-available/willowe.love.new << "NGINX"' >> temp_commands.sh
echo 'server {' >> temp_commands.sh
echo '    listen 80;' >> temp_commands.sh
echo '    server_name willowe.love www.willowe.love;' >> temp_commands.sh
echo '    return 301 https://$host$request_uri;' >> temp_commands.sh
echo '}' >> temp_commands.sh
echo '' >> temp_commands.sh
echo 'server {' >> temp_commands.sh
echo '    listen 443 ssl http2;' >> temp_commands.sh
echo '    server_name willowe.love www.willowe.love;' >> temp_commands.sh
echo '    ssl_certificate /etc/letsencrypt/live/willowe.love/fullchain.pem;' >> temp_commands.sh
echo '    ssl_certificate_key /etc/letsencrypt/live/willowe.love/privkey.pem;' >> temp_commands.sh
echo '    include /etc/letsencrypt/options-ssl-nginx.conf;' >> temp_commands.sh
echo '    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;' >> temp_commands.sh
echo '    location / {' >> temp_commands.sh
echo '        proxy_pass http://localhost:3001;' >> temp_commands.sh
echo '        proxy_http_version 1.1;' >> temp_commands.sh
echo '        proxy_set_header Upgrade $http_upgrade;' >> temp_commands.sh
echo '        proxy_set_header Connection "upgrade";' >> temp_commands.sh
echo '        proxy_set_header Host $host;' >> temp_commands.sh
echo '        proxy_set_header X-Real-IP $remote_addr;' >> temp_commands.sh
echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> temp_commands.sh
echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> temp_commands.sh
echo '        proxy_cache_bypass $http_upgrade;' >> temp_commands.sh
echo '    }' >> temp_commands.sh
echo '}' >> temp_commands.sh
echo 'NGINX' >> temp_commands.sh
echo '    cp /etc/nginx/sites-available/willowe.love.new /etc/nginx/sites-available/willowe.love' >> temp_commands.sh
echo '    nginx -t && systemctl reload nginx' >> temp_commands.sh
echo '    echo "✅ Трафик переключен на новую версию"' >> temp_commands.sh
echo '    echo "Остановка старой версии..."' >> temp_commands.sh
echo '    docker-compose down' >> temp_commands.sh
echo '    echo "Замена старой версии новой..."' >> temp_commands.sh
echo '    rm -rf app.js server.js package.json config/ auth/ users/ matches/ fast_match/ marketprofiles/ qr/ complain/ one_night/ filter_*/' >> temp_commands.sh
echo '    mv new_version/* .' >> temp_commands.sh
echo '    mv new_version/.* . 2>/dev/null || true' >> temp_commands.sh
echo '    rmdir new_version' >> temp_commands.sh
echo '    rm -f docker-compose-new.yml' >> temp_commands.sh
echo '    rm -f /etc/nginx/sites-available/willowe.love.new' >> temp_commands.sh
echo "    sed -i 's/3001:3000/3000:3000/g' docker-compose.yml" >> temp_commands.sh
echo '    echo "Запуск обновленной версии на порту 3000..."' >> temp_commands.sh
echo '    docker-compose up -d' >> temp_commands.sh
echo '    echo "Финальная проверка..."' >> temp_commands.sh
echo '    sleep 10' >> temp_commands.sh
echo '    FINAL_HEALTH=$(curl -s https://willowe.love/api/health || echo "FAIL")' >> temp_commands.sh
echo '    echo "Финальный ответ: $FINAL_HEALTH"' >> temp_commands.sh
echo '    if [[ "$FINAL_HEALTH" == *"success"* ]]; then' >> temp_commands.sh
echo '        echo "✅ Обновление завершено успешно"' >> temp_commands.sh
echo '    else' >> temp_commands.sh
echo '        echo "❌ Проблема с финальной версией"' >> temp_commands.sh
echo '    fi' >> temp_commands.sh
echo 'else' >> temp_commands.sh
echo '    echo "❌ Новая версия не работает, откатываемся..."' >> temp_commands.sh
echo '    docker-compose -f docker-compose-new.yml down' >> temp_commands.sh
echo '    rm -rf new_version' >> temp_commands.sh
echo '    rm -f docker-compose-new.yml' >> temp_commands.sh
echo '    rm -f /etc/nginx/sites-available/willowe.love.new' >> temp_commands.sh
echo '    echo "✅ Откат к старой версии завершен"' >> temp_commands.sh
echo 'fi' >> temp_commands.sh
echo 'echo "Финальный статус контейнеров:"' >> temp_commands.sh
echo 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"' >> temp_commands.sh
echo 'echo "=== BLUE-GREEN ОБНОВЛЕНИЕ ЗАВЕРШЕНО ==="' >> temp_commands.sh

echo Содержимое созданного скрипта:
echo ----------------------------------------
type temp_commands.sh
echo ----------------------------------------

echo.
echo Копирование скрипта на сервер...
echo Команда: scp -i "%SSH_KEY%" temp_commands.sh %REMOTE_USER%@%REMOTE_HOST%:/tmp/

REM Копируем файл с командами на сервер
scp -i "%SSH_KEY%" temp_commands.sh %REMOTE_USER%@%REMOTE_HOST%:/tmp/

if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скопировать скрипт на сервер
    del temp_commands.sh
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

echo [УСПЕХ] Скрипт скопирован на сервер

echo.
echo Выполнение команд на сервере...
echo Команда: ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "chmod +x /tmp/temp_commands.sh && /tmp/temp_commands.sh"

REM Выполняем команды на сервере
ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "chmod +x /tmp/temp_commands.sh && /tmp/temp_commands.sh"

if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось выполнить обновление на сервере
    echo.
    echo Проверьте логи сервера:
    echo ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "docker logs dating_app_server"
    del temp_commands.sh
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

REM Удаляем временный файл
del temp_commands.sh

echo.
echo [4/4] Очистка временных файлов...

REM Удаляем локальный архив
cd /d "%LOCAL_DIR%"
del server_update.tar.gz

echo.
echo ========================================
echo    ОБНОВЛЕНИЕ БЕЗ ПРОСТОЯ ЗАВЕРШЕНО
echo ========================================
echo.
echo Для проверки логов сервера выполните:
echo ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "docker logs dating_app_server"
echo.
echo Для проверки статуса контейнеров:
echo ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "docker ps"
echo.
echo Нажмите любую клавишу для выхода...
pause >nul 