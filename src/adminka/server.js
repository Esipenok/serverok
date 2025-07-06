const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cron = require('node-cron');
const SSHClient = require('./ssh-client');
const StatsManager = require('./stats-manager');
const AnalyticsManager = require('./analytics/analytics-manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware для перенаправления HTTP на HTTPS в production
const redirectToHttps = (req, res, next) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  if (!isSecure && process.env.NODE_ENV === 'production') {
    const host = req.headers.host;
    const httpsPort = '3443';
    return res.redirect(301, `https://${host.split(':')[0]}:${httpsPort}${req.originalUrl}`);
  }
  
  next();
};

// Middleware с отключенным CSP для тестирования
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Применяем перенаправление на HTTPS в production только если есть SSL сертификаты
if (process.env.NODE_ENV === 'production') {
  // Проверяем наличие SSL сертификатов
  try {
    fs.accessSync(path.join(__dirname, '../src/ssl', 'privkey.pem'));
    app.use(redirectToHttps);
    console.log('✅ SSL сертификаты найдены, HTTPS редирект включен');
  } catch (error) {
    console.log('⚠️  SSL сертификаты не найдены, HTTPS редирект отключен');
  }
}

// Конфигурация
const PORT = process.env.PORT || 3001;
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://46.62.131.90:3000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'qwe';

// Инициализация SSH клиента и менеджера статистики
const sshClient = new SSHClient();
const statsManager = new StatsManager();
const analyticsManager = new AnalyticsManager();

// Middleware для проверки аутентификации
const checkAuth = (req, res, next) => {
  const username = req.headers['x-admin-username'] || req.query.username;
  const password = req.headers['x-admin-password'] || req.query.password;
  
  console.log('🔐 Попытка аутентификации:');
  console.log('  - Полученный username:', username);
  console.log('  - Полученный password:', password ? '***' : 'не указан');
  console.log('  - Ожидаемый username:', ADMIN_USERNAME);
  console.log('  - Ожидаемый password:', ADMIN_PASSWORD);
  console.log('  - Headers:', req.headers);
  console.log('  - Query:', req.query);
  
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    console.log('❌ Аутентификация не удалась!');
    console.log('  - Username совпадает:', username === ADMIN_USERNAME);
    console.log('  - Password совпадает:', password === ADMIN_PASSWORD);
    return res.status(401).json({ 
      error: 'Неверные учетные данные администратора',
      debug: {
        receivedUsername: username,
        receivedPassword: password ? '***' : 'не указан',
        expectedUsername: ADMIN_USERNAME,
        usernameMatch: username === ADMIN_USERNAME,
        passwordMatch: password === ADMIN_PASSWORD
      }
    });
  }
  
  console.log('✅ Аутентификация успешна!');
  next();
};

// API маршруты
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Маршрут для отладки аутентификации
app.get('/api/auth-debug', (req, res) => {
  console.log('🔍 Запрос отладки аутентификации');
  console.log('  - Headers:', req.headers);
  console.log('  - Query:', req.query);
  console.log('  - Body:', req.body);
  
  res.json({
    message: 'Отладочная информация аутентификации',
    environment: {
      ADMIN_USERNAME: ADMIN_USERNAME,
      ADMIN_PASSWORD: ADMIN_PASSWORD ? '***' : 'не установлен',
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    },
    request: {
      headers: req.headers,
      query: req.query,
      body: req.body
    },
    timestamp: new Date().toISOString()
  });
});

// Маршрут для тестирования SSH подключения
app.get('/api/ssh-test', checkAuth, async (req, res) => {
  try {
    const isConnected = await sshClient.testConnection();
    res.json({ 
      success: isConnected, 
      message: isConnected ? 'SSH подключение работает' : 'SSH подключение не работает',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка тестирования SSH:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка тестирования SSH: ' + error.message 
    });
  }
});

// Маршрут для получения статистики
app.get('/api/stats', checkAuth, (req, res) => {
  try {
    const stats = statsManager.getStatsForCharts();
    // Если статистика пустая, возвращаем заглушку
    if (!stats || Object.keys(stats).length === 0) {
      res.json({
        cpu: { labels: [], data: [] },
        memory: { labels: [], data: [] },
        disk: { labels: [], data: [] }
      });
    } else {
      res.json(stats);
    }
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Маршрут для получения сводной статистики
app.get('/api/stats-summary', checkAuth, (req, res) => {
  try {
    const summary = statsManager.getSummaryStats();
    // Если сводная статистика пустая, возвращаем заглушку
    if (!summary || !summary.cpu) {
      res.json({
        cpu: { used: 25.5, free: 74.5 },
        memory: { used: 50.0, free: 50.0 },
        disk: { used: 50.0, free: 50.0 }
      });
    } else {
      res.json(summary);
    }
  } catch (error) {
    console.error('Ошибка получения сводной статистики:', error);
    res.status(500).json({ error: 'Ошибка получения сводной статистики' });
  }
});

// Маршрут для получения статуса сервера
app.get('/api/server-status', checkAuth, async (req, res) => {
  try {
    const status = await sshClient.getServerStatus();
    res.json(status);
  } catch (error) {
    console.error('Ошибка получения статуса сервера:', error);
    res.status(500).json({ error: 'Ошибка получения статуса сервера: ' + error.message });
  }
});

// Маршрут для получения жалоб
app.get('/api/complaints', checkAuth, async (req, res) => {
  try {
    const axios = require('axios');
    
    // Получаем жалобы из основного приложения
    const response = await axios.get(`${MAIN_APP_URL}/api/complaints`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_PASSWORD}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка получения жалоб:', error);
    res.status(500).json({ error: 'Ошибка получения жалоб' });
  }
});

// Маршрут для получения всех жалоб
app.get('/api/all-complaints', checkAuth, async (req, res) => {
  try {
    const axios = require('axios');
    
    const response = await axios.get(`${MAIN_APP_URL}/api/complaints/all`, {
      headers: {
        'x-admin-password': ADMIN_PASSWORD,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка получения всех жалоб:', error);
    res.status(500).json({ error: 'Ошибка получения всех жалоб' });
  }
});

// Маршрут для получения статистики жалоб
app.get('/api/complaints-stats', checkAuth, async (req, res) => {
  try {
    const axios = require('axios');
    
    const response = await axios.get(`${MAIN_APP_URL}/api/complaints/stats`, {
      headers: {
        'x-admin-password': ADMIN_PASSWORD,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка получения статистики жалоб:', error);
    res.status(500).json({ error: 'Ошибка получения статистики жалоб' });
  }
});

// Маршрут для получения логов сервера
app.get('/api/server-logs', checkAuth, async (req, res) => {
  try {
    const { container = 'dating_app_server', lines = '100', follow = 'false' } = req.query;
    
    console.log(`Запрос логов контейнера: ${container}, строк: ${lines}, follow: ${follow}`);
    
    // Команда для получения логов
    let command = `docker logs ${container} --tail ${lines}`;
    
    if (follow === 'true') {
      // Для real-time логов используем временный файл и tail -f
      const tempFile = `/tmp/${container}_logs_${Date.now()}.log`;
      command = `docker logs ${container} --tail ${lines} > ${tempFile} && tail -f ${tempFile}`;
    }
    
    const result = await sshClient.executeCommand(command);
    
    if (result.success) {
      res.json({
        success: true,
        logs: result.stdout,
        container: container,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.stderr || 'Ошибка получения логов',
        container: container
      });
    }
  } catch (error) {
    console.error('Ошибка получения логов сервера:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка получения логов сервера: ' + error.message 
    });
  }
});

// Маршрут для получения списка доступных контейнеров
app.get('/api/containers', checkAuth, async (req, res) => {
  try {
    const command = 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"';
    const result = await sshClient.executeCommand(command);
    
    if (result.success) {
      // Парсим вывод docker ps
      const lines = result.stdout.trim().split('\n');
      const containers = [];
      
      // Пропускаем заголовок
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            containers.push({
              name: parts[0],
              status: parts.slice(1, -1).join(' '),
              ports: parts[parts.length - 1]
            });
          }
        }
      }
      
      res.json({
        success: true,
        containers: containers
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.stderr || 'Ошибка получения списка контейнеров'
      });
    }
  } catch (error) {
    console.error('Ошибка получения списка контейнеров:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка получения списка контейнеров: ' + error.message 
    });
  }
});

// Маршрут для сбора клиентских ошибок
app.post('/api/client-errors', (req, res) => {
  try {
    const error = req.body;
    
    // Добавляем дополнительную информацию
    error.serverTimestamp = new Date().toISOString();
    error.ip = req.ip || req.connection.remoteAddress;
    error.userAgent = req.headers['user-agent'];
    
    // Логируем ошибку
    console.error('🔴 Клиентская ошибка:', {
      type: error.type,
      message: error.message,
      url: error.url,
      timestamp: error.timestamp,
      sessionId: error.sessionId
    });
    
    // Здесь можно сохранить ошибку в базу данных или файл
    // Пока просто логируем
    
    res.json({ success: true, message: 'Ошибка зарегистрирована' });
  } catch (error) {
    console.error('Ошибка обработки клиентской ошибки:', error);
    res.status(500).json({ success: false, error: 'Ошибка обработки' });
  }
});

// Маршрут для получения клиентских ошибок (для админки)
app.get('/api/client-errors', checkAuth, (req, res) => {
  try {
    // Здесь можно получить ошибки из базы данных
    // Пока возвращаем заглушку
    res.json({
      success: true,
      errors: [],
      stats: {
        total: 0,
        byType: {},
        byHour: {}
      }
    });
  } catch (error) {
    console.error('Ошибка получения клиентских ошибок:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения ошибок' });
  }
});

// Маршрут для сбора метрик производительности
app.post('/api/performance-metrics', (req, res) => {
  try {
    const metrics = req.body;
    
    // Добавляем дополнительную информацию
    metrics.forEach(metric => {
      metric.serverTimestamp = new Date().toISOString();
      metric.ip = req.ip || req.connection.remoteAddress;
    });
    
    // Логируем метрики (можно сохранить в базу данных)
    console.log('📊 Метрики производительности:', {
      count: metrics.length,
      types: [...new Set(metrics.map(m => m.type))],
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Метрики зарегистрированы' });
  } catch (error) {
    console.error('Ошибка обработки метрик производительности:', error);
    res.status(500).json({ success: false, error: 'Ошибка обработки' });
  }
});

// Маршрут для получения метрик производительности (для админки)
app.get('/api/performance-metrics', checkAuth, (req, res) => {
  try {
    // Здесь можно получить метрики из базы данных
    // Пока возвращаем заглушку
    res.json({
      success: true,
      metrics: [],
      stats: {
        total: 0,
        byType: {},
        averagePageLoad: 0,
        averageNetworkRequest: 0,
        memoryUsage: 0
      }
    });
  } catch (error) {
    console.error('Ошибка получения метрик производительности:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения метрик' });
  }
});

// ===== АНАЛИТИЧЕСКИЕ API =====

// Маршрут для сбора аналитических событий
app.post('/api/analytics/events', (req, res) => {
  try {
    const events = req.body;
    
    // Добавляем события в менеджер аналитики
    analyticsManager.addEvents(events);
    
    console.log('📊 Аналитические события:', {
      count: events.length,
      events: events.map(e => e.event_name),
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'События зарегистрированы' });
  } catch (error) {
    console.error('Ошибка обработки аналитических событий:', error);
    res.status(500).json({ success: false, error: 'Ошибка обработки' });
  }
});

// Маршрут для получения аналитических метрик
app.get('/api/analytics/stats', checkAuth, (req, res) => {
  try {
    const stats = analyticsManager.getStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Ошибка получения аналитических метрик:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения метрик' });
  }
});

// Маршрут для получения аналитических событий
app.get('/api/analytics/events', checkAuth, (req, res) => {
  try {
    const { limit = 100, offset = 0, event_name, user_id, session_id, date_from, date_to } = req.query;
    
    let events;
    if (event_name || user_id || session_id || date_from || date_to) {
      // Фильтрованные события
      const filters = { event_name, user_id, session_id, date_from, date_to };
      events = analyticsManager.getFilteredEvents(filters);
    } else {
      // Все события с пагинацией
      events = analyticsManager.getEvents(parseInt(limit), parseInt(offset));
    }
    
    res.json({
      success: true,
      events: events,
      total: analyticsManager.events.length
    });
  } catch (error) {
    console.error('Ошибка получения аналитических событий:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения событий' });
  }
});

// Маршрут для экспорта аналитических данных
app.get('/api/analytics/export', checkAuth, (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const data = analyticsManager.exportData(format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.json"`);
    }
    
    res.send(data);
  } catch (error) {
    console.error('Ошибка экспорта аналитических данных:', error);
    res.status(500).json({ success: false, error: 'Ошибка экспорта' });
  }
});

// Маршрут для очистки старых аналитических данных
app.post('/api/analytics/cleanup', checkAuth, (req, res) => {
  try {
    const { days = 30 } = req.body;
    analyticsManager.cleanup(parseInt(days));
    
    res.json({
      success: true,
      message: `Очищены данные старше ${days} дней`
    });
  } catch (error) {
    console.error('Ошибка очистки аналитических данных:', error);
    res.status(500).json({ success: false, error: 'Ошибка очистки' });
  }
});

// Управление Docker-контейнерами
app.post('/api/docker-action', checkAuth, async (req, res) => {
  try {
    const { name, action } = req.body;
    const allowedActions = ['start', 'stop', 'restart'];
    if (!name || !allowedActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'Некорректные параметры' });
    }
    const cmd = `docker ${action} ${name}`;
    const result = await sshClient.executeCommand(cmd);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: result.stderr || 'Ошибка выполнения команды' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Запуск всех Docker контейнеров
app.post('/api/docker-start-all', checkAuth, async (req, res) => {
  try {
    console.log('Запуск всех Docker контейнеров...');
    
    // Получаем список всех контейнеров
    const listCmd = 'docker ps -a --format "{{.Names}}"';
    const listResult = await sshClient.executeCommand(listCmd);
    
    if (!listResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка получения списка контейнеров: ' + listResult.stderr 
      });
    }
    
    const containers = listResult.stdout.trim().split('\n').filter(name => name.trim());
    console.log('Найдено контейнеров:', containers.length);
    console.log('Контейнеры:', containers);
    
    if (containers.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Контейнеры не найдены',
        started: 0,
        total: 0
      });
    }
    
    // Запускаем каждый контейнер
    const results = [];
    let successCount = 0;
    
    for (const containerName of containers) {
      try {
        console.log(`Запуск контейнера: ${containerName}`);
        const startCmd = `docker start ${containerName}`;
        const result = await sshClient.executeCommand(startCmd);
        
        if (result.success) {
          successCount++;
          results.push({ container: containerName, status: 'success' });
          console.log(`✅ Контейнер ${containerName} запущен успешно`);
        } else {
          results.push({ 
            container: containerName, 
            status: 'error', 
            error: result.stderr || 'Неизвестная ошибка' 
          });
          console.log(`❌ Ошибка запуска контейнера ${containerName}:`, result.stderr);
        }
      } catch (error) {
        results.push({ 
          container: containerName, 
          status: 'error', 
          error: error.message 
        });
        console.log(`❌ Исключение при запуске контейнера ${containerName}:`, error.message);
      }
    }
    
    console.log(`Запуск завершен. Успешно: ${successCount}/${containers.length}`);
    
    res.json({
      success: true,
      message: `Запущено ${successCount} из ${containers.length} контейнеров`,
      started: successCount,
      total: containers.length,
      results: results
    });
    
  } catch (error) {
    console.error('Ошибка запуска всех контейнеров:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка запуска контейнеров: ' + error.message 
    });
  }
});

// WebSocket для real-time обновлений
io.on('connection', (socket) => {
  console.log('Клиент подключился к административной панели');
  
  socket.on('disconnect', () => {
    console.log('Клиент отключился от административной панели');
  });
});

// Cron задача для обновления статуса сервера каждую минуту
cron.schedule('* * * * *', async () => {
  try {
    const serverStatus = await sshClient.getServerStatus();
    
    // Добавляем данные в статистику
    statsManager.addDataPoint(serverStatus.timestamp, serverStatus.system);
    
    const statusData = {
      timestamp: serverStatus.timestamp,
      system: serverStatus.system
    };

    // Отправляем данные всем подключенным клиентам
    io.emit('server-status-update', statusData);
    
    // Отправляем обновленную статистику
    const stats = statsManager.getStatsForCharts();
    io.emit('stats-update', stats);
    
  } catch (error) {
    console.error('Ошибка обновления статуса сервера:', error);
  }
});

// Cron задача для очистки старых данных каждый час
cron.schedule('0 * * * *', () => {
  statsManager.cleanup();
  console.log('Очистка старых данных статистики выполнена');
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера в зависимости от окружения
if (process.env.NODE_ENV === 'production') {
  try {
    // Путь к SSL сертификатам (используем те же, что и основной сервер)
    const privateKey = fs.readFileSync(path.join(__dirname, '../src/ssl', 'privkey.pem'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, '../src/ssl', 'cert.pem'), 'utf8');
    const ca = fs.readFileSync(path.join(__dirname, '../src/ssl', 'chain.pem'), 'utf8');

    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca
    };

    // Создание HTTPS сервера
    const httpsServer = https.createServer(credentials, app);
    const httpsIo = socketIo(httpsServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Копируем обработчики WebSocket
    httpsIo.on('connection', (socket) => {
      console.log('HTTPS клиент подключился к административной панели');
      
      socket.on('disconnect', () => {
        console.log('HTTPS клиент отключился от административной панели');
      });
    });

    // Запуск HTTPS сервера
    httpsServer.listen(3443, () => {
      console.log(`HTTPS Административная панель запущена на порту 3443`);
      console.log(`Главная панель доступна по адресу: https://localhost:3443`);
      console.log(`SSH сервер: ${sshClient.config.host}`);
    });

    // HTTP сервер для перенаправления на HTTPS
    server.listen(PORT, () => {
      console.log(`HTTP Административная панель запущена на порту ${PORT} (перенаправление на HTTPS)`);
    });
  } catch (error) {
    console.error(`SSL сертификаты не найдены, запускаем HTTP на порту ${PORT}: ${error.message}`);
    // Если сертификаты не найдены, запускаем HTTP сервер
    server.listen(PORT, () => {
      console.log(`Административная панель запущена на порту ${PORT}`);
      console.log(`Главная панель доступна по адресу: http://localhost:${PORT}`);
      console.log(`SSH сервер: ${sshClient.config.host}`);
    });
  }
} else {
  // В режиме разработки используем только HTTP
  server.listen(PORT, () => {
    console.log(`Административная панель запущена на порту ${PORT}`);
    console.log(`Главная панель доступна по адресу: http://localhost:${PORT}`);
    console.log(`SSH сервер: ${sshClient.config.host}`);
  });
}

// Обработка завершения работы
process.on('SIGINT', async () => {
  console.log('Завершение работы сервера...');
  await sshClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Завершение работы сервера...');
  await sshClient.disconnect();
  process.exit(0);
}); 