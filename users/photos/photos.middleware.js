const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger.config');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.params.userId;
    const userUploadPath = `uploads/users/${userId}`;
    
    // Создаем директорию для пользователя, если она не существует
    if (!fs.existsSync(userUploadPath)) {
      fs.mkdirSync(userUploadPath, { recursive: true });
    }
    
    // Создаем директорию для временных файлов
    const tempUploadPath = `uploads/temp`;
    if (!fs.existsSync(tempUploadPath)) {
      fs.mkdirSync(tempUploadPath, { recursive: true });
    }
    
    cb(null, userUploadPath);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Допустимые MIME типы
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/heic',
    'image/heif'
  ];
  
  // Допустимые расширения файлов
  const allowedExtensions = [
    '.jpg', 
    '.jpeg', 
    '.png', 
    '.gif', 
    '.webp',
    '.heic',
    '.heif'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Проверяем MIME тип и расширение файла
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    logger.info(`Принят файл ${file.originalname} с типом ${file.mimetype}`);
    cb(null, true);
  } else {
    logger.warn(`Отклонен файл ${file.originalname} с типом ${file.mimetype}`);
    cb(new Error(`Недопустимый тип файла. Разрешены только: ${allowedExtensions.join(', ')}`), false);
  }
};

// Настройки загрузки
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // максимум 10 файлов
  }
});

module.exports = {
  upload
}; 