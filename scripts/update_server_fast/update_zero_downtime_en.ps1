# Zero Downtime Server Update Script (Blue-Green Deployment)
# Usage: .\update_zero_downtime_en.ps1

# Settings
$RemoteUser = "root"
$RemoteHost = "46.62.131.90"
$RemoteDir = "/root/app"
$SshKey = "C:\Users\Andrey\.ssh\id_ed25519"
$LocalDir = "..\.."

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "   ZERO DOWNTIME SERVER UPDATE" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

# Check SSH key
Write-Host "Checking SSH key..." -ForegroundColor $Yellow
if (-not (Test-Path $SshKey)) {
    Write-Host "[ERROR] SSH key not found: $SshKey" -ForegroundColor $Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[SUCCESS] SSH key found" -ForegroundColor $Green

Write-Host ""
Write-Host "[1/4] Creating source code archive..." -ForegroundColor $Yellow
Write-Host "Current directory: $(Get-Location)" -ForegroundColor $Cyan
Write-Host "Local directory: $LocalDir" -ForegroundColor $Cyan

# Go to server directory
Set-Location $LocalDir
Write-Host "Changed to directory: $(Get-Location)" -ForegroundColor $Cyan

# Create archive with source code
Write-Host "Creating archive..." -ForegroundColor $Yellow
$TarCommand = "tar --exclude='node_modules' --exclude='.git' --exclude='uploads/*' --exclude='logs/*' --exclude='*.tar.gz' --exclude='*.zip' -czf server_update.tar.gz ."
Write-Host "Command: $TarCommand" -ForegroundColor $Cyan

$TarResult = Invoke-Expression $TarCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create archive" -ForegroundColor $Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor $Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[SUCCESS] Archive created: server_update.tar.gz" -ForegroundColor $Green
$ArchiveInfo = Get-ChildItem "server_update.tar.gz"
Write-Host "Archive size: $($ArchiveInfo.Length) bytes" -ForegroundColor $Cyan

Write-Host ""
Write-Host "[2/4] Copying archive to server..." -ForegroundColor $Yellow
$ScpCommand = "scp -i `"$SshKey`" server_update.tar.gz ${RemoteUser}@${RemoteHost}:${RemoteDir}/"
Write-Host "Command: $ScpCommand" -ForegroundColor $Cyan

$ScpResult = Invoke-Expression $ScpCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to copy archive to server" -ForegroundColor $Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor $Red
    Write-Host "Check:" -ForegroundColor $Yellow
    Write-Host "1. SSH key: $SshKey" -ForegroundColor $Yellow
    Write-Host "2. Server connection: ${RemoteUser}@${RemoteHost}" -ForegroundColor $Yellow
    Write-Host "3. Server directory: $RemoteDir" -ForegroundColor $Yellow
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[SUCCESS] Archive copied to server" -ForegroundColor $Green

Write-Host ""
Write-Host "[3/4] Copying update script to server..." -ForegroundColor $Yellow

# Copy bash script to server
$ScpScriptCommand = "scp -i `"$SshKey`" update_script.sh ${RemoteUser}@${RemoteHost}:/tmp/"
Write-Host "Command: $ScpScriptCommand" -ForegroundColor $Cyan

$ScpScriptResult = Invoke-Expression $ScpScriptCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to copy script to server" -ForegroundColor $Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor $Red
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[SUCCESS] Script copied to server" -ForegroundColor $Green

Write-Host ""
Write-Host "[4/4] Executing update on server..." -ForegroundColor $Yellow
$SshCommand = "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"chmod +x /tmp/update_script.sh && /tmp/update_script.sh`"
Write-Host "Command: $SshCommand" -ForegroundColor $Cyan

Write-Host "Executing commands on server..." -ForegroundColor $Yellow
$SshResult = Invoke-Expression $SshCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to execute update on server" -ForegroundColor $Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Check server logs:" -ForegroundColor $Yellow
    Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker logs dating_app_server`"" -ForegroundColor $Cyan
    Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Cleaning temporary files..." -ForegroundColor $Yellow

# Remove local archive
Set-Location $LocalDir
Remove-Item "server_update.tar.gz" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "   ZERO DOWNTIME UPDATE COMPLETED" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""
Write-Host "To check server logs:" -ForegroundColor $Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker logs dating_app_server`"" -ForegroundColor $Cyan
Write-Host ""
Write-Host "To check container status:" -ForegroundColor $Yellow
Write-Host "ssh -i `"$SshKey`" ${RemoteUser}@${RemoteHost} `"docker ps`" -ForegroundColor $Cyan
Write-Host ""
Read-Host "Press Enter to exit" 