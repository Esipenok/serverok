const express = require('express');
const router = express.Router();
const DeleteAllUserController = require('./delete_all_user.controller');

// Middleware для логирования всех запросов к этому роуту
router.use((req, res, next) => {
  console.log('[DeleteAllUserRoutes] Запрос получен:', {
    method: req.method,
    url: req.url,
    params: req.params,
    headers: req.headers
  });
  next();
});

// Эндпоинт для удаления всех данных пользователя
router.delete('/:userId', DeleteAllUserController.deleteUser);

module.exports = router; 