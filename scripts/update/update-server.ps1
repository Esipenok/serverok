# Скрипт обновления сервера Willowe
# Автоматически создает архив, загружает на сервер и перезапускает контейнер

param(
    [string]$ServerIP = "46.62.131.90",
    [string]$SSHKey = "C:\Users\Andrey\.ssh\id_ed25519",
    [string]$Username = "root"
)

Write-Host "🚀 Начинаем обновление сервера Willowe..." -ForegroundColor Green

# Функция для выполнения SSH команд
function Invoke-SSHCommand {
    param([string]$Command)
    $sshCmd = "ssh -i `"$SSHKey`" ${Username}@${ServerIP} `"$Command`""
    Write-Host "Выполняем: $Command" -ForegroundColor Yellow
    Invoke-Expression $sshCmd
}

# Функция для загрузки файла на сервер
function Upload-File {
    param([string]$LocalPath, [string]$RemotePath)
    $scpCmd = "scp -i `"$SSHKey`" `"$LocalPath`" ${Username}@${ServerIP}:$RemotePath"
    Write-Host "Загружаем: $LocalPath -> $RemotePath" -ForegroundColor Yellow
    Invoke-Expression $scpCmd
}

try {
    # Шаг 1: Проверяем и устанавливаем недостающие зависимости
    Write-Host "📦 Проверяем зависимости..." -ForegroundColor Cyan
    
    # Переходим в папку src для установки зависимостей
    Push-Location "src"
    
    # Список необходимых зависимостей
    $requiredDeps = @(
        "kafkajs",
        "prom-client"
    )
    
    foreach ($dep in $requiredDeps) {
        $installed = npm list $dep --depth=0 2>$null
        if (-not $installed -or $installed -match "empty") {
            Write-Host "Устанавливаем $dep..." -ForegroundColor Yellow
            npm install $dep --save
        } else {
            Write-Host "✅ $dep уже установлен" -ForegroundColor Green
        }
    }
    
    # Возвращаемся в корневую папку
    Pop-Location
    
    # Шаг 2: Создаем архив только из папки src
    Write-Host "📦 Создаем архив проекта..." -ForegroundColor Cyan
    $archiveName = "willowe-update-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    
    # Удаляем старые архивы
    Get-ChildItem -Path . -Name "willowe-update-*.zip" | ForEach-Object {
        Remove-Item $_ -Force
        Write-Host "Удален старый архив: $_" -ForegroundColor Gray
    }
    
    # Создаем архив только из папки src, исключая infrastructure/uploads
    $srcItems = Get-ChildItem -Path "src" -Exclude node_modules,*.zip,infrastructure/uploads | ForEach-Object { $_.FullName }
    Compress-Archive -Path $srcItems -DestinationPath $archiveName -Force
    
    if (Test-Path $archiveName) {
        Write-Host "✅ Архив создан: $archiveName" -ForegroundColor Green
    } else {
        throw "Ошибка создания архива"
    }
    
    # Шаг 3: Загружаем архив на сервер
    Write-Host "📤 Загружаем архив на сервер..." -ForegroundColor Cyan
    Upload-File -LocalPath $archiveName -RemotePath "/root/"
    
    # Шаг 4: Обновляем файлы на сервере, сохраняя infrastructure
    Write-Host "🔄 Обновляем файлы на сервере..." -ForegroundColor Cyan
    
    # Создаем временную папку для распаковки
    Invoke-SSHCommand "mkdir -p /root/temp_update"
    
    # Распаковываем архив во временную папку
    Invoke-SSHCommand "cd /root && unzip -o $archiveName -d /root/temp_update"
    
    # Сохраняем папку infrastructure/uploads
    Invoke-SSHCommand "if [ -d '/root/app/src/infrastructure/uploads' ]; then cp -r /root/app/src/infrastructure/uploads /root/temp_uploads; fi"
    
    # Удаляем старые файлы, кроме infrastructure
    Invoke-SSHCommand "cd /root/app && find . -mindepth 1 -not -path './src/infrastructure*' -delete"
    
    # Копируем новые файлы
    Invoke-SSHCommand "cp -r /root/temp_update/* /root/app/"
    
    # Восстанавливаем папку infrastructure/uploads если она была
    Invoke-SSHCommand "if [ -d '/root/temp_uploads' ]; then mkdir -p /root/app/src/infrastructure/uploads && cp -r /root/temp_uploads/* /root/app/src/infrastructure/uploads/; fi"
    
    # Очищаем временные файлы
    Invoke-SSHCommand "rm -rf /root/temp_update /root/temp_uploads"
    
    # Шаг 5: Перезапускаем контейнер
    Write-Host "🔄 Перезапускаем контейнер..." -ForegroundColor Cyan
    Invoke-SSHCommand "docker stop dating_app_server 2>/dev/null; docker rm dating_app_server 2>/dev/null"
    
    # Запускаем новый контейнер
    $dockerRunCmd = "docker run -d --name dating_app_server --network docker_app-network -p 3000:3000 -v /root/app:/app -w /app/src -e NODE_ENV=production -e PORT=3000 -e MONGODB_URI=mongodb://admin:password@dating_app_mongodb:27017/dating_app?authSource=admin -e JWT_SECRET=your_secret_key -e JWT_EXPIRE=7d -e BASE_URL=https://willowe.love -e STATIC_URL=https://willowe.love -e REDIS_URL=redis://dating_app_redis:6379 -e KAFKA_BROKER=dating_app_kafka:9092 -e KAFKA_CLIENT_ID=dating_app_producer -e KAFKA_GROUP_ID=dating_app_consumer node:18 bash -c 'npm install --production && node scripts/setup-kafka-topics.js && node server.js'"
    
    Invoke-SSHCommand $dockerRunCmd
    
    # Шаг 6: Проверяем статус
    Write-Host "🔍 Проверяем статус контейнера..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    $status = Invoke-SSHCommand "docker ps -a | grep dating_app_server"
    Write-Host "Статус контейнера: $status" -ForegroundColor White
    
    # Шаг 7: Проверяем логи
    Write-Host "📋 Последние логи контейнера:" -ForegroundColor Cyan
    $logs = Invoke-SSHCommand "docker logs dating_app_server --tail 20"
    Write-Host $logs -ForegroundColor White
    
    # Шаг 8: Проверяем доступность сервера
    Write-Host "🌐 Проверяем доступность сервера..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://${ServerIP}:3000/api/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Сервер доступен и отвечает!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Сервер отвечает, но статус: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Сервер пока недоступен (это нормально при первом запуске)" -ForegroundColor Yellow
    }
    
    # Шаг 9: Очистка
    Write-Host "🧹 Очищаем временные файлы..." -ForegroundColor Cyan
    Remove-Item $archiveName -Force
    Invoke-SSHCommand "rm -f /root/$archiveName"
    
    Write-Host "🎉 Обновление завершено!" -ForegroundColor Green
    Write-Host "Сервер: http://${ServerIP}:3000" -ForegroundColor Cyan
    Write-Host "Health check: http://${ServerIP}:3000/api/health" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Ошибка при обновлении: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Полная ошибка: $($_.Exception)" -ForegroundColor Red
    exit 1
} 