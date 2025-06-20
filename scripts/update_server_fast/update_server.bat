@echo off
echo === ОБНОВЛЕНИЕ УДАЛЕННОГО СЕРВЕРА ===

REM Настройки
set REMOTE_USER=root
set REMOTE_HOST=46.62.131.90
set REMOTE_DIR=/root/app
set SSH_KEY=C:\Users\Andrey\.ssh\id_ed25519
set LOCAL_DIR=.\server

echo 1. Создание архива с исходным кодом...

REM Создаем архив с исходным кодом
powershell -Command "Compress-Archive -Path '%LOCAL_DIR%\*' -DestinationPath 'server_update.zip' -Force"

if %ERRORLEVEL% neq 0 (
    echo Ошибка при создании архива
    pause
    exit /b 1
)

echo Архив создан: server_update.zip

echo 2. Копирование архива на сервер...

REM Копируем архив на сервер
scp -i "%SSH_KEY%" server_update.zip %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/

if %ERRORLEVEL% neq 0 (
    echo Ошибка при копировании архива на сервер
    del server_update.zip
    pause
    exit /b 1
)

echo Архив скопирован на сервер

echo 3. Обновление сервера...

REM Выполняем команды на сервере
ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "cd /root/app && docker-compose down && mkdir -p backup && cp -r * backup/ 2>/dev/null || true && unzip -o server_update.zip && rm server_update.zip && npm install --production && mkdir -p uploads logs ssl && docker-compose up -d && sleep 10 && docker ps && curl -s https://willowe.love/api/health || echo 'API недоступен'"

REM Удаляем локальный архив
del server_update.zip

echo === ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===
echo Проверьте логи сервера: docker logs dating_app_server
pause 