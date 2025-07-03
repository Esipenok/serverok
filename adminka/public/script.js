// Глобальные переменные
let socket;
let cpuChart, memoryChart, diskChart;
let cpuTrendChart, memoryTrendChart, diskTrendChart;
let currentTab = 'status';
let currentUser = null;
let adminCredentials = {
    username: 'admin',
    password: 'qwe'
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupLoginForm();
    checkAuthStatus();
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
                loginSuccess(username);
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
            loginSuccess(savedUser, false);
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
        const debugResponse = await fetch('/admin/api/auth-debug');
        const debugData = await debugResponse.json();
        console.log('🔍 Отладочная информация:', debugData);
        
        // Проверяем локальные учетные данные
        const localAuth = username === adminCredentials.username && password === adminCredentials.password;
        console.log('🔍 Локальная проверка:', localAuth);
        
        // Проверяем через API
        const response = await fetch('/admin/api/ssh-test', {
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
        showLoginError(`Ошибка сети: ${error.message}`);
        return false;
    }
}

// Успешный вход
function loginSuccess(username, saveSession = true) {
    currentUser = username;
    
    if (saveSession) {
        localStorage.setItem('admin_user', username);
        localStorage.setItem('admin_timestamp', Date.now().toString());
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
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_timestamp');
    
    // Останавливаем WebSocket соединение
    if (socket) {
        socket.disconnect();
    }
    
    showLoginModal();
}

// Инициализация панели после входа
function initializePanel() {
    initializeSocket();
    initializeCharts();
    initializeTrendCharts();
    setupTabNavigation();
    setupFilters();
    loadInitialData();
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

// Инициализация WebSocket соединения
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Подключено к серверу');
    });
    
    socket.on('server-status-update', (data) => {
        updateSystemMetrics(data.system);
    });
    
    socket.on('stats-update', (stats) => {
        updateTrendCharts(stats);
    });
    
    socket.on('disconnect', () => {
        console.log('Отключено от сервера');
    });
}

// Инициализация круговых диаграмм
function initializeCharts() {
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
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Убираем активный класс со всех ссылок
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Добавляем активный класс к текущей ссылке
      link.classList.add('active');
      
      // Показываем соответствующую вкладку
      const tabName = link.getAttribute('data-tab');
      showTab(tabName);
    });
  });
}

// Настройка фильтров
function setupFilters() {
  const typeFilter = document.getElementById('type-filter');
  const categoryFilter = document.getElementById('category-filter');
  
  if (typeFilter) {
    typeFilter.addEventListener('change', filterComplaints);
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterComplaints);
  }
}

// Показать вкладку
function showTab(tabName) {
  // Скрываем все вкладки
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Показываем нужную вкладку
  const targetTab = document.getElementById(tabName + '-tab');
  if (targetTab) {
    targetTab.style.display = 'block';
  }
  
  currentTab = tabName;
  
      // Загружаем данные для вкладки
    if (tabName === 'status') {
        refreshServerStatus();
        refreshStats();
    } else if (tabName === 'complaints') {
        refreshComplaints();
        refreshComplaintsStats();
    }
}

// Загрузка начальных данных
function loadInitialData() {
    refreshServerStatus();
    refreshStats();
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
    try {
        const [statsResponse, summaryResponse] = await Promise.all([
                    fetch(`/admin/api/stats?username=${adminCredentials.username}&password=${adminCredentials.password}`),
        fetch(`/admin/api/stats-summary?username=${adminCredentials.username}&password=${adminCredentials.password}`)
        ]);

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateTrendCharts(stats);
        }

        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            updateStatsSummary(summary);
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
    const response = await fetch(`/admin/api/ssh-test?username=${adminCredentials.username}&password=${adminCredentials.password}`);
    if (!response.ok) {
      throw new Error('Ошибка тестирования SSH');
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
  try {
    const response = await fetch(`/admin/api/server-status?username=${adminCredentials.username}&password=${adminCredentials.password}`);
    if (!response.ok) {
      throw new Error('Ошибка получения статуса сервера');
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
    // CPU
    const cpuLoad = system.cpu.load.toFixed(1);
    document.getElementById('cpu-load').textContent = cpuLoad + '%';
    document.getElementById('cpu-progress').style.width = cpuLoad + '%';
    
    // Memory
    const memoryPercent = parseFloat(system.memory.usedPercent);
    document.getElementById('memory-usage').textContent = memoryPercent + '%';
    document.getElementById('memory-progress').style.width = memoryPercent + '%';
    
    // Disk (берем первый диск)
    const diskPercent = system.disk[0] ? parseFloat(system.disk[0].usedPercent) : 0;
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

// Обновление таблицы Docker контейнеров
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
    
    containers.forEach(container => {
        const statusClass = container.status.includes('Up') ? 'status-running' : 'status-stopped';
        const statusText = container.status.includes('Up') ? 'Запущен' : 'Остановлен';
        
        tableHTML += `
            <tr>
                <td>${container.name}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${container.ports || '-'}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Глобальные переменные для жалоб
let allComplaints = [];
let complaintsStats = {};

// Обновление жалоб
async function refreshComplaints() {
  try {
    const response = await fetch(`/admin/api/all-complaints?username=${adminCredentials.username}&password=${adminCredentials.password}`);
    if (!response.ok) {
      throw new Error('Ошибка получения жалоб');
    }
    
    allComplaints = await response.json();
    updateComplaintsList(allComplaints);
    updateComplaintsCount(allComplaints.length);
    
  } catch (error) {
    console.error('Ошибка обновления жалоб:', error);
    showComplaintsPlaceholder();
  }
}

// Обновление статистики жалоб
async function refreshComplaintsStats() {
  try {
    const response = await fetch(`/admin/api/complaints-stats?username=${adminCredentials.username}&password=${adminCredentials.password}`);
    if (!response.ok) {
      throw new Error('Ошибка получения статистики жалоб');
    }
    
    complaintsStats = await response.json();
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

// Фильтрация жалоб
function filterComplaints() {
  const typeFilter = document.getElementById('type-filter').value;
  const categoryFilter = document.getElementById('category-filter').value;
  
  let filteredComplaints = allComplaints;
  
  if (typeFilter) {
    filteredComplaints = filteredComplaints.filter(complaint => 
      complaint.complaintType === typeFilter
    );
  }
  
  if (categoryFilter) {
    filteredComplaints = filteredComplaints.filter(complaint => 
      complaint.type === categoryFilter
    );
  }
  
  updateComplaintsList(filteredComplaints);
  updateComplaintsCount(filteredComplaints.length);
}

// Обновление списка жалоб
function updateComplaintsList(complaints) {
    const container = document.getElementById('complaints-container');
    
    if (!complaints || complaints.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Жалоб пока нет</p>';
        return;
    }
    
    let complaintsHTML = '';
    
    complaints.forEach(complaint => {
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

// Показать заглушку для жалоб
function showComplaintsPlaceholder() {
    const container = document.getElementById('complaints-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; color: #667eea;"></i>
            <h3>Endpoint для получения жалоб не настроен</h3>
            <p>Для отображения жалоб необходимо создать endpoint /api/complaints/all в основном приложении</p>
            <p>Или использовать существующий endpoint для получения жалоб</p>
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

// Экспорт жалоб в CSV
function exportComplaintsToCSV() {
  const typeFilter = document.getElementById('type-filter').value;
  const categoryFilter = document.getElementById('category-filter').value;
  
  let complaintsToExport = allComplaints;
  
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

// Автообновление каждую минуту
setInterval(() => {
    if (currentTab === 'status') {
        refreshServerStatus();
        refreshStats();
    } else if (currentTab === 'complaints') {
        refreshComplaints();
    }
}, 60000); 