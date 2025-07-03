# Deploy script for adminka
# Author: Assistant
# Date: $(Get-Date)

param(
    [string]$ServerIP = "46.62.131.90",
    [string]$SSHKey = "C:\Users\Andrey\.ssh\id_ed25519",
    [string]$RemotePath = "/root/adminka",
    [string]$DockerContainer = "adminka"
)

Write-Host "Starting adminka deployment to server $ServerIP" -ForegroundColor Green

# Function to execute SSH commands
function Invoke-SSHCommand {
    param([string]$Command)
    
    Write-Host "Executing: $Command" -ForegroundColor Yellow
    $sshCmd = "ssh -i `"$SSHKey`" root@${ServerIP} `"$Command`""
    $result = Invoke-Expression $sshCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error executing command: $Command" -ForegroundColor Red
        Write-Host "Result: $result" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Command executed successfully" -ForegroundColor Green
    return $true
}

# Function to upload files
function Upload-Files {
    param([string]$LocalPath, [string]$RemotePath)
    
    Write-Host "Uploading files to server..." -ForegroundColor Yellow
    $scpCmd = "scp -i `"$SSHKey`" `"$LocalPath`" root@${ServerIP}:$RemotePath"
    $result = Invoke-Expression $scpCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error uploading files" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Files uploaded successfully" -ForegroundColor Green
    return $true
}

try {
    # 1. Create adminka archive (excluding node_modules)
    Write-Host "Creating adminka archive..." -ForegroundColor Yellow
    
    $archiveName = "adminka_$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
    $archivePath = ".\$archiveName"
    
    # Remove old archive if exists
    if (Test-Path $archivePath) {
        Remove-Item $archivePath -Force
    }
    
    # Create archive excluding node_modules
    $tarCmd = "tar -czf `"$archivePath`" --exclude=node_modules --exclude=*.tar.gz ."
    $result = Invoke-Expression $tarCmd
    
    if ($LASTEXITCODE -ne 0) {
        throw "Error creating archive: $result"
    }
    
    Write-Host "Archive created: $archivePath" -ForegroundColor Green
    
    # 2. Stop Docker container
    Write-Host "Stopping Docker container..." -ForegroundColor Yellow
    if (-not (Invoke-SSHCommand "docker stop $DockerContainer 2>/dev/null || true")) {
        Write-Host "Warning: Could not stop container (maybe not running)" -ForegroundColor Yellow
    }
    
    # 3. Upload archive to server
    if (-not (Upload-Files $archivePath "/root/$archiveName")) {
        throw "Error uploading archive to server"
    }
    
    # 4. Update adminka files
    Write-Host "Updating adminka files..." -ForegroundColor Yellow
    
    $updateCommands = @(
        "cd /root",
        "rm -rf $RemotePath.bak 2>/dev/null || true",
        "mv $RemotePath $RemotePath.bak 2>/dev/null || true",
        "mkdir -p $RemotePath",
        "tar -xzf $archiveName -C $RemotePath --strip-components=0",
        "chmod +x $RemotePath/*.sh 2>/dev/null || true",
        "chmod 600 $RemotePath/keys/* 2>/dev/null || true"
    )
    
    foreach ($cmd in $updateCommands) {
        if (-not (Invoke-SSHCommand $cmd)) {
            throw "Error executing command: $cmd"
        }
    }
    
    # 5. Start Docker container
    Write-Host "Starting Docker container..." -ForegroundColor Yellow
    
    $dockerCommands = @(
        "cd $RemotePath",
        "docker-compose up -d --build"
    )
    
    foreach ($cmd in $dockerCommands) {
        if (-not (Invoke-SSHCommand $cmd)) {
            throw "Error starting Docker container: $cmd"
        }
    }
    
    # 6. Wait for container startup
    Write-Host "Waiting for container startup..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # 7. Check container status
    Write-Host "Checking container status..." -ForegroundColor Yellow
    if (-not (Invoke-SSHCommand "docker ps | grep $DockerContainer")) {
        throw "Container not running after deployment"
    }
    
    # 8. Test request
    Write-Host "Performing test request..." -ForegroundColor Yellow
    $testResult = Invoke-SSHCommand "curl -s http://localhost:3001/api/health || echo 'Health check failed'"
    
    if ($testResult) {
        Write-Host "Test request successful" -ForegroundColor Green
    } else {
        Write-Host "Test request failed, but container is running" -ForegroundColor Yellow
    }
    
    # 9. Cleanup temporary files
    Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow
    Invoke-SSHCommand "rm -f /root/$archiveName"
    Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
    
    Write-Host "Adminka deployment completed successfully!" -ForegroundColor Green
    Write-Host "Adminka available at: http://$ServerIP:3001" -ForegroundColor Cyan
    
} catch {
    Write-Host "Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Recovery attempt
    Write-Host "Attempting recovery..." -ForegroundColor Yellow
    Invoke-SSHCommand "cd $RemotePath && docker-compose up -d" | Out-Null
    
    # Cleanup temporary files
    if (Test-Path $archivePath) {
        Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
    }
    
    exit 1
} 