// Performance Monitor для отслеживания производительности
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 1000;
        this.isInitialized = false;
    }

    // Инициализация мониторинга
    init() {
        if (this.isInitialized) return;
        
        // Отслеживаем метрики загрузки страницы
        this.trackPageLoadMetrics();
        
        // Отслеживаем метрики взаимодействия
        this.trackInteractionMetrics();
        
        // Отслеживаем метрики сети
        this.trackNetworkMetrics();
        
        // Отслеживаем метрики памяти
        this.trackMemoryMetrics();
        
        this.isInitialized = true;
        console.log('Performance Monitor инициализирован');
    }

    // Отслеживание метрик загрузки страницы
    trackPageLoadMetrics() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                const metrics = {
                    type: 'page_load',
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    metrics: {
                        // Время загрузки DOM
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                        // Время загрузки страницы
                        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                        // Время первого байта
                        firstByte: navigation.responseStart - navigation.requestStart,
                        // Время DNS
                        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                        // Время TCP соединения
                        tcp: navigation.connectEnd - navigation.connectStart,
                        // Время SSL
                        ssl: navigation.connectEnd - navigation.secureConnectionStart,
                        // Время загрузки ресурсов
                        resourceLoad: navigation.loadEventEnd - navigation.responseEnd,
                        // Первая отрисовка
                        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                        // Первая содержательная отрисовка
                        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
                    }
                };
                
                this.captureMetrics(metrics);
            }, 100);
        });
    }

    // Отслеживание метрик взаимодействия
    trackInteractionMetrics() {
        let lastInteraction = Date.now();
        
        // Отслеживаем клики
        document.addEventListener('click', (e) => {
            const now = Date.now();
            const timeSinceLastInteraction = now - lastInteraction;
            
            const metrics = {
                type: 'interaction',
                timestamp: new Date().toISOString(),
                url: window.location.href,
                event: 'click',
                target: e.target.tagName,
                targetClass: e.target.className,
                targetId: e.target.id,
                coordinates: { x: e.clientX, y: e.clientY },
                timeSinceLastInteraction: timeSinceLastInteraction
            };
            
            this.captureMetrics(metrics);
            lastInteraction = now;
        });

        // Отслеживаем скролл
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const metrics = {
                    type: 'interaction',
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    event: 'scroll',
                    scrollY: window.scrollY,
                    scrollX: window.scrollX,
                    documentHeight: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight
                };
                
                this.captureMetrics(metrics);
            }, 100);
        });
    }

    // Отслеживание метрик сети
    trackNetworkMetrics() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                
                const metrics = {
                    type: 'network',
                    timestamp: new Date().toISOString(),
                    url: url,
                    method: 'fetch',
                    status: response.status,
                    duration: endTime - startTime,
                    size: response.headers.get('content-length') || 'unknown'
                };
                
                this.captureMetrics(metrics);
                return response;
            } catch (error) {
                const endTime = performance.now();
                
                const metrics = {
                    type: 'network',
                    timestamp: new Date().toISOString(),
                    url: url,
                    method: 'fetch',
                    status: 'error',
                    duration: endTime - startTime,
                    error: error.message
                };
                
                this.captureMetrics(metrics);
                throw error;
            }
        };
    }

    // Отслеживание метрик памяти
    trackMemoryMetrics() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const metrics = {
                    type: 'memory',
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                    jsHeapSizeLimit: memory.jsHeapSizeLimit,
                    usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                };
                
                this.captureMetrics(metrics);
            }, 30000); // Каждые 30 секунд
        }
    }

    // Захват метрик
    captureMetrics(metrics) {
        // Добавляем дополнительную информацию
        metrics.id = this.generateMetricsId();
        metrics.sessionId = this.getSessionId();
        metrics.userAgent = navigator.userAgent;
        metrics.viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Добавляем в массив метрик
        this.metrics.unshift(metrics);
        
        // Ограничиваем количество метрик в памяти
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(0, this.maxMetrics);
        }

        // Отправляем на сервер каждые 10 метрик
        if (this.metrics.length % 10 === 0) {
            this.sendMetricsToServer();
        }
    }

    // Генерация уникального ID для метрик
    generateMetricsId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Получение ID сессии
    getSessionId() {
        let sessionId = sessionStorage.getItem('performance_monitor_session_id');
        if (!sessionId) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            sessionStorage.setItem('performance_monitor_session_id', sessionId);
        }
        return sessionId;
    }

    // Отправка метрик на сервер
    async sendMetricsToServer() {
        try {
            const metricsToSend = this.metrics.slice(0, 10); // Отправляем последние 10 метрик
            await fetch('/api/performance-metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metricsToSend)
            });
            
            // Удаляем отправленные метрики
            this.metrics = this.metrics.slice(10);
        } catch (err) {
            console.error('Ошибка отправки метрик на сервер:', err);
        }
    }

    // Получение всех метрик
    getMetrics() {
        return this.metrics;
    }

    // Очистка метрик
    clearMetrics() {
        this.metrics = [];
    }

    // Получение статистики метрик
    getMetricsStats() {
        const stats = {
            total: this.metrics.length,
            byType: {},
            averagePageLoad: 0,
            averageNetworkRequest: 0,
            memoryUsage: 0
        };

        let pageLoadCount = 0;
        let pageLoadTotal = 0;
        let networkCount = 0;
        let networkTotal = 0;
        let memoryTotal = 0;
        let memoryCount = 0;

        this.metrics.forEach(metric => {
            // Статистика по типам
            stats.byType[metric.type] = (stats.byType[metric.type] || 0) + 1;
            
            // Среднее время загрузки страницы
            if (metric.type === 'page_load' && metric.metrics?.loadComplete) {
                pageLoadCount++;
                pageLoadTotal += metric.metrics.loadComplete;
            }
            
            // Среднее время сетевых запросов
            if (metric.type === 'network' && metric.duration) {
                networkCount++;
                networkTotal += metric.duration;
            }
            
            // Среднее использование памяти
            if (metric.type === 'memory' && metric.usagePercent) {
                memoryCount++;
                memoryTotal += metric.usagePercent;
            }
        });

        if (pageLoadCount > 0) {
            stats.averagePageLoad = pageLoadTotal / pageLoadCount;
        }
        
        if (networkCount > 0) {
            stats.averageNetworkRequest = networkTotal / networkCount;
        }
        
        if (memoryCount > 0) {
            stats.memoryUsage = memoryTotal / memoryCount;
        }

        return stats;
    }
}

// Создаем глобальный экземпляр
window.performanceMonitor = new PerformanceMonitor();

// Автоматическая инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceMonitor.init();
    });
} else {
    window.performanceMonitor.init();
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
} 