@echo off
chcp 65001 >nul
echo 🚀 Запуск деплоя админки...
echo.

REM Проверяем, что мы в правильной папке
if not exist "package.json" (
    echo ❌ Ошибка: package.json не найден. Убедитесь, что вы находитесь в папке adminka
    pause
    exit /b 1
)

REM Запускаем PowerShell скрипт
powershell -ExecutionPolicy Bypass -File "deploy.ps1"

REM Проверяем результат
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Деплой завершен успешно!
) else (
    echo.
    echo ❌ Деплой завершился с ошибкой!
)

pause 