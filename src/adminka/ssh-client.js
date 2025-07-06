const { NodeSSH } = require('node-ssh');
const path = require('path');

class SSHClient {
    constructor() {
        this.ssh = new NodeSSH();
        this.isConnected = false;
        
        // Определяем правильный путь к ключу
        // В Docker контейнере используем ключ из папки приложения
        const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV || process.env.HOSTNAME;
        const keyPath = isDocker ? '/app/keys/deploy_key' : '/root/adminka/keys/deploy_key';
        
        this.config = {
            host: '46.62.131.90',
            username: 'root',
            privateKeyPath: keyPath,
            password: null
        };
        
        console.log('🔑 SSH конфигурация:', {
            host: this.config.host,
            username: this.config.username,
            privateKeyPath: this.config.privateKeyPath,
            isDocker: isDocker,
            NODE_ENV: process.env.NODE_ENV,
            DOCKER_ENV: process.env.DOCKER_ENV,
            HOSTNAME: process.env.HOSTNAME
        });
    }

    async connect() {
        try {
            if (this.isConnected) {
                return true;
            }

            console.log('Подключение к SSH серверу...');
            
            await this.ssh.connect({
                host: this.config.host,
                username: this.config.username,
                privateKeyPath: this.config.privateKeyPath
            });

            this.isConnected = true;
            console.log('SSH подключение установлено');
            return true;
        } catch (error) {
            console.error('Ошибка SSH подключения:', error);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            this.ssh.dispose();
            this.isConnected = false;
            console.log('SSH подключение закрыто');
        }
    }

    async executeCommand(command) {
        try {
            if (!this.isConnected) {
                const connected = await this.connect();
                if (!connected) {
                    throw new Error('Не удалось подключиться к SSH');
                }
            }

            console.log(`Выполнение команды: ${command}`);
            const result = await this.ssh.execCommand(command);
            
            if (result.stderr) {
                console.warn('SSH stderr:', result.stderr);
            }

            return {
                success: result.code === 0,
                stdout: result.stdout,
                stderr: result.stderr,
                code: result.code
            };
        } catch (error) {
            console.error('Ошибка выполнения SSH команды:', error);
            return {
                success: false,
                stdout: '',
                stderr: error.message,
                code: -1
            };
        }
    }

    async getDockerStatus() {
        const result = await this.executeCommand('docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"');
        
        if (!result.success) {
            throw new Error(`Ошибка получения статуса Docker: ${result.stderr}`);
        }

        const lines = result.stdout.trim().split('\n');
        // Больше не пропускаем заголовок, сразу парсим все строки
        const containers = lines.map(line => {
            const parts = line.split('\t');
            return {
                name: parts[0] || '',
                status: parts[1] || '',
                ports: parts[2] || ''
            };
        });

        return containers;
    }

    async getSystemInfo() {
        try {
            // Получаем информацию о CPU
            const cpuResult = await this.executeCommand('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'');
            
            // Получаем информацию о памяти
            const memResult = await this.executeCommand('free -m | grep Mem');
            
            // Получаем информацию о диске
            const diskResult = await this.executeCommand('df -h / | tail -1');

            // Получаем дополнительную информацию о диске (в байтах)
            const diskBytesResult = await this.executeCommand('df / | tail -1');

            const cpuUsage = parseFloat(cpuResult.stdout.trim()) || 0;
            
            // Парсим информацию о памяти
            const memParts = memResult.stdout.trim().split(/\s+/);
            const totalMem = parseInt(memParts[1]) || 0;
            const usedMem = parseInt(memParts[2]) || 0;
            const freeMem = parseInt(memParts[3]) || 0;
            const memUsagePercent = totalMem > 0 ? ((usedMem / totalMem) * 100).toFixed(2) : 0;

            // Парсим информацию о диске
            const diskParts = diskResult.stdout.trim().split(/\s+/);
            const diskUsagePercent = diskParts[4] ? parseInt(diskParts[4].replace('%', '')) : 0;

            // Парсим информацию о диске в байтах
            const diskBytesParts = diskBytesResult.stdout.trim().split(/\s+/);
            const totalDiskBytes = parseInt(diskBytesParts[1]) * 1024 || 0; // в байтах
            const usedDiskBytes = parseInt(diskBytesParts[2]) * 1024 || 0; // в байтах
            const freeDiskBytes = parseInt(diskBytesParts[3]) * 1024 || 0; // в байтах

            return {
                cpu: {
                    load: cpuUsage,
                    cores: await this.getCPUCount()
                },
                memory: {
                    total: totalMem * 1024 * 1024, // в байтах
                    used: usedMem * 1024 * 1024,
                    free: freeMem * 1024 * 1024,
                    usedPercent: parseFloat(memUsagePercent)
                },
                disk: [{
                    fs: '/',
                    size: diskParts[1] || '0',
                    used: diskParts[2] || '0',
                    usedPercent: diskUsagePercent,
                    totalBytes: totalDiskBytes,
                    usedBytes: usedDiskBytes,
                    freeBytes: freeDiskBytes
                }]
            };
        } catch (error) {
            console.error('Ошибка получения системной информации:', error);
            throw error;
        }
    }

    async getCPUCount() {
        try {
            const result = await this.executeCommand('nproc');
            return parseInt(result.stdout.trim()) || 1;
        } catch (error) {
            console.error('Ошибка получения количества CPU:', error);
            return 1;
        }
    }

    async getServerStatus() {
        try {
            const [dockerStatus, systemInfo] = await Promise.all([
                this.getDockerStatus(),
                this.getSystemInfo()
            ]);

            return {
                timestamp: new Date().toISOString(),
                docker: {
                    containers: dockerStatus
                },
                system: systemInfo
            };
        } catch (error) {
            console.error('Ошибка получения статуса сервера:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const result = await this.executeCommand('echo "SSH connection test successful"');
            return result.success;
        } catch (error) {
            console.error('Ошибка тестирования SSH подключения:', error);
            return false;
        }
    }
}

module.exports = SSHClient; 