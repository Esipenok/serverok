const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const SSHClient = require('./ssh-client');
const StatsManager = require('./stats-manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Конфигурация
const PORT = process.env.PORT || 3001;
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://46.62.131.90:3000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'qwe';

// Инициализация SSH клиента и менеджера статистики
const sshClient = new SSHClient();
const statsManager = new StatsManager();

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
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Маршрут для получения сводной статистики
app.get('/api/stats-summary', checkAuth, (req, res) => {
  try {
    const summary = statsManager.getSummaryStats();
    res.json(summary);
  } catch (error) {
    console.error('Ошибка получения сводной статистики:', error);
    res.status(500).json({ error: 'Ошибка получения сводной статистики' });
  }
});

// Маршрут для получения статуса сервера
app.get('/api/server-status', checkAuth, async (req, res) => {
  try {
    const serverStatus = await sshClient.getServerStatus();
    res.json(serverStatus);
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

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Административная панель запущена на порту ${PORT}`);
  console.log(`Главная панель доступна по адресу: http://localhost:${PORT}`);
  console.log(`SSH сервер: ${sshClient.config.host}`);
});

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