/**
 * Маршруты для получения фотографий разных размеров
 */

const express = require('express');
const router = express.Router();
const getPhotosController = require('./get_photos.controller');
const { verifyToken } = require('../../../core/security/jwt.middleware');
const { authLimiter } = require('../../auth/middleware/rate-limiter');
const { standardLimiter } = require('../../auth/middleware/rate-limiter');

/**
 * @route GET /api/images/:photoPath
 * @desc Получение фотографии с указанным типом (размером)
 * @param {string} photoPath - Путь к фотографии (URL-encoded)
 * @query {string} imageType - Тип изображения (profile, gallery, thumbnail, chat)
 * @access Public
 */
router.get('/:photoPath(*)', standardLimiter, getPhotosController.getPhotoByType);

/**
 * @route GET /api/images/thumbnail/:photoPath
 * @desc Получение миниатюры для фотографии
 * @param {string} photoPath - Путь к фотографии (URL-encoded)
 * @access Public
 */
router.get('/thumbnail/:photoPath(*)', standardLimiter, getPhotosController.getThumbnail);

/**
 * @route GET /api/images/info/:photoPath
 * @desc Получение информации о фотографии
 * @param {string} photoPath - Путь к фотографии (URL-encoded)
 * @access Public
 */
router.get('/info/:photoPath(*)', standardLimiter, getPhotosController.getPhotoInfo);

module.exports = router; 