const express = require('express');
const router = express.Router();
const PhotosController = require('./photos.controller');
const { upload } = require('./photos.middleware');
const multer = require('multer');

// Middleware для обработки ошибок multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'Размер файла превышает 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Превышено максимальное количество файлов (10)'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  next();
};

// Загрузка фотографий
router.post('/:userId/photos', 
  upload.array('photos', 10),
  handleMulterError,
  PhotosController.uploadPhotos
);

// Удаление всех фотографий
router.delete('/:userId/photos', PhotosController.deleteAllPhotos);

// Обновление списка фотографий
router.put('/:userId/photos', PhotosController.updatePhotos);

// Обновление профиля с фотографиями
router.put('/:userId/profile-with-photos',
  upload.array('photos', 10),
  handleMulterError,
  PhotosController.updateProfileWithPhotos
);

// Создание миниатюры для фотографии профиля
router.post('/:userId/thumbnail', PhotosController.createProfileThumbnail);

module.exports = router; 