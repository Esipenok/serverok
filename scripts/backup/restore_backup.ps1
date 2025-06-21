# Скрипт для восстановления сервера из резервной копии
# Использование: .\restore_backup.ps1 [имя_бэкапа]
# Если имя бэкапа не указано, будет использован последний доступный бэкап

# Настройки
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"
$BackupDir = "backups"

# Проверяем, указано ли имя бэкапа
$BackupName = $args[0]

# Если имя бэкапа не указано, получаем список доступных бэкапов с сервера
if (-not $BackupName) {
    Write-Host "Имя бэкапа не указано, получаем список доступных бэкапов с сервера..." -ForegroundColor Yellow
    
    $BackupsCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"cd ${RemoteDir} && ls -1 ${BackupDir} | sort -r | head -n 1`""
    $BackupName = Invoke-Expression $BackupsCommand
    
    if (-not $BackupName) {
        Write-Host "Ошибка: Не удалось найти доступные бэкапы на сервере" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Найден последний бэкап: $BackupName" -ForegroundColor Green
}

# Переходим в корневую директорию проекта
Set-Location $PSScriptRoot\..\..\
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Cyan

# Создаем скрипт восстановления
Write-Host "Создание скрипта восстановления..." -ForegroundColor Yellow

# Создаем простой bash-скрипт для восстановления
$bashScript = @'
#!/bin/bash

echo "=== ВОССТАНОВЛЕНИЕ СЕРВЕРА ИЗ БЭКАПА ==="
echo "Текущая директория: $(pwd)"

# Параметры
BACKUP_DIR="backups"
BACKUP_NAME="BACKUP_NAME_PLACEHOLDER"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Проверяем наличие бэкапа
if [ ! -d "$BACKUP_PATH" ]; then
  echo "Ошибка: Бэкап '$BACKUP_NAME' не найден"
  echo "Доступные бэкапы:"
  ls -1 "$BACKUP_DIR"
  exit 1
fi

echo "Используем бэкап: $BACKUP_NAME"
echo "Путь к бэкапу: $BACKUP_PATH"

# Останавливаем контейнеры
echo "Останавливаем контейнеры Docker..."
docker-compose down

# Создаем временную директорию для сохранения важных файлов
echo "Сохранение важных файлов..."
mkdir -p temp_save
cp -r .env uploads logs temp_save/ 2>/dev/null || true

# Удаляем текущие файлы проекта
echo "Удаление текущих файлов проекта..."
rm -rf app.js server.js package.json config auth users matches fast_match marketprofiles qr complain one_night filter_* docker-compose.yml

# Восстанавливаем файлы из бэкапа
echo "Восстановление файлов из бэкапа..."
cp -r "$BACKUP_PATH"/* . 2>/dev/null || true

# Восстанавливаем сохраненные файлы
echo "Восстановление сохраненных файлов..."
cp -r temp_save/* . 2>/dev/null || true
rm -rf temp_save

# Устанавливаем зависимости
echo "Установка зависимостей..."
npm install --production

# Запускаем контейнеры
echo "Запуск контейнеров Docker..."
docker-compose up -d

# Ждем запуска
echo "Ожидание запуска сервера (10 секунд)..."
sleep 10

# Проверяем статус
echo "Проверка статуса контейнеров..."
docker ps

# Проверяем работоспособность API
echo "Проверка API..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "FAIL")
echo "Ответ от API: $HEALTH_CHECK"

if [[ "$HEALTH_CHECK" == *"success"* ]]; then
  echo "✅ API работает корректно"
else
  echo "⚠️ API не отвечает или отвечает с ошибкой"
  echo "Проверьте логи: docker logs dating_app_server"
fi

echo "=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ==="
'@

# Заменяем плейсхолдер на имя бэкапа
$bashScript = $bashScript.Replace("BACKUP_NAME_PLACEHOLDER", $BackupName)

# Преобразуем Windows переносы строк (CRLF) в Unix (LF)
$bashScript = $bashScript.Replace("`r`n", "`n")

# Сохраняем скрипт
$RestoreScriptPath = "restore_server.sh"
[System.IO.File]::WriteAllText($RestoreScriptPath, $bashScript)

# Копируем скрипт на сервер
Write-Host "Копирование скрипта на сервер..." -ForegroundColor Yellow
$ScpCommand = "scp -i `"$SshKey`" $RestoreScriptPath ${RemoteUser}@${RemoteHost}:${RemoteDir}/"
Write-Host "Команда: $ScpCommand" -ForegroundColor Cyan

$ScpResult = Invoke-Expression $ScpCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Не удалось скопировать скрипт на сервер" -ForegroundColor Red
    Remove-Item $RestoreScriptPath -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Скрипт восстановления скопирован на сервер" -ForegroundColor Green

# Запускаем скрипт восстановления на сервере
Write-Host "Запуск восстановления на сервере..." -ForegroundColor Yellow
$SshCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"cd ${RemoteDir} && chmod +x restore_server.sh && bash restore_server.sh`""
Write-Host "Команда: $SshCommand" -ForegroundColor Cyan

$SshResult = Invoke-Expression $SshCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Проблема при выполнении восстановления на сервере" -ForegroundColor Red
    Write-Host "Проверьте логи сервера для деталей" -ForegroundColor Yellow
    exit 1
}

# Очистка временных файлов
Write-Host "Очистка временных файлов..." -ForegroundColor Yellow
Remove-Item $RestoreScriptPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для проверки логов сервера выполните:" -ForegroundColor Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker logs dating_app_server`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для проверки статуса контейнеров:" -ForegroundColor Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker ps`"" -ForegroundColor Cyan
Write-Host "" 