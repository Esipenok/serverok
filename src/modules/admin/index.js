const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');

const router = express.Router();

// Импортируем компоненты админки из папки adminka
const SSHClient = require('../../../adminka/ssh-client');
const StatsManager = require('../../../adminka/stats-manager');

// Конфигурация
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'qwe';
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://localhost:3000';

// Инициализация SSH клиента и менеджера статистики
const sshClient = new SSHClient();
const statsManager = new StatsManager();

// Middleware для проверки аутентификации
const checkAuth = (req, res, next) => {
  const username = req.headers['x-admin-username'] || req.query.username;
  const password = req.headers['x-admin-password'] || req.query.password;
  
  console.log('🔐 Попытка аутентификации админки:');
  console.log('  - Полученный username:', username);
  console.log('  - Полученный password:', password ? '***' : 'не указан');
  
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    console.log('❌ Аутентификация админки не удалась!');
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
  
  console.log('✅ Аутентификация админки успешна!');
  next();
};

// Статические файлы админки
router.use('/static', express.static(path.join(__dirname, '../../../adminka/public')));

// Главная страница админки
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../adminka/public/index.html'));
});

// API маршруты
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Маршрут для отладки аутентификации
router.get('/api/auth-debug', (req, res) => {
  console.log('🔍 Запрос отладки аутентификации админки');
  console.log('  - Headers:', req.headers);
  console.log('  - Query:', req.query);
  
  res.json({
    message: 'Отладочная информация аутентификации админки',
    environment: {
      ADMIN_USERNAME: ADMIN_USERNAME,
      ADMIN_PASSWORD: ADMIN_PASSWORD ? '***' : 'не установлен',
      NODE_ENV: process.env.NODE_ENV,
      MAIN_APP_URL: MAIN_APP_URL
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
router.get('/api/ssh-test', checkAuth, async (req, res) => {
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
router.get('/api/stats', checkAuth, (req, res) => {
  try {
    const stats = statsManager.getStatsForCharts();
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Маршрут для получения сводной статистики
router.get('/api/stats-summary', checkAuth, (req, res) => {
  try {
    const summary = statsManager.getSummaryStats();
    res.json(summary);
  } catch (error) {
    console.error('Ошибка получения сводной статистики:', error);
    res.status(500).json({ error: 'Ошибка получения сводной статистики' });
  }
});

// Маршрут для получения статуса сервера
router.get('/api/server-status', checkAuth, async (req, res) => {
  try {
    const serverStatus = await sshClient.getServerStatus();
    res.json(serverStatus);
  } catch (error) {
    console.error('Ошибка получения статуса сервера:', error);
    res.status(500).json({ error: 'Ошибка получения статуса сервера: ' + error.message });
  }
});

// Маршрут для получения жалоб
router.get('/api/complaints', checkAuth, async (req, res) => {
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
router.get('/api/all-complaints', checkAuth, async (req, res) => {
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
router.get('/api/complaints-stats', checkAuth, async (req, res) => {
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

// Маршрут для получения пользователей
router.get('/api/users', checkAuth, async (req, res) => {
  try {
    const axios = require('axios');
    
    const response = await axios.get(`${MAIN_APP_URL}/api/users`, {
      headers: {
        'x-admin-password': ADMIN_PASSWORD,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Маршрут для получения матчей
router.get('/api/matches', checkAuth, async (req, res) => {
  try {
    const axios = require('axios');
    
    const response = await axios.get(`${MAIN_APP_URL}/api/matches`, {
      headers: {
        'x-admin-password': ADMIN_PASSWORD,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка получения матчей:', error);
    res.status(500).json({ error: 'Ошибка получения матчей' });
  }
});

// Маршрут для получения статистики приложения
router.get('/api/app-stats', checkAuth, async (req, res) => {
  try {
    const axios = require('axios');
    
    const response = await axios.get(`${MAIN_APP_URL}/api/stats`, {
      headers: {
        'x-admin-password': ADMIN_PASSWORD,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка получения статистики приложения:', error);
    res.status(500).json({ error: 'Ошибка получения статистики приложения' });
  }
});

// Маршрут для выполнения SSH команд
router.post('/api/ssh-command', checkAuth, async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Команда не указана' });
    }

    const result = await sshClient.executeCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Ошибка выполнения SSH команды:', error);
    res.status(500).json({ error: 'Ошибка выполнения SSH команды: ' + error.message });
  }
});

// Маршрут для перезапуска сервисов
router.post('/api/restart-services', checkAuth, async (req, res) => {
  try {
    const { service } = req.body;
    
    let command;
    switch (service) {
      case 'app':
        command = 'pm2 restart all';
        break;
      case 'nginx':
        command = 'sudo systemctl restart nginx';
        break;
      case 'mongodb':
        command = 'sudo systemctl restart mongod';
        break;
      case 'redis':
        command = 'sudo systemctl restart redis';
        break;
      default:
        return res.status(400).json({ error: 'Неизвестный сервис' });
    }

    const result = await sshClient.executeCommand(command);
    res.json({ success: true, result, service });
  } catch (error) {
    console.error('Ошибка перезапуска сервиса:', error);
    res.status(500).json({ error: 'Ошибка перезапуска сервиса: ' + error.message });
  }
});

// Маршрут для получения логов
router.get('/api/logs', checkAuth, async (req, res) => {
  try {
    const { service, lines = 100 } = req.query;
    
    let command;
    switch (service) {
      case 'app':
        command = `pm2 logs --lines ${lines}`;
        break;
      case 'nginx':
        command = `sudo tail -n ${lines} /var/log/nginx/error.log`;
        break;
      case 'system':
        command = `sudo journalctl -n ${lines}`;
        break;
      default:
        return res.status(400).json({ error: 'Неизвестный сервис' });
    }

    const result = await sshClient.executeCommand(command);
    res.json({ success: true, logs: result });
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: 'Ошибка получения логов: ' + error.message });
  }
});

// Инициализация cron задач
const initCronJobs = () => {
  // Обновление статистики каждые 5 минут
  cron.schedule('*/5 * * * *', () => {
    console.log('🔄 Обновление статистики админки...');
    statsManager.updateStats();
  });

  // Проверка состояния сервера каждую минуту
  cron.schedule('* * * * *', async () => {
    try {
      await sshClient.updateServerStatus();
    } catch (error) {
      console.error('Ошибка обновления статуса сервера:', error);
    }
  });
};

// Инициализация
const init = () => {
  console.log('🚀 Инициализация модуля админки...');
  initCronJobs();
  console.log('✅ Модуль админки инициализирован');
};

module.exports = {
  router,
  init,
  checkAuth
}; 