# Willowe Admin Panel Backup Script
# Creates backup of admin panel including scripts folder

param(
    [string]$ServerIP = "46.62.131.90",
    [string]$SSHKey = "C:\Users\Andrey\.ssh\id_ed25519",
    [string]$Username = "root",
    [string]$BackupName = ""
)

Write-Host "Starting Willowe admin panel backup..." -ForegroundColor Green

function Invoke-SSHCommand {
    param([string]$Command)
    $sshCmd = "ssh -i `"$SSHKey`" ${Username}@${ServerIP} `"$Command`""
    Write-Host "Executing: $Command" -ForegroundColor Yellow
    Invoke-Expression $sshCmd
}

function Download-File {
    param([string]$RemotePath, [string]$LocalPath)
    $scpCmd = "scp -i `"$SSHKey`" ${Username}@${ServerIP}:$RemotePath `"$LocalPath`""
    Write-Host "Downloading: $RemotePath -> $LocalPath" -ForegroundColor Yellow
    Invoke-Expression $scpCmd
}

try {
    # Generate backup name if not provided
    if ([string]::IsNullOrEmpty($BackupName)) {
        $BackupName = "willowe-admin-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }
    
    $ServerBackupPath = "/root/app/adminka/backups"
    $LocalBackupPath = "C:\progects\willowe\src\adminka\backups"
    
    # Create local backup directory if it doesn't exist
    if (-not (Test-Path $LocalBackupPath)) {
        New-Item -ItemType Directory -Path $LocalBackupPath -Force
        Write-Host "Created local backup directory: $LocalBackupPath" -ForegroundColor Green
    }
    
    # 1. Create backup on server (including scripts folder, excluding logs, backups, node_modules)
    Write-Host "Creating backup on server..." -ForegroundColor Cyan
    Invoke-SSHCommand "mkdir -p $ServerBackupPath"
    
    # Remove old backup with same name if exists
    Invoke-SSHCommand "rm -f $ServerBackupPath/${BackupName}.zip"
    
    # Create backup excluding logs, backups, node_modules but including scripts
    Invoke-SSHCommand "cd /root/app/adminka; zip -r $ServerBackupPath/${BackupName}.zip . -x 'backups/*' -x 'logs/*' -x 'node_modules/*'"
    
    # 2. Download backup to local machine
    Write-Host "Downloading backup to local machine..." -ForegroundColor Cyan
    $LocalBackupFile = "$LocalBackupPath\${BackupName}.zip"
    Download-File -RemotePath "$ServerBackupPath/${BackupName}.zip" -LocalPath $LocalBackupFile
    
    if (Test-Path $LocalBackupFile) {
        $fileSize = (Get-Item $LocalBackupFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "Backup downloaded successfully: $LocalBackupFile" -ForegroundColor Green
        Write-Host "Backup size: $fileSizeMB MB" -ForegroundColor Green
    } else {
        throw "Failed to download backup file"
    }
    
    # 3. Verify backup contents
    Write-Host "Verifying backup contents..." -ForegroundColor Cyan
    try {
        $backupContents = Get-ChildItem -Path $LocalBackupFile -ErrorAction Stop
        Write-Host "Backup file exists and is accessible" -ForegroundColor Green
        
        # Try to extract and check if scripts folder is included
        $tempExtractPath = "$env:TEMP\backup-verify-$(Get-Random)"
        New-Item -ItemType Directory -Path $tempExtractPath -Force | Out-Null
        
        Expand-Archive -Path $LocalBackupFile -DestinationPath $tempExtractPath -Force
        
        if (Test-Path "$tempExtractPath\scripts") {
            Write-Host "✓ Scripts folder found in backup" -ForegroundColor Green
        } else {
            Write-Host "⚠ Scripts folder not found in backup" -ForegroundColor Yellow
        }
        
        if (Test-Path "$tempExtractPath\server.js") {
            Write-Host "✓ Main server file found in backup" -ForegroundColor Green
        } else {
            Write-Host "⚠ Main server file not found in backup" -ForegroundColor Yellow
        }
        
        # Cleanup temp directory
        Remove-Item -Path $tempExtractPath -Recurse -Force
        
    } catch {
        Write-Host "Warning: Could not verify backup contents: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # 4. List available backups
    Write-Host "Available backups:" -ForegroundColor Cyan
    $localBackups = Get-ChildItem -Path $LocalBackupPath -Filter "*.zip" | Sort-Object LastWriteTime -Descending
    foreach ($backup in $localBackups) {
        $size = [math]::Round($backup.Length / 1MB, 2)
        $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "  $($backup.Name) ($size MB, $date)" -ForegroundColor White
    }
    
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    Write-Host "Backup location: $LocalBackupFile" -ForegroundColor Cyan
    Write-Host "Server backup location: $ServerBackupPath/${BackupName}.zip" -ForegroundColor Cyan

} catch {
    Write-Host "Error during backup: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full error: $($_.Exception)" -ForegroundColor Red
    exit 1
} 