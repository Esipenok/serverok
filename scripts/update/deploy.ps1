# Скрипт для подготовки и отправки файлов на сервер
# Использование: .\deploy.ps1

# Настройки
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"
$LocalDir = ".."  # Относительно папки scripts

# Переходим в корневую директорию проекта
Set-Location $LocalDir
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Cyan

# Создаем архив с исходным кодом
Write-Host "Создание архива с исходным кодом..." -ForegroundColor Yellow
$TarCommand = "tar --exclude='node_modules' --exclude='.git' --exclude='uploads/*' --exclude='logs/*' --exclude='backups/*' --exclude='ssl/*' --exclude='*.tar.gz' --exclude='*.zip' --exclude='temp/*' --exclude='.vscode' --exclude='.idea' --exclude='*.log' --exclude='restore_server.sh' --exclude='create_backup.sh' -czf server_update.tar.gz ."
Write-Host "Команда: $TarCommand" -ForegroundColor Cyan

$TarResult = Invoke-Expression $TarCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Не удалось создать архив" -ForegroundColor Red
    exit 1
}

$ArchiveInfo = Get-ChildItem "server_update.tar.gz"
Write-Host "Архив создан: server_update.tar.gz (Размер: $([math]::Round($ArchiveInfo.Length / 1MB, 2)) МБ)" -ForegroundColor Green

# Копируем архив на сервер
Write-Host "Копирование архива на сервер..." -ForegroundColor Yellow
$ScpCommand = "scp -C -i `"$SshKey`" server_update.tar.gz ${RemoteUser}@${RemoteHost}:${RemoteDir}/"
Write-Host "Команда: $ScpCommand" -ForegroundColor Cyan

$ScpResult = Invoke-Expression $ScpCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Не удалось скопировать архив на сервер" -ForegroundColor Red
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Архив скопирован на сервер" -ForegroundColor Green

# Копируем скрипт обновления на сервер
Write-Host "Копирование скрипта обновления на сервер..." -ForegroundColor Yellow
$ScpScriptCommand = "scp -i `"$SshKey`" scripts/update/simple_update.sh ${RemoteUser}@${RemoteHost}:${RemoteDir}/"
Write-Host "Команда: $ScpScriptCommand" -ForegroundColor Cyan

$ScpScriptResult = Invoke-Expression $ScpScriptCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Не удалось скопировать скрипт на сервер" -ForegroundColor Red
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Скрипт обновления скопирован на сервер" -ForegroundColor Green

# Запускаем скрипт обновления на сервере
Write-Host "Запуск обновления на сервере..." -ForegroundColor Yellow
$SshCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"cd ${RemoteDir} && chmod +x simple_update.sh && bash simple_update.sh`""
Write-Host "Команда: $SshCommand" -ForegroundColor Cyan

$SshResult = Invoke-Expression $SshCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Проблема при выполнении обновления на сервере" -ForegroundColor Red
    Write-Host "Проверьте логи сервера для деталей" -ForegroundColor Yellow
    exit 1
}

# Очистка временных файлов
Write-Host "Очистка временных файлов..." -ForegroundColor Yellow
Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ОБНОВЛЕНИЕ ЗАВЕРШЕНО" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для проверки логов сервера выполните:" -ForegroundColor Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker logs dating_app_server`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для проверки статуса контейнеров:" -ForegroundColor Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker ps`"" -ForegroundColor Cyan
Write-Host "" 