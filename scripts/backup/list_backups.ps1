# Скрипт для просмотра списка доступных бэкапов на сервере
# Использование: .\list_backups.ps1

# Настройки
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"

# Переходим в корневую директорию проекта
Set-Location $PSScriptRoot\..\..\
Write-Host "Текущая директория: $(Get-Location)" -ForegroundColor Cyan

# Запрашиваем список бэкапов с сервера
Write-Host "Запрос списка бэкапов с сервера..." -ForegroundColor Yellow
$SshCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"cd ${RemoteDir} && ls -la backups/`""
Write-Host "Команда: $SshCommand" -ForegroundColor Cyan

$BackupsList = Invoke-Expression $SshCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка: Не удалось получить список бэкапов с сервера" -ForegroundColor Red
    exit 1
}

# Выводим список бэкапов
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   СПИСОК ДОСТУПНЫХ БЭКАПОВ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$BackupsList | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "Для восстановления из бэкапа выполните:" -ForegroundColor Yellow
Write-Host ".\restore_backup.ps1 [имя_бэкапа]" -ForegroundColor Cyan
Write-Host ""
Write-Host "Например:" -ForegroundColor Yellow
Write-Host ".\restore_backup.ps1 backup_20250620_085130" -ForegroundColor Cyan
Write-Host ""
Write-Host "Если имя бэкапа не указано, будет использован последний доступный бэкап" -ForegroundColor Yellow
Write-Host "" 