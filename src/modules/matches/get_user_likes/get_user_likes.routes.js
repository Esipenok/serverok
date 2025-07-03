const express = require('express');
const router = express.Router();
const { getUserLikes } = require('./get_user_likes.controller');
const { jwtMiddleware } = require('../../../core');
const { verifyToken } = jwtMiddleware;

// GET /api/matches/likes/:userId - получить список пользователей, которые лайкнули текущего пользователя
router.get('/:userId', verifyToken, getUserLikes);

module.exports = router; 