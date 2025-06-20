# Скрипт для обновления удаленного сервера (PowerShell)
# Использование: .\update_server.ps1

# Настройки
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"
$LocalDir = ".\server"

Write-Host "=== ОБНОВЛЕНИЕ УДАЛЕННОГО СЕРВЕРА ===" -ForegroundColor Yellow

# Проверяем наличие SSH ключа
if (-not (Test-Path $SshKey)) {
    Write-Host "Ошибка: SSH ключ не найден: $SshKey" -ForegroundColor Red
    exit 1
}

# Проверяем наличие локальной директории
if (-not (Test-Path $LocalDir)) {
    Write-Host "Ошибка: Локальная директория не найдена: $LocalDir" -ForegroundColor Red
    exit 1
}

Write-Host "1. Создание архива с исходным кодом..." -ForegroundColor Yellow

# Создаем архив с исходным кодом
try {
    Compress-Archive -Path "$LocalDir\*" -DestinationPath "server_update.zip" -Force
    Write-Host "Архив создан: server_update.zip" -ForegroundColor Green
} catch {
    Write-Host "Ошибка при создании архива: $_" -ForegroundColor Red
    exit 1
}

Write-Host "2. Копирование архива на сервер..." -ForegroundColor Yellow

# Копируем архив на сервер
try {
    scp -i $SshKey "server_update.zip" "${RemoteUser}@${RemoteHost}:${RemoteDir}/"
    Write-Host "Архив скопирован на сервер" -ForegroundColor Green
} catch {
    Write-Host "Ошибка при копировании архива на сервер: $_" -ForegroundColor Red
    Remove-Item "server_update.zip" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "3. Обновление сервера..." -ForegroundColor Yellow

# Выполняем команды на сервере
$SshCommand = @"
echo "=== ОБНОВЛЕНИЕ СЕРВЕРА ==="

# Переходим в директорию приложения
cd /root/app

# Останавливаем контейнеры
echo "Остановка контейнеров..."
docker-compose down

# Создаем резервную копию текущего кода
echo "Создание резервной копии..."
if [ -d "backup" ]; then
    rm -rf backup
fi
mkdir -p backup
cp -r * backup/ 2>/dev/null || true

# Распаковываем новый архив
echo "Распаковка нового кода..."
unzip -o server_update.zip

# Удаляем архив
rm server_update.zip

# Устанавливаем зависимости
echo "Установка зависимостей..."
npm install --production

# Создаем необходимые директории
mkdir -p uploads logs ssl

# Запускаем контейнеры
echo "Запуск контейнеров..."
docker-compose up -d

# Ждем запуска
echo "Ожидание запуска серверов..."
sleep 10

# Проверяем статус
echo "Проверка статуса контейнеров..."
docker ps

# Проверяем работоспособность API
echo "Проверка API..."
curl -s https://willowe.love/api/health || echo "API недоступен"

echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ==="
"@

try {
    ssh -i $SshKey "${RemoteUser}@${RemoteHost}" $SshCommand
} catch {
    Write-Host "Ошибка при выполнении команд на сервере: $_" -ForegroundColor Red
}

# Удаляем локальный архив
Remove-Item "server_update.zip" -ErrorAction SilentlyContinue

Write-Host "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===" -ForegroundColor Green
Write-Host "Проверьте логи сервера: docker logs dating_app_server" -ForegroundColor Yellow 