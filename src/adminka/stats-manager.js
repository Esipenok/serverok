const fs = require('fs');
const path = require('path');

class StatsManager {
    constructor() {
        this.stats = {
            cpu: [],
            memory: [],
            disk: []
        };
        this.maxDataPoints = 60; // Храним данные за последний час (60 минут)
        this.statsFile = path.join(__dirname, 'logs', 'stats.json');
        this.loadStatsFromFile();
    }

    // Добавить новую точку данных
    addDataPoint(timestamp, systemData) {
        const dataPoint = {
            timestamp: timestamp,
            value: systemData
        };

        // Добавляем данные CPU
        this.stats.cpu.push({
            timestamp: timestamp,
            load: systemData.cpu.load,
            cores: systemData.cpu.cores
        });

        // Добавляем данные памяти
        this.stats.memory.push({
            timestamp: timestamp,
            total: systemData.memory.total,
            used: systemData.memory.used,
            free: systemData.memory.free,
            usedPercent: systemData.memory.usedPercent
        });

        // Добавляем данные диска
        if (systemData.disk && systemData.disk.length > 0) {
            this.stats.disk.push({
                timestamp: timestamp,
                totalBytes: systemData.disk[0].totalBytes,
                usedBytes: systemData.disk[0].usedBytes,
                freeBytes: systemData.disk[0].freeBytes,
                usedPercent: systemData.disk[0].usedPercent
            });
        }

        // Ограничиваем количество точек данных
        this.limitDataPoints();
        this.saveStatsToFile();
    }

    // Ограничить количество точек данных
    limitDataPoints() {
        if (this.stats.cpu.length > this.maxDataPoints) {
            this.stats.cpu = this.stats.cpu.slice(-this.maxDataPoints);
        }
        if (this.stats.memory.length > this.maxDataPoints) {
            this.stats.memory = this.stats.memory.slice(-this.maxDataPoints);
        }
        if (this.stats.disk.length > this.maxDataPoints) {
            this.stats.disk = this.stats.disk.slice(-this.maxDataPoints);
        }
    }

    // Получить статистику для графиков
    getStatsForCharts() {
        return {
            cpu: {
                labels: this.stats.cpu.map(point => {
                    const date = new Date(point.timestamp);
                    return date.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }),
                data: this.stats.cpu.map(point => point.load)
            },
            memory: {
                labels: this.stats.memory.map(point => {
                    const date = new Date(point.timestamp);
                    return date.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }),
                data: this.stats.memory.map(point => point.usedPercent)
            },
            disk: {
                labels: this.stats.disk.map(point => {
                    const date = new Date(point.timestamp);
                    return date.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }),
                data: this.stats.disk.map(point => point.usedPercent)
            }
        };
    }

    // Получить последние данные
    getLatestData() {
        const latest = {
            cpu: this.stats.cpu.length > 0 ? this.stats.cpu[this.stats.cpu.length - 1] : null,
            memory: this.stats.memory.length > 0 ? this.stats.memory[this.stats.memory.length - 1] : null,
            disk: this.stats.disk.length > 0 ? this.stats.disk[this.stats.disk.length - 1] : null
        };

        return latest;
    }

    // Получить статистику за период
    getStatsForPeriod(hours = 1) {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

        const filterByTime = (data) => {
            return data.filter(point => new Date(point.timestamp) >= cutoffTime);
        };

        return {
            cpu: filterByTime(this.stats.cpu),
            memory: filterByTime(this.stats.memory),
            disk: filterByTime(this.stats.disk)
        };
    }

    // Очистить старые данные
    cleanup() {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 часа

        this.stats.cpu = this.stats.cpu.filter(point => new Date(point.timestamp) >= cutoffTime);
        this.stats.memory = this.stats.memory.filter(point => new Date(point.timestamp) >= cutoffTime);
        this.stats.disk = this.stats.disk.filter(point => new Date(point.timestamp) >= cutoffTime);
    }

    // Получить общую статистику
    getSummaryStats() {
        if (this.stats.cpu.length === 0) {
            return null;
        }

        const cpuValues = this.stats.cpu.map(point => point.load);
        const memoryValues = this.stats.memory.map(point => point.usedPercent);
        const diskValues = this.stats.disk.map(point => point.usedPercent);

        return {
            cpu: {
                current: cpuValues[cpuValues.length - 1] || 0,
                average: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
                max: Math.max(...cpuValues),
                min: Math.min(...cpuValues)
            },
            memory: {
                current: memoryValues[memoryValues.length - 1] || 0,
                average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
                max: Math.max(...memoryValues),
                min: Math.min(...memoryValues)
            },
            disk: {
                current: diskValues[diskValues.length - 1] || 0,
                average: diskValues.reduce((a, b) => a + b, 0) / diskValues.length,
                max: Math.max(...diskValues),
                min: Math.min(...diskValues)
            }
        };
    }

    // Сохраняем статистику в файл
    saveStatsToFile() {
        try {
            const dir = path.dirname(this.statsFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.statsFile, JSON.stringify(this.stats));
        } catch (err) {
            console.error('Ошибка сохранения статистики:', err);
        }
    }

    // Загружаем статистику из файла
    loadStatsFromFile() {
        try {
            if (fs.existsSync(this.statsFile)) {
                const data = fs.readFileSync(this.statsFile, 'utf-8');
                this.stats = JSON.parse(data);
            }
        } catch (err) {
            console.error('Ошибка загрузки статистики:', err);
        }
    }
}

module.exports = StatsManager; 