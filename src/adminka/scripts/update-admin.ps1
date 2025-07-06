# Willowe Admin Panel Update Script
# Preserves logs folder on server

param(
    [string]$ServerIP = "46.62.131.90",
    [string]$SSHKey = "C:\Users\Andrey\.ssh\id_ed25519",
    [string]$Username = "root"
)

Write-Host "Starting Willowe admin panel update..." -ForegroundColor Green

function Invoke-SSHCommand {
    param([string]$Command)
    $sshCmd = "ssh -i `"$SSHKey`" ${Username}@${ServerIP} `"$Command`""
    Write-Host "Executing: $Command" -ForegroundColor Yellow
    Invoke-Expression $sshCmd
}

function Upload-File {
    param([string]$LocalPath, [string]$RemotePath)
    $scpCmd = "scp -i `"$SSHKey`" `"$LocalPath`" ${Username}@${ServerIP}:$RemotePath"
    Write-Host "Uploading: $LocalPath -> $RemotePath" -ForegroundColor Yellow
    Invoke-Expression $scpCmd
}

try {
    # 1. Check dependencies
    Write-Host "Checking dependencies..." -ForegroundColor Cyan
    Push-Location "src/adminka"
    $deps = @("express", "socket.io", "systeminformation")
    foreach ($dep in $deps) {
        $installed = npm list $dep --depth=0 2>$null
        if (-not $installed -or $installed -match "empty") {
            Write-Host "Installing $dep..." -ForegroundColor Yellow
            npm install $dep --save
        } else {
            Write-Host "OK $dep already installed" -ForegroundColor Green
        }
    }
    Pop-Location

    # 2. Create archive (excluding node_modules, logs, backups, but including scripts)
    Write-Host "Creating archive..." -ForegroundColor Cyan
    $archiveName = "willowe-admin-update-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    Get-ChildItem -Path . -Name "willowe-admin-update-*.zip" | ForEach-Object { Remove-Item $_ -Force }
    $adminItems = Get-ChildItem -Path "src/adminka" -Exclude node_modules,logs,backups,*.zip | ForEach-Object { $_.FullName }
    Compress-Archive -Path $adminItems -DestinationPath $archiveName -Force
    if (Test-Path $archiveName) {
        Write-Host "Archive created: $archiveName" -ForegroundColor Green
    } else {
        throw "Failed to create archive"
    }

    # 3. Upload archive to server
    Write-Host "Uploading archive to server..." -ForegroundColor Cyan
    Upload-File -LocalPath $archiveName -RemotePath "/root/"

    # 4. Create backup on server (excluding backups and logs)
    Write-Host "Creating backup on server..." -ForegroundColor Cyan
    Invoke-SSHCommand "mkdir -p /root/app/adminka/backups"
    Invoke-SSHCommand "rm -f /root/app/adminka/backups/adminka-backup.zip"
    Invoke-SSHCommand "cd /root/app/adminka; zip -r backups/adminka-backup.zip . -x 'backups/*' -x 'logs/*'"

    # 5. Update files on server
    Write-Host "Updating files on server..." -ForegroundColor Cyan
    Invoke-SSHCommand "mkdir -p /root/temp_admin_update"
    Invoke-SSHCommand "unzip -o /root/$archiveName -d /root/temp_admin_update"
    # Remove everything except logs, backups и analytics-data.json
    Invoke-SSHCommand "cd /root/app/adminka; find . -mindepth 1 -not -path './logs*' -not -path './backups*' -not -path './analytics/analytics-data.json' -delete"
    # Copy new files
    Invoke-SSHCommand "cp -r /root/temp_admin_update/* /root/app/adminka/"
    Invoke-SSHCommand "rm -rf /root/temp_admin_update"

    # 6. Restart container
    Write-Host "Restarting container..." -ForegroundColor Cyan
    Invoke-SSHCommand "docker stop willowe_admin_panel 2>/dev/null; docker rm willowe_admin_panel 2>/dev/null"
    $dockerRunCmd = "docker run -d --name willowe_admin_panel --network docker_app-network -p 3001:3001 -v /root/app/adminka:/app -w /app -e NODE_ENV=production -e PORT=3001 node:18 sh -c 'npm install --production; node server.js'"
    Invoke-SSHCommand $dockerRunCmd

    # 7. Check status
    Write-Host "Checking container status..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    $status = Invoke-SSHCommand "docker ps -a | grep willowe_admin_panel"
    Write-Host "Container status: $status" -ForegroundColor White
    $logs = Invoke-SSHCommand "docker logs willowe_admin_panel --tail 20"
    Write-Host $logs -ForegroundColor White

    # 8. Check availability
    Write-Host "Checking availability..." -ForegroundColor Cyan
    $isAvailable = $false
    try {
        $response = Invoke-WebRequest -Uri "http://${ServerIP}:3001" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "Admin panel is available!" -ForegroundColor Green
            $isAvailable = $true
        } else {
            Write-Host "Admin panel responds but status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Admin panel not available yet (normal on first startup)" -ForegroundColor Yellow
    }

    # 9. Cleanup
    Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
    Remove-Item $archiveName -Force
    Invoke-SSHCommand "rm -f /root/$archiveName"
    Write-Host "Update completed! Admin panel: http://${ServerIP}:3001" -ForegroundColor Cyan

} catch {
    Write-Host "Error during update: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full error: $($_.Exception)" -ForegroundColor Red
    exit 1
} 