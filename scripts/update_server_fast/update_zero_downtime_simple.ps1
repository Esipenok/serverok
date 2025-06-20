# Скрипт для обновления без простоя сервера (Blue-Green Deployment)
# Использование: .\update_zero_downtime_simple.ps1

# Настройки
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"
$LocalDir = "..\.."

# Цвета для вывода
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "   ОБНОВЛЕНИЕ БЕЗ ПРОСТОЯ СЕРВЕРА" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

# Проверяем наличие SSH ключа
Write-Host "Проверка SSH ключа..." -ForegroundColor $Yellow
if (-not (Test-Path $SshKey)) {
    Write-Host "[ОШИБКА] SSH ключ не найден: $SshKey" -ForegroundColor $Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}
Write-Host "[УСПЕХ] SSH ключ найден" -ForegroundColor $Green

Write-Host ""
Write-Host "[1/4] Создание архива с исходным кодом..." -ForegroundColor $Yellow
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor $Cyan
Write-Host "Локальная директория: $LocalDir" -ForegroundColor $Cyan

# Переходим в директорию сервера
Set-Location $LocalDir
Write-Host "Переход в директорию: $(Get-Location)" -ForegroundColor $Cyan

# Создаем архив с исходным кодом
Write-Host "Создание архива..." -ForegroundColor $Yellow
$TarCommand = "tar --exclude='node_modules' --exclude='.git' --exclude='uploads/*' --exclude='logs/*' --exclude='*.tar.gz' --exclude='*.zip' -czf server_update.tar.gz ."
Write-Host "Команда: $TarCommand" -ForegroundColor $Cyan

$TarResult = Invoke-Expression $TarCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось создать архив" -ForegroundColor $Red
    Write-Host "Код ошибки: $LASTEXITCODE" -ForegroundColor $Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host "[УСПЕХ] Архив создан: server_update.tar.gz" -ForegroundColor $Green
$ArchiveInfo = Get-ChildItem "server_update.tar.gz"
Write-Host "Размер архива: $($ArchiveInfo.Length) байт" -ForegroundColor $Cyan

Write-Host ""
Write-Host "[2/4] Копирование архива на сервер..." -ForegroundColor $Yellow
$ScpCommand = "scp -i `"$SshKey`" server_update.tar.gz ${RemoteUser}@${RemoteHost}:${RemoteDir}/"
Write-Host "Команда: $ScpCommand" -ForegroundColor $Cyan

$ScpResult = Invoke-Expression $ScpCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось скопировать архив на сервер" -ForegroundColor $Red
    Write-Host "Код ошибки: $LASTEXITCODE" -ForegroundColor $Red
    Write-Host "Проверьте:" -ForegroundColor $Yellow
    Write-Host "1. SSH ключ: $SshKey" -ForegroundColor $Yellow
    Write-Host "2. Подключение к серверу: ${RemoteUser}@${RemoteHost}" -ForegroundColor $Yellow
    Write-Host "3. Директорию на сервере: $RemoteDir" -ForegroundColor $Yellow
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host "[УСПЕХ] Архив скопирован на сервер" -ForegroundColor $Green

Write-Host ""
Write-Host "[3/4] Копирование скрипта обновления на сервер..." -ForegroundColor $Yellow

# Копируем bash скрипт на сервер
$ScpScriptCommand = "scp -i `"$SshKey`" update_script.sh ${RemoteUser}@${RemoteHost}:/tmp/"
Write-Host "Команда: $ScpScriptCommand" -ForegroundColor $Cyan

$ScpScriptResult = Invoke-Expression $ScpScriptCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось скопировать скрипт на сервер" -ForegroundColor $Red
    Write-Host "Код ошибки: $LASTEXITCODE" -ForegroundColor $Red
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host "[УСПЕХ] Скрипт скопирован на сервер" -ForegroundColor $Green

Write-Host ""
Write-Host "[4/4] Выполнение обновления на сервере..." -ForegroundColor $Yellow
$SshCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"chmod +x /tmp/update_script.sh && /tmp/update_script.sh`"
Write-Host "Команда: $SshCommand" -ForegroundColor $Cyan

Write-Host "Выполняем команды на сервере..." -ForegroundColor $Yellow
$SshResult = Invoke-Expression $SshCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось выполнить обновление на сервере" -ForegroundColor $Red
    Write-Host "Код ошибки: $LASTEXITCODE" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Проверьте логи сервера:" -ForegroundColor $Yellow
    Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker logs dating_app_server`"" -ForegroundColor $Cyan
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host ""
Write-Host "Очистка временных файлов..." -ForegroundColor $Yellow

# Удаляем локальный архив
Set-Location $LocalDir
Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "   ОБНОВЛЕНИЕ БЕЗ ПРОСТОЯ ЗАВЕРШЕНО" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""
Write-Host "Для проверки логов сервера выполните:" -ForegroundColor $Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker logs dating_app_server`"" -ForegroundColor $Cyan
Write-Host ""
Write-Host "Для проверки статуса контейнеров:" -ForegroundColor $Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker ps`" -ForegroundColor $Cyan
Write-Host ""
Read-Host "Нажмите Enter для выхода" 