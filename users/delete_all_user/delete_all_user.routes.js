const express = require('express');
const router = express.Router();
const DeleteAllUserController = require('./delete_all_user.controller');

// Эндпоинт для удаления всех данных пользователя
router.delete('/:userId', DeleteAllUserController.deleteUser);

module.exports = router; 