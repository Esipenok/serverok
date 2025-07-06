// Error Tracker для сбора клиентских ошибок
class ErrorTracker {
    constructor() {
        this.errors = [];
        this.maxErrors = 1000; // Максимальное количество ошибок в памяти
        this.isInitialized = false;
    }

    // Инициализация трекера ошибок
    init() {
        if (this.isInitialized) return;
        
        // Перехват JavaScript ошибок
        window.addEventListener('error', (event) => {
            this.captureError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        });

        // Перехват необработанных Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                stack: event.reason?.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        });

        // Перехват ошибок fetch запросов
        this.interceptFetchErrors();

        // Перехват ошибок XMLHttpRequest
        this.interceptXHRErrors();

        this.isInitialized = true;
        console.log('Error Tracker инициализирован');
    }

    // Перехват ошибок fetch
    interceptFetchErrors() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Проверяем статус ответа
                if (!response.ok) {
                    this.captureError({
                        type: 'fetch',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0],
                        status: response.status,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent
                    });
                }
                
                return response;
            } catch (error) {
                this.captureError({
                    type: 'fetch',
                    message: error.message,
                    url: args[0],
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                });
                throw error;
            }
        };
    }

    // Перехват ошибок XMLHttpRequest
    interceptXHRErrors() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._errorTrackerUrl = url;
            this._errorTrackerMethod = method;
            return originalOpen.call(this, method, url, ...args);
        };

        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('error', () => {
                window.errorTracker?.captureError({
                    type: 'xhr',
                    message: 'XMLHttpRequest failed',
                    url: this._errorTrackerUrl,
                    method: this._errorTrackerMethod,
                    status: this.status,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                });
            });

            this.addEventListener('load', () => {
                if (this.status >= 400) {
                    window.errorTracker?.captureError({
                        type: 'xhr',
                        message: `HTTP ${this.status}: ${this.statusText}`,
                        url: this._errorTrackerUrl,
                        method: this._errorTrackerMethod,
                        status: this.status,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent
                    });
                }
            });

            return originalSend.call(this, ...args);
        };
    }

    // Захват ошибки
    captureError(error) {
        // Добавляем дополнительную информацию
        error.id = this.generateErrorId();
        error.sessionId = this.getSessionId();
        error.viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        error.referrer = document.referrer;

        // Добавляем в массив ошибок
        this.errors.unshift(error);
        
        // Ограничиваем количество ошибок в памяти
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Отправляем на сервер
        this.sendErrorToServer(error);

        // Логируем в консоль для разработки
        console.error('Error Tracker:', error);
    }

    // Генерация уникального ID для ошибки
    generateErrorId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Получение ID сессии
    getSessionId() {
        let sessionId = sessionStorage.getItem('error_tracker_session_id');
        if (!sessionId) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            sessionStorage.setItem('error_tracker_session_id', sessionId);
        }
        return sessionId;
    }

    // Отправка ошибки на сервер
    async sendErrorToServer(error) {
        try {
            await fetch('/api/client-errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(error)
            });
        } catch (err) {
            console.error('Ошибка отправки ошибки на сервер:', err);
        }
    }

    // Получение всех ошибок
    getErrors() {
        return this.errors;
    }

    // Очистка ошибок
    clearErrors() {
        this.errors = [];
    }

    // Получение статистики ошибок
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            byType: {},
            byHour: {},
            recent: this.errors.slice(0, 10)
        };

        this.errors.forEach(error => {
            // Статистика по типам
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            
            // Статистика по часам
            const hour = new Date(error.timestamp).getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        });

        return stats;
    }
}

// Создаем глобальный экземпляр
window.errorTracker = new ErrorTracker();

// Автоматическая инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.errorTracker.init();
    });
} else {
    window.errorTracker.init();
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorTracker;
} 