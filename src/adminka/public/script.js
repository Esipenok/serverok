// Глобальные переменные
let cpuChart, memoryChart, diskChart;
let cpuTrendChart, memoryTrendChart, diskTrendChart;
let currentTab = 'status';
let currentUser = null;
let adminCredentials = {
    username: 'admin',
    password: 'qwe'
};

let allComplaints = [];
let complaints = [];
let improvements = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupLoginForm();
    checkAuthStatus();
    setupTabNavigation();
});

// Настройка формы входа
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        // Показываем индикатор загрузки
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Проверка...';
        submitBtn.disabled = true;
        
        try {
            const isAuthenticated = await authenticateUser(username, password);
            if (isAuthenticated) {
                loginSuccess(username, password);
            }
        } catch (error) {
            console.error('❌ Ошибка в форме входа:', error);
            showLoginError(`Ошибка: ${error.message}`);
        } finally {
            // Восстанавливаем кнопку
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Автофокус на поле логина
    usernameInput.focus();
    
    // Обработка Enter в полях
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Проверка статуса аутентификации
function checkAuthStatus() {
    const savedUser = localStorage.getItem('admin_user');
    const savedTimestamp = localStorage.getItem('admin_timestamp');
    
    if (savedUser && savedTimestamp) {
        const now = Date.now();
        const sessionTime = 8 * 60 * 60 * 1000; // 8 часов
        
        if (now - parseInt(savedTimestamp) < sessionTime) {
            // Сессия еще активна
            currentUser = savedUser;
            const savedPassword = localStorage.getItem('admin_password');
            if (savedPassword) {
                loginSuccess(savedUser, savedPassword, false);
            } else {
                // Если пароль не сохранен, показываем форму входа
                showLoginModal();
            }
        } else {
            // Сессия истекла
            localStorage.removeItem('admin_user');
            localStorage.removeItem('admin_timestamp');
            showLoginModal();
        }
    } else {
        showLoginModal();
    }
}

// Аутентификация пользователя
async function authenticateUser(username, password) {
    try {
        console.log('🔐 Попытка аутентификации:', { username, password: '***' });
        
        // Сначала проверим отладочную информацию
        const debugResponse = await fetch('/api/auth-debug');
        const debugData = await debugResponse.json();
        console.log('🔍 Отладочная информация:', debugData);
        
        // Проверяем локальные учетные данные
        const localAuth = username === adminCredentials.username && password === adminCredentials.password;
        console.log('🔍 Локальная проверка:', localAuth);
        
        // Если локальная проверка прошла, разрешаем вход
        if (localAuth) {
            console.log('✅ Локальная аутентификация успешна');
            return true;
        }
        
        // Проверяем через API
        const response = await fetch('/api/ssh-test', {
            headers: {
                'x-admin-username': username,
                'x-admin-password': password,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('🔍 API ответ статус:', response.status);
        
        if (response.ok) {
            console.log('✅ API аутентификация успешна');
            return true;
        } else {
            const errorData = await response.json();
            console.log('❌ API аутентификация не удалась:', errorData);
            
            // Показываем отладочную информацию пользователю
            showLoginError(`Ошибка аутентификации: ${errorData.error}. Проверьте консоль для деталей.`);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка при аутентификации:', error);
        
        // Если API недоступен, проверяем локальные учетные данные
        const localAuth = username === adminCredentials.username && password === adminCredentials.password;
        if (localAuth) {
            console.log('✅ Локальная аутентификация успешна (API недоступен)');
            return true;
        }
        
        showLoginError(`Ошибка сети: ${error.message}`);
        return false;
    }
}

// Успешный вход
function loginSuccess(username, password, saveSession = true) {
    currentUser = username;
    
    // Сохраняем учетные данные для использования в API запросах
    adminCredentials.username = username;
    adminCredentials.password = password;
    
    console.log('✅ Успешный вход:', { username, password: '***' });
    console.log('✅ adminCredentials обновлены:', adminCredentials);
    
    if (saveSession) {
        localStorage.setItem('admin_user', username);
        localStorage.setItem('admin_timestamp', Date.now().toString());
        // Сохраняем пароль в localStorage (не рекомендуется для production)
        localStorage.setItem('admin_password', password);
    }
    
    // Скрываем модальное окно
    document.getElementById('login-modal').style.display = 'none';
    
    // Показываем основную панель
    document.getElementById('main-container').style.display = 'flex';
    
    // Обновляем информацию о пользователе
    document.getElementById('current-user').textContent = username;
    
    // Инициализируем панель
    initializePanel();
}

// Показать ошибку входа
function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    errorElement.style.display = 'flex';
    
    // Скрываем ошибку через 3 секунды
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

// Показать модальное окно входа
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('main-container').style.display = 'none';
    
    // Очищаем поля формы
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').style.display = 'none';
}

// Выход из системы
function logout() {
    currentUser = null;
    adminCredentials.username = null;
    adminCredentials.password = null;
    
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_timestamp');
    localStorage.removeItem('admin_password');
    
    showLoginModal();
}

// Инициализация панели после входа
function initializePanel() {
    console.log('Инициализация панели...');
    console.log('adminCredentials при инициализации:', adminCredentials);
    
    initializeCharts();
    initializeTrendCharts();
    setupTabNavigation();
    setupFilters();
    loadInitialData();
    
    // Запускаем автообновление каждую минуту
    setInterval(() => {
        // Проверяем, что пользователь аутентифицирован
        if (!adminCredentials || !adminCredentials.password) {
            console.log('Пропускаем автообновление - нет аутентификации');
            return;
        }
        
        console.log('Автообновление данных...');
        if (currentTab === 'status') {
            refreshServerStatus();
            refreshStats();
        } else if (currentTab === 'complaints') {
            refreshComplaints();
            refreshComplaintsStats();
        } else if (currentTab === 'logs') {
            // Для логов не делаем автообновление, только если включен real-time режим
            if (realTimeLogsInterval) {
                loadServerLogs();
            }
        }
    }, 60000); // 60 секунд
    
    // Проверяем инициализацию Analytics UI
    if (!window.analyticsUI) {
        console.log('Analytics UI не найдена, пытаемся инициализировать...');
        setTimeout(() => {
            if (typeof AnalyticsUI !== 'undefined') {
                window.analyticsUI = new AnalyticsUI();
                console.log('Analytics UI инициализирована из основного скрипта');
            } else {
                console.log('Класс AnalyticsUI не найден');
            }
        }, 200);
    } else {
        console.log('Analytics UI уже инициализирована');
    }
}

// Инициализация графиков трендов
function initializeTrendCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Время'
                },
                grid: {
                    color: 'rgba(0,0,0,0.1)'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Процент (%)'
                },
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(0,0,0,0.1)'
                }
            }
        },
        elements: {
            point: {
                radius: 3,
                hoverRadius: 5
            },
            line: {
                tension: 0.4
            }
        }
    };

    // CPU тренд график
    const cpuTrendCtx = document.getElementById('cpu-trend-chart').getContext('2d');
    cpuTrendChart = new Chart(cpuTrendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU (%)',
                data: [],
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: chartOptions
    });

    // Memory тренд график
    const memoryTrendCtx = document.getElementById('memory-trend-chart').getContext('2d');
    memoryTrendChart = new Chart(memoryTrendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Memory (%)',
                data: [],
                borderColor: '#4834d4',
                backgroundColor: 'rgba(72, 52, 212, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: chartOptions
    });

    // Disk тренд график
    const diskTrendCtx = document.getElementById('disk-trend-chart').getContext('2d');
    diskTrendChart = new Chart(diskTrendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Disk (%)',
                data: [],
                borderColor: '#00b894',
                backgroundColor: 'rgba(0, 184, 148, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: chartOptions
    });
}

// WebSocket убран - используем простые запросы раз в минуту

// Инициализация круговых диаграмм
function initializeCharts() {
    console.log('Инициализация круговых диаграмм...');
    
    // Проверяем, что графики ещё не инициализированы
    if (cpuChart || memoryChart || diskChart) {
        console.log('Графики уже инициализированы, пропускаем');
        return;
    }
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true
                }
            }
        }
    };

    // CPU диаграмма
    const cpuCtx = document.getElementById('cpu-chart').getContext('2d');
    cpuChart = new Chart(cpuCtx, {
        type: 'doughnut',
        data: {
            labels: ['Использовано', 'Свободно'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#ff6b6b', '#f8f9fa'],
                borderWidth: 0
            }]
        },
        options: chartOptions
    });

    // Memory диаграмма
    const memoryCtx = document.getElementById('memory-chart').getContext('2d');
    memoryChart = new Chart(memoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Использовано', 'Свободно'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#4834d4', '#f8f9fa'],
                borderWidth: 0
            }]
        },
        options: chartOptions
    });

    // Disk диаграмма
    const diskCtx = document.getElementById('disk-chart').getContext('2d');
    diskChart = new Chart(diskCtx, {
        type: 'doughnut',
        data: {
            labels: ['Использовано', 'Свободно'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#00b894', '#f8f9fa'],
                borderWidth: 0
            }]
        },
        options: chartOptions
    });
}

// Настройка навигации по вкладкам
function setupTabNavigation() {
    // Проверяем существование элементов перед добавлением обработчиков
    const complaintsTab = document.getElementById('tab-complaints');
    const improvementsTab = document.getElementById('tab-improvements');
    
    if (complaintsTab) {
        complaintsTab.addEventListener('click', () => showTab('complaints'));
    }
    
    if (improvementsTab) {
        improvementsTab.addEventListener('click', () => showTab('improvements'));
    }
    
    // Навигация уже настроена в HTML через data-tab атрибуты
    console.log('Навигация по вкладкам настроена');
}

// Настройка фильтров
function setupFilters() {
  // Удаляю обработчики событий для фильтров, если они были
  // Например:
  // document.getElementById('type-filter').addEventListener('change', filterComplaints);
  // document.getElementById('category-filter').addEventListener('change', filterComplaints);
}

// Показать вкладку
function showTab(tabName) {
    currentTab = tabName;
    
    // Убираем активный класс со всех навигационных ссылок
    document.querySelectorAll('.nav-link').forEach(tab => tab.classList.remove('active'));
    
    // Добавляем активный класс к выбранной вкладке
    const activeNavLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
    
    // Скрываем все контенты вкладок
    document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
    
    // Показываем выбранную вкладку
    const tabContent = document.getElementById(tabName + '-tab');
    if (tabContent) {
        tabContent.style.display = 'block';
    }
    
    // Загружаем данные для вкладки
    if (tabName === 'complaints') {
        refreshComplaints();
        refreshComplaintsStats();
    } else if (tabName === 'status') {
        refreshServerStatus();
        refreshStats();
    } else if (tabName === 'logs') {
        loadContainersList();
    } else if (tabName === 'errors') {
        refreshClientErrors();
    }
    
    console.log('Переключено на вкладку:', tabName);
}

// Загрузка начальных данных
function loadInitialData() {
    refreshServerStatus();
    refreshStats();
    refreshComplaints();
    refreshComplaintsStats();
}

// Обновление графиков трендов
function updateTrendCharts(stats) {
    if (stats.cpu) {
        cpuTrendChart.data.labels = stats.cpu.labels;
        cpuTrendChart.data.datasets[0].data = stats.cpu.data;
        cpuTrendChart.update('none');
    }
    
    if (stats.memory) {
        memoryTrendChart.data.labels = stats.memory.labels;
        memoryTrendChart.data.datasets[0].data = stats.memory.data;
        memoryTrendChart.update('none');
    }
    
    if (stats.disk) {
        diskTrendChart.data.labels = stats.disk.labels;
        diskTrendChart.data.datasets[0].data = stats.disk.data;
        diskTrendChart.update('none');
    }
}

// Обновление статистики
async function refreshStats() {
    // Проверяем аутентификацию
    if (!adminCredentials || !adminCredentials.password) {
        console.log('Пропускаем обновление статистики - нет аутентификации');
        return;
    }
    
    try {
        console.log('Обновление статистики...');
        console.log('adminCredentials для статистики:', adminCredentials);
        
        const [statsResponse, summaryResponse] = await Promise.all([
            fetch(`/api/stats`, {
                headers: {
                    'x-admin-username': adminCredentials.username,
                    'x-admin-password': adminCredentials.password,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`/api/stats-summary`, {
                headers: {
                    'x-admin-username': adminCredentials.username,
                    'x-admin-password': adminCredentials.password,
                    'Content-Type': 'application/json'
                }
            })
        ]);

        console.log('Ответ статистики:', statsResponse.status, statsResponse.statusText);
        console.log('Ответ сводной статистики:', summaryResponse.status, summaryResponse.statusText);

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateTrendCharts(stats);
        } else {
            console.error('Ошибка получения статистики:', statsResponse.status);
        }

        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            updateStatsSummary(summary);
        } else {
            console.error('Ошибка получения сводной статистики:', summaryResponse.status);
        }
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Обновление сводной статистики
function updateStatsSummary(summary) {
    if (summary.cpu) {
        document.getElementById('cpu-current').textContent = summary.cpu.current.toFixed(1);
        document.getElementById('cpu-average').textContent = summary.cpu.average.toFixed(1);
        document.getElementById('cpu-max').textContent = summary.cpu.max.toFixed(1);
    }
    
    if (summary.memory) {
        document.getElementById('memory-current').textContent = summary.memory.current.toFixed(1);
        document.getElementById('memory-average').textContent = summary.memory.average.toFixed(1);
        document.getElementById('memory-max').textContent = summary.memory.max.toFixed(1);
    }
    
    if (summary.disk) {
        document.getElementById('disk-current').textContent = summary.disk.current.toFixed(1);
        document.getElementById('disk-average').textContent = summary.disk.average.toFixed(1);
        document.getElementById('disk-max').textContent = summary.disk.max.toFixed(1);
    }
}

// Тестирование SSH подключения
async function testSSHConnection() {
  try {
    console.log('Тестирование SSH подключения...');
    const response = await fetch(`/api/ssh-test`, {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка тестирования SSH: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ SSH подключение работает!');
    } else {
      alert('❌ SSH подключение не работает: ' + (data.error || data.message));
    }
    
  } catch (error) {
    console.error('Ошибка тестирования SSH:', error);
    alert('❌ Ошибка тестирования SSH: ' + error.message);
  }
}

// Обновление статуса сервера
async function refreshServerStatus() {
  // Проверяем аутентификацию
  if (!adminCredentials || !adminCredentials.password) {
    console.log('Пропускаем обновление статуса сервера - нет аутентификации');
    return;
  }
  
  try {
    console.log('Обновление статуса сервера...');
    console.log('adminCredentials:', adminCredentials);
    console.log('Пароль для запроса:', adminCredentials.password ? '***' : 'не установлен');
    
    const response = await fetch(`/api/server-status`, {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Ответ сервера статуса:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Ошибка получения статуса сервера: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    updateSystemMetrics(data.system);
    updateDockerTable(data.docker.containers);
    
  } catch (error) {
    console.error('Ошибка обновления статуса сервера:', error);
    showError('Ошибка получения данных о статусе сервера');
  }
}

// Обновление системных метрик
function updateSystemMetrics(system) {
    if (!system || !system.cpu || !system.memory || !system.disk || !system.disk[0]) return;
    // CPU
    const cpuLoad = system.cpu.load.toFixed(1);
    document.getElementById('cpu-load').textContent = cpuLoad + '%';
    document.getElementById('cpu-progress').style.width = cpuLoad + '%';
    // Memory
    const memoryPercent = parseFloat(system.memory.usedPercent);
    document.getElementById('memory-usage').textContent = memoryPercent + '%';
    document.getElementById('memory-progress').style.width = memoryPercent + '%';
    // Disk (берем первый диск)
    const diskPercent = parseFloat(system.disk[0].usedPercent);
    document.getElementById('disk-usage').textContent = diskPercent + '%';
    document.getElementById('disk-progress').style.width = diskPercent + '%';
    // Обновляем диаграммы
    updateChart(cpuChart, cpuLoad, 100 - cpuLoad);
    updateChart(memoryChart, memoryPercent, 100 - memoryPercent);
    updateChart(diskChart, diskPercent, 100 - diskPercent);
}

// Обновление диаграммы
function updateChart(chart, used, free) {
    chart.data.datasets[0].data = [used, free];
    chart.update();
}

// Описания контейнеров
const dockerDescriptions = {
    'willowe_admin_panel': 'Веб-интерфейс админки Willowe',
    'dating_app_server': 'Основной backend-сервер приложения',
    'dating_app_kafka_ui': 'Веб-интерфейс для мониторинга Kafka',
    'dating_app_alloy': 'Агент сбора метрик (Grafana Alloy)',
    'dating_app_kafka_exporter': 'Экспортер метрик Kafka для Prometheus',
    'dating_app_kafka': 'Брокер Kafka (очереди сообщений)',
    'dating_app_redis_exporter': 'Экспортер метрик Redis для Prometheus',
    'dating_app_zookeeper': 'Координатор Kafka (Zookeeper)',
    'dating_app_mongodb': 'База данных MongoDB',
    'dating_app_node_exporter': 'Экспортер метрик сервера для Prometheus',
    'dating_app_redis': 'Кэш и брокер сообщений Redis'
};

// Для хранения состояния раскрытия
let expandedContainers = {};

function updateDockerTable(containers) {
    const container = document.getElementById('docker-table-container');
    if (!containers || containers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Нет запущенных контейнеров</p>';
        return;
    }
    let tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Имя контейнера</th>
                    <th>Статус</th>
                    <th>Порты</th>
                </tr>
            </thead>
            <tbody>
    `;
    containers.forEach(containerData => {
        const statusClass = containerData.status.includes('Up') ? 'status-running' : 'status-stopped';
        const statusText = containerData.status.includes('Up') ? 'Запущен' : 'Остановлен';
        const isExpanded = expandedContainers[containerData.name];
        tableHTML += `
            <tr class="docker-row" data-name="${containerData.name}">
                <td>${containerData.name}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${containerData.ports || '-'}</td>
            </tr>
            <tr class="docker-details-row" style="display: ${isExpanded ? 'table-row' : 'none'}; background: #f8f9fa;">
                <td colspan="3">
                    <div style="padding: 15px 10px;">
                        <div style="margin-bottom: 10px;"><strong>Описание:</strong> ${dockerDescriptions[containerData.name] || 'Нет описания'}</div>
                        <div style="margin-bottom: 10px;">
                            <strong>Управление:</strong>
                            <button class="refresh-btn" onclick="showDockerActionModal('${containerData.name}', 'restart')"><i class="fas fa-sync-alt"></i> Рестарт</button>
                            <button class="refresh-btn" onclick="showDockerActionModal('${containerData.name}', 'stop')"><i class="fas fa-stop"></i> Остановить</button>
                            <button class="refresh-btn" onclick="showDockerActionModal('${containerData.name}', 'start')"><i class="fas fa-play"></i> Запустить</button>
                        </div>
                        <div style="font-size: 13px; color: #888;">
                            <b>Команды:</b><br>
                            <code>docker restart ${containerData.name}</code><br>
                            <code>docker stop ${containerData.name}</code><br>
                            <code>docker start ${containerData.name}</code>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
    // Навешиваем обработчик на строки
    document.querySelectorAll('.docker-row').forEach(row => {
        row.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            expandedContainers[name] = !expandedContainers[name];
            updateDockerTable(containers);
        });
    });
}

// Модальное окно подтверждения действия
function showDockerActionModal(containerName, action) {
    const actionText = {
        'restart': 'рестартовать',
        'stop': 'остановить',
        'start': 'запустить'
    };
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header" style="background: #667eea; color: white; border-radius: 20px 20px 0 0;">
                <h2>Подтверждение</h2>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <p>Вы уверены, что хотите <b>${actionText[action]}</b> контейнер <b>${containerName}</b>?</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="refresh-btn" style="background: #00b894; color: white;" onclick="confirmDockerAction('${containerName}', '${action}', this)">Да</button>
                    <button class="refresh-btn" style="background: #ff6b6b; color: white;" onclick="this.closest('.modal').remove()">Нет</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Запуск всех Docker контейнеров
async function startAllContainers() {
    // Проверяем, что у нас есть пароль администратора
    if (!adminCredentials || !adminCredentials.password) {
        alert('❌ Ошибка: Не установлен пароль администратора. Попробуйте перелогиниться.');
        return;
    }
    
    // Показываем модальное окно подтверждения
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; border-radius: 20px 20px 0 0;">
                <h2><i class="fas fa-play-circle"></i> Запуск всех контейнеров</h2>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <p>Вы уверены, что хотите запустить <b>все Docker контейнеры</b>?</p>
                <p style="color: #666; font-size: 14px;">Это действие запустит все остановленные контейнеры на сервере.</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="refresh-btn" id="start-all-btn" style="background: linear-gradient(45deg, #28a745, #20c997); color: white;" onclick="executeStartAllContainers(this)">
                        <i class="fas fa-play-circle"></i> Запустить все
                    </button>
                    <button class="refresh-btn" style="background: #6c757d; color: white;" onclick="this.closest('.modal').remove()">
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Выполнение запуска всех контейнеров
async function executeStartAllContainers(btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Выполняется...';
    
    try {
        console.log('Запуск всех Docker контейнеров...');
        console.log('Пароль администратора:', adminCredentials.password ? '***' : 'не установлен');
        
        const response = await fetch('/api/docker-start-all', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-username': adminCredentials.username,
                'x-admin-password': adminCredentials.password
            }
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Результат запуска всех контейнеров:', data);
        
        if (data.success) {
            // Показываем детальный результат
            showStartAllResults(data);
        } else {
            alert('❌ Ошибка: ' + (data.error || 'Неизвестная ошибка'));
        }
        
    } catch (error) {
        console.error('Ошибка запуска всех контейнеров:', error);
        alert('❌ Ошибка: ' + error.message);
    } finally {
        // Удаляем модальное окно
        document.querySelectorAll('.modal').forEach(m => m.remove());
        // Обновляем статус сервера
        refreshServerStatus();
    }
}

// Показ результатов запуска всех контейнеров
function showStartAllResults(data) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let resultsHtml = '';
    if (data.results && data.results.length > 0) {
        resultsHtml = '<div style="max-height: 300px; overflow-y: auto; margin-top: 15px;">';
        data.results.forEach(result => {
            const statusIcon = result.status === 'success' ? '✅' : '❌';
            const statusColor = result.status === 'success' ? '#28a745' : '#dc3545';
            resultsHtml += `
                <div style="padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">${result.container}</span>
                    <span style="color: ${statusColor}; font-weight: 600;">${statusIcon} ${result.status === 'success' ? 'Запущен' : 'Ошибка'}</span>
                </div>
            `;
            if (result.error) {
                resultsHtml += `
                    <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 8px; font-size: 12px; color: #666;">
                        ${result.error}
                    </div>
                `;
            }
        });
        resultsHtml += '</div>';
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; border-radius: 20px 20px 0 0;">
                <h2><i class="fas fa-check-circle"></i> Результат запуска</h2>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">${data.started > 0 ? '✅' : '❌'}</div>
                    <h3 style="color: ${data.started > 0 ? '#28a745' : '#dc3545'};">${data.message}</h3>
                    <p style="color: #666;">Успешно запущено: <strong>${data.started}</strong> из <strong>${data.total}</strong> контейнеров</p>
                </div>
                ${resultsHtml}
                <div style="text-align: center; margin-top: 20px;">
                    <button class="refresh-btn" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white;" onclick="this.closest('.modal').remove()">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Выполнение действия над контейнером
function confirmDockerAction(containerName, action, btn) {
    // Проверяем, что у нас есть пароль администратора
    if (!adminCredentials || !adminCredentials.password) {
        alert('❌ Ошибка: Не установлен пароль администратора. Попробуйте перелогиниться.');
        document.querySelectorAll('.modal').forEach(m => m.remove());
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Выполняется...';
    
    console.log('Выполнение Docker действия:');
    console.log('  - Контейнер:', containerName);
    console.log('  - Действие:', action);
    console.log('  - Пароль:', adminCredentials.password ? '***' : 'не установлен');
    console.log('  - adminCredentials:', adminCredentials);
    
    fetch(`/api/docker-action`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-admin-username': adminCredentials.username,
            'x-admin-password': adminCredentials.password
        },
        body: JSON.stringify({ name: containerName, action })
    })
    .then(res => {
        console.log('Ответ сервера Docker action:', res.status, res.statusText);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
    })
    .then(data => {
        console.log('Результат Docker действия:', data);
        alert(data.success ? 'Операция выполнена успешно!' : ('Ошибка: ' + (data.error || '')));
        document.querySelectorAll('.modal').forEach(m => m.remove());
        refreshServerStatus();
    })
    .catch(err => {
        console.error('Ошибка Docker действия:', err);
        alert('Ошибка: ' + err.message);
        document.querySelectorAll('.modal').forEach(m => m.remove());
    });
}

// Глобальные переменные для жалоб
let complaintsStats = {};

// Обновление жалоб
async function refreshComplaints() {
  // Проверяем аутентификацию
  if (!adminCredentials || !adminCredentials.password) {
    console.log('Пропускаем обновление жалоб - нет аутентификации');
    return;
  }
  
  try {
    console.log('Загружаем жалобы...');
    console.log('adminCredentials для жалоб:', adminCredentials);
    console.log('Пароль для запроса жалоб:', adminCredentials.password ? '***' : 'не установлен');
    
    const response = await fetch(`/api/all-complaints`, {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Ответ сервера для жалоб:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Текст ошибки:', errorText);
      throw new Error(`Ошибка получения жалоб: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    allComplaints = await response.json();
    console.log('Получено жалоб:', allComplaints.length);
    console.log('Первая жалоба:', allComplaints[0]);
    
    updateComplaintsList(allComplaints);
    updateComplaintsCount(allComplaints.length);
  } catch (error) {
    console.error('Ошибка обновления жалоб:', error);
    showComplaintsPlaceholder();
  }
}

// Обновление статистики жалоб
async function refreshComplaintsStats() {
  // Проверяем аутентификацию
  if (!adminCredentials || !adminCredentials.password) {
    console.log('Пропускаем обновление статистики жалоб - нет аутентификации');
    return;
  }
  
  try {
    console.log('Загружаем статистику жалоб...');
    console.log('Пароль администратора:', adminCredentials.password ? '***' : 'не установлен');
    
    const response = await fetch(`/api/complaints-stats`, {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Ответ сервера для статистики:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Ошибка получения статистики жалоб: ${response.status} ${response.statusText}`);
    }
    
    complaintsStats = await response.json();
    console.log('Получена статистика:', complaintsStats);
    updateComplaintsStats(complaintsStats);
  } catch (error) {
    console.error('Ошибка обновления статистики жалоб:', error);
  }
}

// Обновление статистики на странице
function updateComplaintsStats(stats) {
  document.getElementById('total-complaints').textContent = stats.total || 0;
  document.getElementById('today-complaints').textContent = stats.today || 0;
  document.getElementById('active-complaints').textContent = stats.total || 0; // Показываем общее количество как активные
}

// Обновление счетчика жалоб
function updateComplaintsCount(count) {
  document.getElementById('complaints-count').textContent = `Показано: ${count} жалоб`;
}

// Обновление списка жалоб
function updateComplaintsList(list, containerId = 'complaints-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Контейнер для жалоб не найден:', containerId);
        return;
    }
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Нет данных</p>';
        return;
    }
    let complaintsHTML = '';
    list.forEach(complaint => {
        const date = new Date(complaint.createdAt).toLocaleString('ru-RU');
        complaintsHTML += `
            <div class="complaint-item">
                <div class="complaint-header">
                    <span class="complaint-type">${getComplaintTypeText(complaint.complaintType)}</span>
                    <span class="complaint-date">${date}</span>
                </div>
                <div class="complaint-text">${complaint.complaintText}</div>
                <div class="complaint-meta">
                    <span><strong>От:</strong> ${complaint.senderEmail}</span>
                    <span><strong>На пользователя:</strong> ${complaint.reportedUserId}</span>
                    <span><strong>Тип:</strong> ${getComplaintCategoryText(complaint.type)}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = complaintsHTML;
}

function updateImprovementsCount(count) {
    document.getElementById('improvements-count').textContent = `Показано: ${count} улучшений`;
}

// Показать заглушку для жалоб
function showComplaintsPlaceholder(containerId = 'complaints-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Контейнер для жалоб не найден:', containerId);
        return;
    }
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; color: #667eea;"></i>
            <h3>Ошибка загрузки жалоб</h3>
            <p>Не удалось загрузить жалобы. Проверьте подключение к серверу.</p>
        </div>
    `;
}

// Получить текст типа жалобы
function getComplaintTypeText(type) {
    const types = {
        'SPAM': 'Спам',
        'FAKE_PROFILE': 'Фейковый профиль',
        'INSULT': 'Оскорбления',
        'HARASSMENT': 'Домогательства',
        'SCAM': 'Мошенничество',
        'OTHER': 'Другое',
        'IMPROVEMENTS': 'Улучшения',
        'ISSUES': 'Проблемы'
    };
    return types[type] || type;
}

// Получить текст категории жалобы
function getComplaintCategoryText(category) {
    const categories = {
        'complain': 'Жалоба',
        'improve_and_problem': 'Предложение/Проблема'
    };
    return categories[category] || category;
}

// Показать ошибку
function showError(message) {
    const container = document.getElementById(currentTab === 'status' ? 'docker-table-container' : 'complaints-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
            <h3>Ошибка</h3>
            <p>${message}</p>
        </div>
    `;
}

// Применение фильтров к жалобам
function applyComplaintsFilters() {
  const typeFilter = document.getElementById('type-filter').value;
  const categoryFilter = document.getElementById('category-filter').value;
  
  let filteredComplaints = allComplaints || [];
  
  // Фильтрация по типу жалобы
  if (typeFilter) {
    filteredComplaints = filteredComplaints.filter(complaint => 
      complaint.complaintType === typeFilter
    );
  }
  
  // Фильтрация по категории
  if (categoryFilter) {
    filteredComplaints = filteredComplaints.filter(complaint => 
      complaint.type === categoryFilter
    );
  }
  
  console.log(`Применены фильтры. Показано ${filteredComplaints.length} из ${allComplaints.length} жалоб`);
  updateComplaintsList(filteredComplaints);
  updateComplaintsCount(filteredComplaints.length);
}

// Сброс фильтров жалоб
function clearComplaintsFilters() {
  document.getElementById('type-filter').value = '';
  document.getElementById('category-filter').value = '';
  
  console.log('Фильтры сброшены. Показаны все жалобы');
  updateComplaintsList(allComplaints);
  updateComplaintsCount(allComplaints.length);
}

// Экспорт жалоб в CSV
function exportComplaintsToCSV() {
  // Используем отфильтрованные жалобы, если есть фильтры
  const typeFilter = document.getElementById('type-filter').value;
  const categoryFilter = document.getElementById('category-filter').value;
  
  let complaintsToExport = allComplaints || [];
  
  // Применяем те же фильтры, что и для отображения
  if (typeFilter) {
    complaintsToExport = complaintsToExport.filter(complaint => 
      complaint.complaintType === typeFilter
    );
  }
  
  if (categoryFilter) {
    complaintsToExport = complaintsToExport.filter(complaint => 
      complaint.type === categoryFilter
    );
  }
  
  if (complaintsToExport.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  
  // Создаем CSV заголовки
  const headers = [
    'Дата',
    'Тип жалобы',
    'Категория',
    'Email отправителя',
    'ID отправителя',
    'ID пользователя',
    'Текст жалобы'
  ];
  
  // Создаем CSV данные
  const csvData = complaintsToExport.map(complaint => [
    new Date(complaint.createdAt).toLocaleString('ru-RU'),
    getComplaintTypeText(complaint.complaintType),
    getComplaintCategoryText(complaint.type),
    complaint.senderEmail,
    complaint.senderId,
    complaint.reportedUserId,
    `"${complaint.complaintText.replace(/"/g, '""')}"` // Экранируем кавычки
  ]);
  
  // Объединяем заголовки и данные
  const csvContent = [headers, ...csvData]
    .map(row => row.join(','))
    .join('\n');
  
  // Создаем и скачиваем файл
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `complaints_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ЛОГАМИ =====

let realTimeLogsInterval = null;
let currentLogs = '';

// Загрузка списка контейнеров
async function loadContainersList() {
  if (!adminCredentials || !adminCredentials.password) {
    console.log('Пропускаем загрузку списка контейнеров - нет аутентификации');
    return;
  }

  try {
    console.log('Загружаем список контейнеров...');
    const response = await fetch('/api/containers', {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения списка контейнеров: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      updateContainersSelect(data.containers);
    } else {
      console.error('Ошибка получения списка контейнеров:', data.error);
    }
  } catch (error) {
    console.error('Ошибка загрузки списка контейнеров:', error);
  }
}

// Обновление селекта контейнеров
function updateContainersSelect(containers) {
  const select = document.getElementById('container-select');
  if (!select) return;

  // Сохраняем текущее значение
  const currentValue = select.value;
  
  // Очищаем селект
  select.innerHTML = '';
  
  // Добавляем контейнеры
  containers.forEach(container => {
    const option = document.createElement('option');
    option.value = container.name;
    option.textContent = `${container.name} (${container.status})`;
    select.appendChild(option);
  });
  
  // Восстанавливаем значение или устанавливаем первое
  if (currentValue && containers.some(c => c.name === currentValue)) {
    select.value = currentValue;
  } else if (containers.length > 0) {
    select.value = containers[0].name;
  }
}

// Загрузка логов сервера
async function loadServerLogs() {
  if (!adminCredentials || !adminCredentials.password) {
    console.log('Пропускаем загрузку логов - нет аутентификации');
    return;
  }

  const container = document.getElementById('container-select').value;
  const lines = document.getElementById('lines-count').value;
  
  try {
    console.log(`Загружаем логи контейнера ${container}, строк: ${lines}`);
    updateLogsInfo('Загрузка логов...');
    
    const response = await fetch(`/api/server-logs?container=${container}&lines=${lines}`, {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка получения логов: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (data.success) {
      currentLogs = data.logs;
      updateLogsDisplay(data.logs);
      updateLogsInfo(`Загружено ${data.logs.split('\n').length} строк из контейнера ${container}`);
    } else {
      throw new Error(data.error || 'Неизвестная ошибка');
    }
  } catch (error) {
    console.error('Ошибка загрузки логов:', error);
    updateLogsDisplay(`Ошибка загрузки логов: ${error.message}`);
    updateLogsInfo('Ошибка загрузки');
  }
}

// Обновление отображения логов
function updateLogsDisplay(logs) {
  const container = document.getElementById('logs-container');
  if (!container) return;

  if (!logs || logs.trim() === '') {
    container.innerHTML = `
      <div style="text-align: center; color: #888; padding: 40px;">
        <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 20px;"></i>
        <h3>Логи пусты</h3>
        <p>Контейнер не содержит логов</p>
      </div>
    `;
  } else {
    // Форматируем логи с подсветкой
    const formattedLogs = formatLogs(logs);
    container.innerHTML = formattedLogs;
    
    // Прокручиваем вниз
    container.scrollTop = container.scrollHeight;
  }
}

// Форматирование логов с подсветкой
function formatLogs(logs) {
  return logs
    .split('\n')
    .map(line => {
      // Подсветка ошибок
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('err')) {
        return `<span style="color: #ff6b6b;">${escapeHtml(line)}</span>`;
      }
      // Подсветка предупреждений
      if (line.toLowerCase().includes('warn')) {
        return `<span style="color: #feca57;">${escapeHtml(line)}</span>`;
      }
      // Подсветка успешных операций
      if (line.toLowerCase().includes('success') || line.toLowerCase().includes('ok')) {
        return `<span style="color: #00b894;">${escapeHtml(line)}</span>`;
      }
      // Подсветка HTTP запросов
      if (line.includes('GET ') || line.includes('POST ') || line.includes('PUT ') || line.includes('DELETE ')) {
        return `<span style="color: #667eea;">${escapeHtml(line)}</span>`;
      }
      return escapeHtml(line);
    })
    .join('\n');
}

// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Обновление информации о логах
function updateLogsInfo(info) {
  const infoElement = document.getElementById('logs-info');
  if (infoElement) {
    infoElement.textContent = info;
  }
}

// Переключение режима реального времени
function toggleRealTimeLogs() {
  const btn = document.getElementById('realtime-btn');
  const isActive = btn.classList.contains('active');
  
  if (isActive) {
    // Останавливаем real-time
    if (realTimeLogsInterval) {
      clearInterval(realTimeLogsInterval);
      realTimeLogsInterval = null;
    }
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-play"></i> Реалтайм';
    btn.style.background = 'linear-gradient(45deg, #00b894, #00cec9)';
    updateLogsInfo('Режим реального времени остановлен');
  } else {
    // Запускаем real-time
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-pause"></i> Остановить';
    btn.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
    updateLogsInfo('Режим реального времени активен');
    
    // Загружаем логи сразу
    loadServerLogs();
    
    // Устанавливаем интервал обновления
    realTimeLogsInterval = setInterval(() => {
      loadServerLogs();
    }, 5000); // Обновляем каждые 5 секунд
  }
}

// Очистка логов
function clearLogs() {
  const container = document.getElementById('logs-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; color: #888; padding: 40px;">
        <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 20px;"></i>
        <h3>Логи очищены</h3>
        <p>Выберите контейнер и нажмите "Загрузить логи"</p>
      </div>
    `;
  }
  currentLogs = '';
  updateLogsInfo('Логи очищены');
}

// Копирование логов в буфер обмена
async function copyLogs() {
  if (!currentLogs) {
    alert('Нет логов для копирования');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(currentLogs);
    alert('Логи скопированы в буфер обмена');
  } catch (error) {
    console.error('Ошибка копирования:', error);
    alert('Ошибка копирования логов');
  }
}

// Скачивание логов
function downloadLogs() {
  if (!currentLogs) {
    alert('Нет логов для скачивания');
    return;
  }
  
  const container = document.getElementById('container-select').value;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${container}_logs_${timestamp}.log`;
  
  const blob = new Blob([currentLogs], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ОШИБКАМИ =====

let allClientErrors = [];

// Загрузка клиентских ошибок
async function refreshClientErrors() {
  if (!adminCredentials || !adminCredentials.password) {
    console.log('Пропускаем загрузку ошибок - нет аутентификации');
    return;
  }

  try {
    console.log('Загружаем клиентские ошибки...');
    
    const response = await fetch('/api/client-errors', {
      headers: {
        'x-admin-username': adminCredentials.username,
        'x-admin-password': adminCredentials.password,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения ошибок: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      allClientErrors = data.errors || [];
      updateErrorsDisplay(allClientErrors);
      updateErrorsStats(data.stats);
      updateErrorsCount(allClientErrors.length);
    } else {
      throw new Error(data.error || 'Неизвестная ошибка');
    }
  } catch (error) {
    console.error('Ошибка загрузки клиентских ошибок:', error);
    showErrorsPlaceholder();
  }
}

// Обновление отображения ошибок
function updateErrorsDisplay(errors) {
  const container = document.getElementById('errors-container');
  if (!container) return;

  if (!errors || errors.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 20px; color: #00b894;"></i>
        <h3>Ошибок не найдено</h3>
        <p>Отлично! Клиентских ошибок не обнаружено</p>
      </div>
    `;
    return;
  }

  let errorsHTML = '';
  errors.forEach(error => {
    const date = new Date(error.timestamp).toLocaleString('ru-RU');
    const severity = getErrorSeverity(error);
    const severityColor = getSeverityColor(severity);
    
    errorsHTML += `
      <div class="error-item" style="background: white; border: 1px solid #e9ecef; border-radius: 10px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div class="error-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #f1f3f4;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: ${severityColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${severity.toUpperCase()}
            </span>
            <span style="background: #667eea; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${error.type.toUpperCase()}
            </span>
          </div>
          <span style="color: #666; font-size: 14px;">${date}</span>
        </div>
        <div class="error-message" style="margin-bottom: 15px; font-weight: 600; color: #333;">
          ${escapeHtml(error.message)}
        </div>
        <div class="error-details" style="font-size: 14px; color: #666;">
          <div style="margin-bottom: 8px;"><strong>URL:</strong> ${escapeHtml(error.url || 'Не указан')}</div>
          <div style="margin-bottom: 8px;"><strong>Сессия:</strong> ${error.sessionId || 'Не указана'}</div>
          ${error.filename ? `<div style="margin-bottom: 8px;"><strong>Файл:</strong> ${escapeHtml(error.filename)}:${error.lineno || '?'}:${error.colno || '?'}</div>` : ''}
          ${error.stack ? `<div style="margin-bottom: 8px;"><strong>Stack:</strong> <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${escapeHtml(error.stack)}</pre></div>` : ''}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = errorsHTML;
}

// Определение важности ошибки
function getErrorSeverity(error) {
  if (error.type === 'javascript' && error.message.includes('Cannot read property')) {
    return 'high';
  }
  if (error.type === 'fetch' && error.status >= 500) {
    return 'high';
  }
  if (error.type === 'promise') {
    return 'medium';
  }
  return 'low';
}

// Получение цвета для важности
function getSeverityColor(severity) {
  switch (severity) {
    case 'high': return '#ff6b6b';
    case 'medium': return '#feca57';
    case 'low': return '#00b894';
    default: return '#6c757d';
  }
}

// Обновление статистики ошибок
function updateErrorsStats(stats) {
  document.getElementById('total-errors').textContent = stats.total || 0;
  document.getElementById('today-errors').textContent = stats.today || 0;
  document.getElementById('unique-sessions').textContent = stats.uniqueSessions || 0;
}

// Обновление счетчика ошибок
function updateErrorsCount(count) {
  document.getElementById('errors-count').textContent = `Показано: ${count} ошибок`;
}

// Показать заглушку для ошибок
function showErrorsPlaceholder() {
  const container = document.getElementById('errors-container');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #666;">
      <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #ff6b6b;"></i>
      <h3>Ошибка загрузки</h3>
      <p>Не удалось загрузить клиентские ошибки</p>
    </div>
  `;
}

// Применение фильтров к ошибкам
function applyErrorFilters() {
  const typeFilter = document.getElementById('error-type-filter').value;
  const severityFilter = document.getElementById('error-severity-filter').value;
  
  let filteredErrors = allClientErrors || [];
  
  // Фильтрация по типу
  if (typeFilter) {
    filteredErrors = filteredErrors.filter(error => 
      error.type === typeFilter
    );
  }
  
  // Фильтрация по важности
  if (severityFilter) {
    filteredErrors = filteredErrors.filter(error => 
      getErrorSeverity(error) === severityFilter
    );
  }
  
  console.log(`Применены фильтры ошибок. Показано ${filteredErrors.length} из ${allClientErrors.length} ошибок`);
  updateErrorsDisplay(filteredErrors);
  updateErrorsCount(filteredErrors.length);
}

// Сброс фильтров ошибок
function clearErrorFilters() {
  document.getElementById('error-type-filter').value = '';
  document.getElementById('error-severity-filter').value = '';
  
  console.log('Фильтры ошибок сброшены. Показаны все ошибки');
  updateErrorsDisplay(allClientErrors);
  updateErrorsCount(allClientErrors.length);
}

// Экспорт ошибок в CSV
function exportErrorsToCSV() {
  const typeFilter = document.getElementById('error-type-filter').value;
  const severityFilter = document.getElementById('error-severity-filter').value;
  
  let errorsToExport = allClientErrors || [];
  
  // Применяем те же фильтры
  if (typeFilter) {
    errorsToExport = errorsToExport.filter(error => 
      error.type === typeFilter
    );
  }
  
  if (severityFilter) {
    errorsToExport = errorsToExport.filter(error => 
      getErrorSeverity(error) === severityFilter
    );
  }
  
  if (errorsToExport.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  
  // Создаем CSV заголовки
  const headers = [
    'Дата',
    'Тип',
    'Важность',
    'Сообщение',
    'URL',
    'Сессия',
    'Файл',
    'Строка',
    'Колонка',
    'Stack Trace'
  ];
  
  // Создаем CSV данные
  const csvData = errorsToExport.map(error => [
    new Date(error.timestamp).toLocaleString('ru-RU'),
    error.type,
    getErrorSeverity(error),
    `"${error.message.replace(/"/g, '""')}"`,
    `"${(error.url || '').replace(/"/g, '""')}"`,
    error.sessionId || '',
    `"${(error.filename || '').replace(/"/g, '""')}"`,
    error.lineno || '',
    error.colno || '',
    `"${(error.stack || '').replace(/"/g, '""')}"`
  ]);
  
  // Объединяем заголовки и данные
  const csvContent = [headers, ...csvData]
    .map(row => row.join(','))
    .join('\n');
  
  // Создаем и скачиваем файл
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `client_errors_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Автообновление настроено в initializePanel()