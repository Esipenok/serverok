@echo off
echo === ВЫБОРОЧНОЕ ОБНОВЛЕНИЕ СЕРВЕРА ===

REM Настройки
set REMOTE_USER=root
set REMOTE_HOST=46.62.131.90
set REMOTE_DIR=/root/app
set SSH_KEY=C:\Users\Andrey\.ssh\id_ed25519
set LOCAL_DIR=.\server

echo Выберите тип обновления:
echo 1. Полное обновление (все файлы)
echo 2. Только код (без конфигурации)
echo 3. Только конфигурация
echo 4. Только маршруты
echo 5. Только middleware
set /p choice="Введите номер (1-5): "

if "%choice%"=="1" goto full_update
if "%choice%"=="2" goto code_only
if "%choice%"=="3" goto config_only
if "%choice%"=="4" goto routes_only
if "%choice%"=="5" goto middleware_only

echo Неверный выбор
pause
exit /b 1

:full_update
echo Выполняется полное обновление...
call update_server.bat
goto end

:code_only
echo Обновление только кода...
powershell -Command "Compress-Archive -Path '%LOCAL_DIR%\*.js', '%LOCAL_DIR%\*.json', '%LOCAL_DIR%\package.json' -DestinationPath 'code_update.zip' -Force"
scp -i "%SSH_KEY%" code_update.zip %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/
ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "cd /root/app && docker-compose down && unzip -o code_update.zip && rm code_update.zip && npm install --production && docker-compose up -d"
del code_update.zip
goto end

:config_only
echo Обновление только конфигурации...
scp -i "%SSH_KEY%" "%LOCAL_DIR%\config\*" %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/config/
ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "cd /root/app && docker-compose restart app"
goto end

:routes_only
echo Обновление только маршрутов...
scp -i "%SSH_KEY%" -r "%LOCAL_DIR%\auth\routes" %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/auth/
scp -i "%SSH_KEY%" -r "%LOCAL_DIR%\users\routes" %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/users/
scp -i "%SSH_KEY%" -r "%LOCAL_DIR%\matches\routes" %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/matches/
ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "cd /root/app && docker-compose restart app"
goto end

:middleware_only
echo Обновление только middleware...
scp -i "%SSH_KEY%" -r "%LOCAL_DIR%\auth\middleware" %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/auth/
scp -i "%SSH_KEY%" -r "%LOCAL_DIR%\security" %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/
ssh -i "%SSH_KEY%" %REMOTE_USER%@%REMOTE_HOST% "cd /root/app && docker-compose restart app"
goto end

:end
echo === ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===
pause 