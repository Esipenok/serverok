const fs = require('fs');
const path = require('path');

class AnalyticsManager {
    constructor() {
        this.dataPath = path.join(__dirname, 'analytics-data.json');
        this.events = [];
        this.metrics = {};
        this.loadData();
        
        // Автосохранение каждые 5 минут
        setInterval(() => {
            this.saveData();
        }, 5 * 60 * 1000);
    }

    // Загрузка данных из файла
    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                this.events = data.events || [];
                this.metrics = data.metrics || {};
                console.log(`📊 Загружено ${this.events.length} аналитических событий`);
            }
        } catch (error) {
            console.error('Ошибка загрузки аналитических данных:', error);
            this.events = [];
            this.metrics = {};
        }
    }

    // Сохранение данных в файл
    saveData() {
        try {
            const data = {
                events: this.events,
                metrics: this.metrics,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
            console.log(`📊 Сохранено ${this.events.length} аналитических событий`);
        } catch (error) {
            console.error('Ошибка сохранения аналитических данных:', error);
        }
    }

    // Добавление событий
    addEvents(newEvents) {
        if (!Array.isArray(newEvents)) {
            newEvents = [newEvents];
        }

        newEvents.forEach(event => {
            // Добавляем серверную информацию
            event.server_timestamp = new Date().toISOString();
            event.id = this.generateEventId();
            
            this.events.unshift(event);
        });

        // Ограничиваем количество событий (храним последние 10000)
        if (this.events.length > 10000) {
            this.events = this.events.slice(0, 10000);
        }

        // Обновляем метрики
        this.updateMetrics();
    }

    // Генерация уникального ID события
    generateEventId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Обновление метрик
    updateMetrics() {
        this.metrics = {
            total_events: this.events.length,
            unique_users: this.getUniqueUsers(),
            unique_sessions: this.getUniqueSessions(),
            events_by_type: this.getEventsByType(),
            events_by_hour: this.getEventsByHour(),
            events_by_day: this.getEventsByDay(),
            dau: this.getDAU(),
            mau: this.getMAU(),
            retention: this.getRetention(),
            top_pages: this.getTopPages(),
            top_events: this.getTopEvents(),
            session_metrics: this.getSessionMetrics()
        };
    }

    // Получение уникальных пользователей
    getUniqueUsers() {
        const users = new Set();
        this.events.forEach(event => {
            if (event.user_id) {
                users.add(event.user_id);
            }
        });
        return users.size;
    }

    // Получение уникальных сессий
    getUniqueSessions() {
        const sessions = new Set();
        this.events.forEach(event => {
            if (event.session_id) {
                sessions.add(event.session_id);
            }
        });
        return sessions.size;
    }

    // Получение событий по типам
    getEventsByType() {
        const byType = {};
        this.events.forEach(event => {
            byType[event.event_name] = (byType[event.event_name] || 0) + 1;
        });
        return byType;
    }

    // Получение событий по часам
    getEventsByHour() {
        const byHour = {};
        this.events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        });
        return byHour;
    }

    // Получение событий по дням
    getEventsByDay() {
        const byDay = {};
        this.events.forEach(event => {
            const day = new Date(event.timestamp).toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + 1;
        });
        return byDay;
    }

    // Получение DAU (Daily Active Users)
    getDAU() {
        const today = new Date().toISOString().split('T')[0];
        const todayUsers = new Set();
        
        this.events.forEach(event => {
            const eventDay = new Date(event.timestamp).toISOString().split('T')[0];
            if (eventDay === today && event.user_id) {
                todayUsers.add(event.user_id);
            }
        });
        
        return todayUsers.size;
    }

    // Получение MAU (Monthly Active Users)
    getMAU() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthUsers = new Set();
        
        this.events.forEach(event => {
            const eventDate = new Date(event.timestamp);
            if (eventDate >= thirtyDaysAgo && event.user_id) {
                monthUsers.add(event.user_id);
            }
        });
        
        return monthUsers.size;
    }

    // Получение Retention (упрощенная версия)
    getRetention() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const todayUsers = new Set();
        const yesterdayUsers = new Set();
        
        this.events.forEach(event => {
            const eventDay = new Date(event.timestamp).toISOString().split('T')[0];
            if (event.user_id) {
                if (eventDay === today) {
                    todayUsers.add(event.user_id);
                } else if (eventDay === yesterdayStr) {
                    yesterdayUsers.add(event.user_id);
                }
            }
        });
        
        const returningUsers = new Set([...todayUsers].filter(user => yesterdayUsers.has(user)));
        
        return {
            today_users: todayUsers.size,
            yesterday_users: yesterdayUsers.size,
            returning_users: returningUsers.size,
            retention_rate: yesterdayUsers.size > 0 ? (returningUsers.size / yesterdayUsers.size * 100).toFixed(2) : 0
        };
    }

    // Получение топ страниц
    getTopPages() {
        const pageViews = {};
        this.events.forEach(event => {
            if (event.event_name === 'page_view' && event.properties?.page_path) {
                pageViews[event.properties.page_path] = (pageViews[event.properties.page_path] || 0) + 1;
            }
        });
        
        return Object.entries(pageViews)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([page, count]) => ({ page, count }));
    }

    // Получение топ событий
    getTopEvents() {
        const eventCounts = {};
        this.events.forEach(event => {
            eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
        });
        
        return Object.entries(eventCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([event, count]) => ({ event, count }));
    }

    // Получение метрик сессий
    getSessionMetrics() {
        const sessions = {};
        
        this.events.forEach(event => {
            if (event.session_id) {
                if (!sessions[event.session_id]) {
                    sessions[event.session_id] = {
                        start_time: event.timestamp,
                        end_time: event.timestamp,
                        events: [],
                        user_id: event.user_id
                    };
                }
                sessions[event.session_id].events.push(event);
                sessions[event.session_id].end_time = event.timestamp;
            }
        });
        
        const sessionDurations = Object.values(sessions).map(session => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            return (end - start) / 1000; // в секундах
        });
        
        const avgDuration = sessionDurations.length > 0 
            ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
            : 0;
        
        return {
            total_sessions: Object.keys(sessions).length,
            average_duration: Math.round(avgDuration),
            average_events_per_session: this.events.length / Object.keys(sessions).length || 0
        };
    }

    // Получение всех событий
    getEvents(limit = 100, offset = 0) {
        return this.events.slice(offset, offset + limit);
    }

    // Получение событий по фильтрам
    getFilteredEvents(filters = {}) {
        let filteredEvents = this.events;
        
        if (filters.event_name) {
            filteredEvents = filteredEvents.filter(event => 
                event.event_name === filters.event_name
            );
        }
        
        if (filters.user_id) {
            filteredEvents = filteredEvents.filter(event => 
                event.user_id === filters.user_id
            );
        }
        
        if (filters.session_id) {
            filteredEvents = filteredEvents.filter(event => 
                event.session_id === filters.session_id
            );
        }
        
        if (filters.date_from) {
            filteredEvents = filteredEvents.filter(event => 
                new Date(event.timestamp) >= new Date(filters.date_from)
            );
        }
        
        if (filters.date_to) {
            filteredEvents = filteredEvents.filter(event => 
                new Date(event.timestamp) <= new Date(filters.date_to)
            );
        }
        
        return filteredEvents;
    }

    // Получение статистики
    getStats() {
        return this.metrics;
    }

    // Очистка старых данных
    cleanup(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const originalCount = this.events.length;
        this.events = this.events.filter(event => 
            new Date(event.timestamp) >= cutoffDate
        );
        
        const removedCount = originalCount - this.events.length;
        console.log(`🧹 Очищено ${removedCount} старых аналитических событий`);
        
        this.updateMetrics();
        this.saveData();
    }

    // Экспорт данных
    exportData(format = 'json') {
        if (format === 'csv') {
            return this.exportToCSV();
        }
        return JSON.stringify(this.events, null, 2);
    }

    // Экспорт в CSV
    exportToCSV() {
        if (this.events.length === 0) return '';
        
        const headers = [
            'id',
            'event_name',
            'timestamp',
            'user_id',
            'session_id',
            'page_url',
            'properties'
        ];
        
        const csvData = this.events.map(event => [
            event.id,
            event.event_name,
            event.timestamp,
            event.user_id,
            event.session_id,
            event.page_url,
            JSON.stringify(event.properties)
        ]);
        
        return [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }
}

module.exports = AnalyticsManager; 