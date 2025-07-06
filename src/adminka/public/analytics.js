// Модуль для отображения аналитики
class AnalyticsUI {
    constructor() {
        this.currentView = 'overview';
        this.refreshInterval = null;
        this.init();
    }

    init() {
        // Пытаемся создать секцию аналитики
        if (!this.createAnalyticsSection()) {
            console.log('Откладываем инициализацию аналитики - DOM не готов');
            // Повторяем попытку через 100мс
            setTimeout(() => {
                this.init();
            }, 100);
            return;
        }
        
        this.loadAnalyticsData();
        this.startAutoRefresh();
        console.log('Analytics UI инициализирована успешно');
    }

    // Создание секции аналитики
    createAnalyticsSection() {
        const mainContent = document.getElementById('main-content');
        
        // Проверяем, что элемент существует
        if (!mainContent) {
            console.error('Элемент main-content не найден, откладываем создание секции аналитики');
            return false;
        }
        
        // Проверяем, что секция еще не создана
        if (document.getElementById('analytics-section')) {
            console.log('Секция аналитики уже существует');
            return true;
        }
        
        const analyticsSection = document.createElement('div');
        analyticsSection.id = 'analytics-section';
        analyticsSection.className = 'section';
        analyticsSection.style.display = 'none';
        
        analyticsSection.innerHTML = `
            <div class="section-header">
                <h2>📊 Аналитика</h2>
                <div class="header-controls">
                    <button class="btn btn-secondary" onclick="analyticsUI.refreshData()">
                        <i class="fas fa-sync-alt"></i> Обновить
                    </button>
                    <button class="btn btn-success" onclick="analyticsUI.exportData()">
                        <i class="fas fa-download"></i> Экспорт
                    </button>
                    <button class="btn btn-warning" onclick="analyticsUI.showCleanupDialog()">
                        <i class="fas fa-broom"></i> Очистка
                    </button>
                </div>
            </div>

            <div class="analytics-nav">
                <button class="nav-btn active" data-view="overview">Обзор</button>
                <button class="nav-btn" data-view="events">События</button>
                <button class="nav-btn" data-view="users">Пользователи</button>
                <button class="nav-btn" data-view="sessions">Сессии</button>
            </div>

            <div id="analytics-content">
                <!-- Контент будет загружен динамически -->
            </div>
        `;
        
        mainContent.appendChild(analyticsSection);
        
        // Добавляем обработчики навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });
        
        console.log('Секция аналитики создана успешно');
        return true;
    }

    // Переключение между представлениями
    switchView(view) {
        this.currentView = view;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Загружаем соответствующий контент
        this.loadViewContent(view);
    }

    // Загрузка контента представления
    loadViewContent(view) {
        const content = document.getElementById('analytics-content');
        
        switch(view) {
            case 'overview':
                this.loadOverviewContent(content);
                break;
            case 'events':
                this.loadEventsContent(content);
                break;
            case 'users':
                this.loadUsersContent(content);
                break;
            case 'sessions':
                this.loadSessionsContent(content);
                break;
        }
    }

    // Загрузка обзора
    loadOverviewContent(container) {
        container.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon">👥</div>
                    <div class="metric-content">
                        <div class="metric-value" id="dau-value">-</div>
                        <div class="metric-label">DAU</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📈</div>
                    <div class="metric-content">
                        <div class="metric-value" id="mau-value">-</div>
                        <div class="metric-label">MAU</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">🔄</div>
                    <div class="metric-content">
                        <div class="metric-value" id="retention-value">-</div>
                        <div class="metric-label">Retention %</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📊</div>
                    <div class="metric-content">
                        <div class="metric-value" id="total-events-value">-</div>
                        <div class="metric-label">Всего событий</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">👤</div>
                    <div class="metric-content">
                        <div class="metric-value" id="unique-users-value">-</div>
                        <div class="metric-label">Уникальных пользователей</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">🕐</div>
                    <div class="metric-content">
                        <div class="metric-value" id="avg-session-value">-</div>
                        <div class="metric-label">Средняя сессия (сек)</div>
                    </div>
                </div>
            </div>

            <div class="charts-grid">
                <div class="chart-container">
                    <h3>События по часам</h3>
                    <canvas id="events-by-hour-chart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Топ событий</h3>
                    <div id="top-events-list"></div>
                </div>
                <div class="chart-container">
                    <h3>Топ страниц</h3>
                    <div id="top-pages-list"></div>
                </div>
                <div class="chart-container">
                    <h3>События по дням</h3>
                    <canvas id="events-by-day-chart"></canvas>
                </div>
            </div>
        `;
    }

    // Загрузка событий
    loadEventsContent(container) {
        container.innerHTML = `
            <div class="events-controls">
                <div class="filters">
                    <input type="text" id="event-filter" placeholder="Фильтр по событию..." class="form-control">
                    <input type="text" id="user-filter" placeholder="Фильтр по пользователю..." class="form-control">
                    <input type="date" id="date-from" class="form-control">
                    <input type="date" id="date-to" class="form-control">
                    <button class="btn btn-primary" onclick="analyticsUI.applyFilters()">Применить</button>
                </div>
            </div>
            <div id="events-list" class="events-list">
                <!-- События будут загружены динамически -->
            </div>
            <div class="pagination">
                <button class="btn btn-secondary" onclick="analyticsUI.loadMoreEvents()">Загрузить еще</button>
            </div>
        `;
    }

    // Загрузка пользователей
    loadUsersContent(container) {
        container.innerHTML = `
            <div class="users-stats">
                <h3>Статистика пользователей</h3>
                <div id="users-stats-content">
                    <!-- Статистика будет загружена динамически -->
                </div>
            </div>
        `;
    }

    // Загрузка сессий
    loadSessionsContent(container) {
        container.innerHTML = `
            <div class="sessions-stats">
                <h3>Статистика сессий</h3>
                <div id="sessions-stats-content">
                    <!-- Статистика будет загружена динамически -->
                </div>
            </div>
        `;
    }

    // Загрузка аналитических данных
    async loadAnalyticsData() {
        try {
            const response = await fetch('/api/analytics/stats');
            const data = await response.json();
            
            if (data.success) {
                this.updateMetrics(data.stats);
                this.updateCharts(data.stats);
            }
        } catch (error) {
            console.error('Ошибка загрузки аналитических данных:', error);
            this.showError('Ошибка загрузки данных');
        }
    }

    // Обновление метрик
    updateMetrics(stats) {
        const elements = {
            'dau-value': stats.dau || 0,
            'mau-value': stats.mau || 0,
            'retention-value': stats.retention?.retention_rate || 0,
            'total-events-value': stats.total_events || 0,
            'unique-users-value': stats.unique_users || 0,
            'avg-session-value': stats.session_metrics?.average_duration || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        });
    }

    // Обновление графиков
    updateCharts(stats) {
        this.updateEventsByHourChart(stats.events_by_hour);
        this.updateTopEventsList(stats.top_events);
        this.updateTopPagesList(stats.top_pages);
        this.updateEventsByDayChart(stats.events_by_day);
    }

    // График событий по часам
    updateEventsByHourChart(data) {
        const canvas = document.getElementById('events-by-hour-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const hours = Array.from({length: 24}, (_, i) => i);
        const values = hours.map(hour => data[hour] || 0);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'События',
                    data: values,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // График событий по дням
    updateEventsByDayChart(data) {
        const canvas = document.getElementById('events-by-day-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dates = Object.keys(data).sort();
        const values = dates.map(date => data[date]);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates.map(d => new Date(d).toLocaleDateString()),
                datasets: [{
                    label: 'События',
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Список топ событий
    updateTopEventsList(events) {
        const container = document.getElementById('top-events-list');
        if (!container) return;

        container.innerHTML = events.map((event, index) => `
            <div class="top-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${event.event}</span>
                <span class="count">${event.count}</span>
            </div>
        `).join('');
    }

    // Список топ страниц
    updateTopPagesList(pages) {
        const container = document.getElementById('top-pages-list');
        if (!container) return;

        container.innerHTML = pages.map((page, index) => `
            <div class="top-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${page.page}</span>
                <span class="count">${page.count}</span>
            </div>
        `).join('');
    }

    // Загрузка событий с фильтрами
    async loadEvents(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`/api/analytics/events?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayEvents(data.events);
            }
        } catch (error) {
            console.error('Ошибка загрузки событий:', error);
            this.showError('Ошибка загрузки событий');
        }
    }

    // Отображение событий
    displayEvents(events) {
        const container = document.getElementById('events-list');
        if (!container) return;

        container.innerHTML = events.map(event => `
            <div class="event-item">
                <div class="event-header">
                    <span class="event-name">${event.event_name}</span>
                    <span class="event-time">${new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <div class="event-details">
                    <div class="event-user">Пользователь: ${event.user_id}</div>
                    <div class="event-session">Сессия: ${event.session_id}</div>
                    <div class="event-page">Страница: ${event.page_url}</div>
                </div>
                <div class="event-properties">
                    <pre>${JSON.stringify(event.properties, null, 2)}</pre>
                </div>
            </div>
        `).join('');
    }

    // Применение фильтров
    applyFilters() {
        const filters = {
            event_name: document.getElementById('event-filter')?.value,
            user_id: document.getElementById('user-filter')?.value,
            date_from: document.getElementById('date-from')?.value,
            date_to: document.getElementById('date-to')?.value
        };

        // Удаляем пустые фильтры
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        this.loadEvents(filters);
    }

    // Обновление данных
    refreshData() {
        this.loadAnalyticsData();
        if (this.currentView === 'events') {
            this.loadEvents();
        }
    }

    // Автообновление
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 30000); // Обновляем каждые 30 секунд
    }

    // Экспорт данных
    async exportData() {
        try {
            const format = confirm('Экспортировать в CSV?') ? 'csv' : 'json';
            window.open(`/api/analytics/export?format=${format}`, '_blank');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            this.showError('Ошибка экспорта');
        }
    }

    // Диалог очистки
    showCleanupDialog() {
        const days = prompt('Введите количество дней для хранения данных (по умолчанию 30):', '30');
        if (days && !isNaN(days)) {
            this.cleanupData(parseInt(days));
        }
    }

    // Очистка данных
    async cleanupData(days) {
        try {
            const response = await fetch('/api/analytics/cleanup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ days })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showSuccess(data.message);
                this.refreshData();
            }
        } catch (error) {
            console.error('Ошибка очистки:', error);
            this.showError('Ошибка очистки данных');
        }
    }

    // Показать ошибку
    showError(message) {
        // Можно использовать существующую систему уведомлений
        console.error(message);
    }

    // Показать успех
    showSuccess(message) {
        // Можно использовать существующую систему уведомлений
        console.log(message);
    }

    // Показать секцию аналитики
    show() {
        try {
            // Проверяем, существует ли секция аналитики
            let analyticsSection = document.getElementById('analytics-section');
            if (!analyticsSection) {
                console.log('Секция аналитики не найдена, создаем...');
                if (!this.createAnalyticsSection()) {
                    console.error('Не удалось создать секцию аналитики');
                    alert('Ошибка: Не удалось создать интерфейс аналитики. Попробуйте обновить страницу.');
                    return;
                }
                analyticsSection = document.getElementById('analytics-section');
            }
            
            // Скрываем все вкладки
            document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
            
            // Показываем секцию аналитики
            analyticsSection.style.display = 'block';
            
            // Обновляем активную кнопку навигации
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const analyticsLink = document.querySelector('[data-tab="analytics"]');
            if (analyticsLink) {
                analyticsLink.classList.add('active');
            }
            
            this.refreshData();
        } catch (error) {
            console.error('Ошибка при показе аналитики:', error);
        }
    }

    // Скрыть секцию аналитики
    hide() {
        try {
            const analyticsSection = document.getElementById('analytics-section');
            if (analyticsSection) {
                analyticsSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка при скрытии аналитики:', error);
        }
    }

    // Обработка переключения на другие вкладки
    handleTabSwitch() {
        this.hide();
    }
}

// Создаем глобальный экземпляр после загрузки DOM
function initAnalyticsUI() {
    if (!window.analyticsUI) {
        console.log('Инициализация Analytics UI...');
        try {
            window.analyticsUI = new AnalyticsUI();
            console.log('Analytics UI инициализирована:', window.analyticsUI);
        } catch (error) {
            console.error('Ошибка инициализации Analytics UI:', error);
        }
    }
}

// Инициализируем сразу, если DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalyticsUI);
} else {
    // DOM уже загружен
    initAnalyticsUI();
}

// Дополнительная инициализация через небольшую задержку для надежности
setTimeout(initAnalyticsUI, 100);

// Еще одна попытка через 500мс для случаев медленной загрузки
setTimeout(initAnalyticsUI, 500); 