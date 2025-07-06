// Analytics Tracker для сбора пользовательских событий
class AnalyticsTracker {
    constructor() {
        this.events = [];
        this.maxEvents = 1000;
        this.isInitialized = false;
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.sessionStartTime = Date.now();
    }

    // Инициализация трекера
    init() {
        if (this.isInitialized) return;
        
        // Отслеживаем базовые события
        this.trackPageViews();
        this.trackUserInteractions();
        this.trackFormSubmissions();
        this.trackNavigation();
        this.trackEngagement();
        
        // Отправляем событие начала сессии
        this.track('session_start', {
            session_duration: 0,
            referrer: document.referrer,
            landing_page: window.location.pathname
        });
        
        this.isInitialized = true;
        console.log('Analytics Tracker инициализирован');
    }

    // Отслеживание просмотров страниц
    trackPageViews() {
        // Отслеживаем загрузку страницы
        this.track('page_view', {
            page_url: window.location.href,
            page_title: document.title,
            page_path: window.location.pathname,
            page_search: window.location.search,
            page_hash: window.location.hash
        });

        // Отслеживаем изменения в истории браузера
        let lastUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                this.track('page_view', {
                    page_url: window.location.href,
                    page_title: document.title,
                    page_path: window.location.pathname,
                    page_search: window.location.search,
                    page_hash: window.location.hash
                });
            }
        });
        
        observer.observe(document, { subtree: true, childList: true });
    }

    // Отслеживание пользовательских взаимодействий
    trackUserInteractions() {
        // Отслеживаем клики
        document.addEventListener('click', (e) => {
            const target = e.target;
            const properties = {
                element_type: target.tagName.toLowerCase(),
                element_id: target.id || null,
                element_class: target.className || null,
                element_text: target.textContent?.substring(0, 100) || null,
                coordinates: { x: e.clientX, y: e.clientY },
                page_url: window.location.href
            };

            // Определяем тип взаимодействия
            if (target.tagName === 'BUTTON') {
                this.track('button_click', properties);
            } else if (target.tagName === 'A') {
                this.track('link_click', properties);
            } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                this.track('input_focus', properties);
            } else {
                this.track('element_click', properties);
            }
        });

        // Отслеживаем отправку форм
        document.addEventListener('submit', (e) => {
            const form = e.target;
            this.track('form_submit', {
                form_id: form.id || null,
                form_action: form.action || null,
                form_method: form.method || 'POST',
                page_url: window.location.href
            });
        });

        // Отслеживаем скролл
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollDepth = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
                this.track('scroll', {
                    scroll_depth: scrollDepth,
                    scroll_y: window.scrollY,
                    scroll_x: window.scrollX,
                    page_url: window.location.href
                });
            }, 100);
        });
    }

    // Отслеживание отправки форм
    trackFormSubmissions() {
        // Отслеживаем изменения в полях ввода
        document.addEventListener('input', (e) => {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                this.track('input_change', {
                    element_type: target.type || 'text',
                    element_id: target.id || null,
                    element_name: target.name || null,
                    value_length: target.value.length,
                    page_url: window.location.href
                });
            }
        });
    }

    // Отслеживание навигации
    trackNavigation() {
        // Отслеживаем использование кнопок браузера
        window.addEventListener('popstate', () => {
            this.track('navigation', {
                navigation_type: 'browser_back_forward',
                page_url: window.location.href,
                page_title: document.title
            });
        });

        // Отслеживаем переходы по ссылкам
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && !link.href.startsWith('javascript:')) {
                const isExternal = link.hostname !== window.location.hostname;
                this.track('link_click', {
                    link_url: link.href,
                    link_text: link.textContent?.substring(0, 100) || null,
                    is_external: isExternal,
                    page_url: window.location.href
                });
            }
        });
    }

    // Отслеживание вовлеченности
    trackEngagement() {
        let isActive = true;
        let lastActivity = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 минут

        // Отслеживаем активность пользователя
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
                if (!isActive) {
                    isActive = true;
                    this.track('user_return', {
                        inactive_duration: Date.now() - lastActivity
                    });
                }
            });
        });

        // Проверяем неактивность каждую минуту
        setInterval(() => {
            if (isActive && Date.now() - lastActivity > sessionTimeout) {
                isActive = false;
                this.track('user_inactive', {
                    inactive_duration: Date.now() - lastActivity
                });
            }
        }, 60000);
    }

    // Основной метод для отслеживания событий
    track(eventName, properties = {}) {
        const event = {
            id: this.generateEventId(),
            event_name: eventName,
            properties: properties,
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            user_id: this.userId,
            page_url: window.location.href,
            user_agent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            referrer: document.referrer
        };

        // Добавляем в массив событий
        this.events.unshift(event);
        
        // Ограничиваем количество событий в памяти
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }

        // Отправляем на сервер каждые 5 событий
        if (this.events.length % 5 === 0) {
            this.sendEventsToServer();
        }

        // Логируем в консоль для разработки
        console.log('Analytics Event:', event);
    }

    // Отслеживание пользовательских событий (для кастомных событий)
    trackCustom(eventName, properties = {}) {
        this.track(eventName, {
            ...properties,
            custom_event: true
        });
    }

    // Отслеживание конверсий
    trackConversion(conversionName, value = null, properties = {}) {
        this.track('conversion', {
            conversion_name: conversionName,
            conversion_value: value,
            ...properties
        });
    }

    // Отслеживание ошибок
    trackError(error, properties = {}) {
        this.track('error', {
            error_message: error.message,
            error_stack: error.stack,
            error_type: error.name,
            ...properties
        });
    }

    // Генерация уникального ID события
    generateEventId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Генерация ID сессии
    generateSessionId() {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }

    // Получение ID пользователя
    getUserId() {
        let userId = localStorage.getItem('analytics_user_id');
        if (!userId) {
            userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
            localStorage.setItem('analytics_user_id', userId);
        }
        return userId;
    }

    // Отправка событий на сервер
    async sendEventsToServer() {
        try {
            const eventsToSend = this.events.slice(0, 5); // Отправляем последние 5 событий
            await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventsToSend)
            });
            
            // Удаляем отправленные события
            this.events = this.events.slice(5);
        } catch (err) {
            console.error('Ошибка отправки аналитических событий:', err);
        }
    }

    // Получение всех событий
    getEvents() {
        return this.events;
    }

    // Очистка событий
    clearEvents() {
        this.events = [];
    }

    // Получение статистики событий
    getEventsStats() {
        const stats = {
            total: this.events.length,
            byEvent: {},
            byHour: {},
            recent: this.events.slice(0, 10)
        };

        this.events.forEach(event => {
            // Статистика по типам событий
            stats.byEvent[event.event_name] = (stats.byEvent[event.event_name] || 0) + 1;
            
            // Статистика по часам
            const hour = new Date(event.timestamp).getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        });

        return stats;
    }

    // Получение метрик сессии
    getSessionMetrics() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const pageViews = this.events.filter(e => e.event_name === 'page_view').length;
        const interactions = this.events.filter(e => e.event_name.includes('click') || e.event_name.includes('input')).length;
        
        return {
            session_id: this.sessionId,
            user_id: this.userId,
            session_duration: sessionDuration,
            page_views: pageViews,
            interactions: interactions,
            events_count: this.events.length
        };
    }
}

// Создаем глобальный экземпляр
window.analytics = new AnalyticsTracker();

// Автоматическая инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analytics.init();
    });
} else {
    window.analytics.init();
}

// Отправляем события при закрытии страницы
window.addEventListener('beforeunload', () => {
    const sessionDuration = Date.now() - window.analytics.sessionStartTime;
    window.analytics.track('session_end', {
        session_duration: sessionDuration
    });
    
    // Принудительно отправляем оставшиеся события
    if (window.analytics.events.length > 0) {
        navigator.sendBeacon('/api/analytics/events', JSON.stringify(window.analytics.events));
    }
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsTracker;
} 