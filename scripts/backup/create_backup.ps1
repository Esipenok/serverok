# Скрипт для создания резервной копии вручную
# Использование: .\create_backup.ps1 [имя_бэкапа]
# Если имя бэкапа не указано, будет использовано текущее время

# Настройки
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"

# Проверяем, указано ли имя бэкапа
$BackupName = $args[0]
if (-not $BackupName) {
    $BackupName = "manual_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

# Переходим в корневую директорию проекта
Set-Location $PSScriptRoot\..\..\
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Cyan

# Создаем скрипт создания бэкапа
Write-Host "Создание скрипта для создания бэкапа..." -ForegroundColor Yellow
$BackupScript = @"
#!/bin/bash
# Скрипт для создания резервной копии вручную

set -e  # Остановка при ошибках

echo "=== СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ ==="
echo "Текущая директория: \$(pwd)"

# Создаем директорию для бэкапов, если её нет
BACKUPS_DIR="backups"
mkdir -p \$BACKUPS_DIR

# Создаем резервную копию в директории backups
echo "Создание резервной копии..."
BACKUP_NAME="$BackupName"
BACKUP_DIR="\${BACKUPS_DIR}/\$BACKUP_NAME"
mkdir -p \$BACKUP_DIR

# Копируем файлы в бэкап
echo "Копирование файлов в бэкап..."
cp -r app.js server.js package.json config auth users matches fast_match marketprofiles qr complain one_night filter_* docker-compose.yml \$BACKUP_DIR/ 2>/dev/null || true

echo "Резервная копия создана в \$BACKUP_DIR"

# Создаем файл с информацией о бэкапе
echo "Создание информации о бэкапе..."
cat > "\$BACKUP_DIR/backup_info.txt" << 'EOF'
Дата создания: $(date)
Описание: Ручной бэкап
Контейнеры:
$(docker ps -a)

Версии:
Node: $(node -v)
NPM: $(npm -v)
EOF

echo "=== СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ ЗАВЕРШЕНО ==="
echo "Бэкап создан: \$BACKUP_NAME"
"@

# Сохраняем скрипт
$BackupScriptPath = "create_backup.sh"
$BackupScript | Out-File -FilePath $BackupScriptPath -Encoding ASCII

# Копируем скрипт на сервер
Write-Host "Копирование скрипта на сервер..." -ForegroundColor Yellow
$ScpCommand = "scp -i `"$SshKey`" $BackupScriptPath ${RemoteUser}@${RemoteHost}:${RemoteDir}/"
Write-Host "Команда: $ScpCommand" -ForegroundColor Cyan

$ScpResult = Invoke-Expression $ScpCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Не удалось скопировать скрипт на сервер" -ForegroundColor Red
    Remove-Item $BackupScriptPath -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Скрипт создания бэкапа скопирован на сервер" -ForegroundColor Green

# Запускаем скрипт создания бэкапа на сервере
Write-Host "Запуск создания бэкапа на сервере..." -ForegroundColor Yellow
$SshCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"cd ${RemoteDir} && chmod +x create_backup.sh && bash create_backup.sh`""
Write-Host "Команда: $SshCommand" -ForegroundColor Cyan

$SshResult = Invoke-Expression $SshCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Проблема при создании бэкапа на сервере" -ForegroundColor Red
    Write-Host "Проверьте логи сервера для деталей" -ForegroundColor Yellow
    exit 1
}

# Очистка временных файлов
Write-Host "Очистка временных файлов..." -ForegroundColor Yellow
Remove-Item $BackupScriptPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   СОЗДАНИЕ БЭКАПА ЗАВЕРШЕНО" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Создан бэкап: $BackupName" -ForegroundColor Green
Write-Host ""
Write-Host "Для просмотра списка бэкапов выполните:" -ForegroundColor Yellow
Write-Host ".\list_backups.ps1" -ForegroundColor Cyan
Write-Host "" 