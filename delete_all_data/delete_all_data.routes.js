const express = require('express');
const router = express.Router();
const DeleteAllDataController = require('./delete_all_data.controller');

// Middleware для логирования всех запросов к этому роуту
router.use((req, res, next) => {
  console.log('[DeleteAllDataRoutes] Запрос получен:', {
    method: req.method,
    url: req.url,
    params: req.params,
    headers: req.headers
  });
  next();
});

// Эндпоинт для удаления всех данных пользователя
router.delete('/:userId', DeleteAllDataController.deleteUser);

module.exports = router; 