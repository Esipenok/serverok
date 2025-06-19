const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const MarketCard = require('../models/MarketCard');
const { getNextMarketCardId } = require('../models/MarketCounter');
const User = require('../../auth/models/User');
const marketInitChatRoutes = require('../market_init_chat/market_init_chat.routes');
const getAllMarketDataRoutes = require('../get_all_market_data/get_all_market_data.routes');
const MarketPhotosService = require('../../users/photos/MarketPhotosService');

// Подключаем маршруты инициализации чата
router.use('/', marketInitChatRoutes);

// Подключаем маршруты получения данных
router.use('/', getAllMarketDataRoutes);

// Настройка multer для временного хранения фотографий
const marketStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Используем временную директорию для загрузки
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
    
    console.log('Путь для временного сохранения фотографий:', uploadDir);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      console.log('Директория создана:', uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      console.error('Ошибка при создании директории:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('Имя файла для временного сохранения:', filename);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  console.log('Проверка файла:', {
    originalname: file.originalname,
    mimetype: file.mimetype
  });
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.mimetype)) {
    console.error('Неподдерживаемый тип файла:', file.mimetype);
    return cb(new Error('Разрешены только изображения формата jpg, jpeg, png'));
  }
  cb(null, true);
};

const uploadMarketPhoto = multer({
  storage: marketStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Получить все маркетные карточки
router.get('/', async (req, res) => {
  try {
    const marketCards = await MarketCard.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      data: marketCards
    });
  } catch (error) {
    console.error('Ошибка при получении маркетных карточек:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении маркетных карточек'
    });
  }
});

// Получить маркетную карточку по ID
router.get('/:marketCardId', async (req, res) => {
  try {
    const marketCard = await MarketCard.findOne({ marketCardId: req.params.marketCardId });
    if (!marketCard) {
      return res.status(404).json({
        status: 'error',
        message: 'Маркетная карточка не найдена'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: marketCard
    });
  } catch (error) {
    console.error('Ошибка при получении маркетной карточки:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении маркетной карточки'
    });
  }
});

// Создать новую маркетную карточку
router.post('/', async (req, res) => {
  try {
    const { fullName, gender, birthday, preference, about, userId, real_loc, real_loc_country } = req.body;
    
    // Проверяем обязательные поля
    if (!fullName || !gender || !birthday || !preference) {
      return res.status(400).json({
        status: 'error',
        message: 'Заполните все обязательные поля'
      });
    }
    
    // Генерируем уникальный marketCardId
    const marketCardId = await getNextMarketCardId();
    
    // Если передан userId, получаем данные пользователя для использования его real_loc и real_loc_country
    let userCountry = '';
    let userLocation = {};
    
    if (userId) {
      const user = await User.findOne({ userId });
      
      if (user) {
        // Используем real_loc_country пользователя
        if (user.real_loc_country) {
          userCountry = user.real_loc_country;
        }
        
        // Используем real_loc координаты
        if (user.real_loc && user.real_loc.latitude && user.real_loc.longitude) {
          userLocation = user.real_loc;
        }
      }
    }
    
    // Создаем новую маркетную карточку
    const newMarketCard = new MarketCard({
      marketCardId,
      fullName,
      gender,
      birthday: new Date(birthday),
      preference,
      about: about || '',
      userId: userId || null,
      // Используем координаты из запроса или из данных пользователя
      real_loc: real_loc || userLocation || {},
      // Используем страну из запроса или из данных пользователя
      real_loc_country: real_loc_country || userCountry || ''
    });
    
    await newMarketCard.save();
    
    // Если указан userId, добавляем карточку в список карточек пользователя
    if (userId) {
      const user = await User.findOne({ userId });
      
      if (user) {
        // Добавляем ID карточки в массив market_cards, если его еще там нет
        if (!user.market_cards.includes(marketCardId)) {
          user.market_cards.push(marketCardId);
          await user.save();
          console.log(`Карточка ${marketCardId} добавлена пользователю ${userId}`);
        }
      }
    }
    
    res.status(201).json({
      status: 'success',
      data: newMarketCard
    });
  } catch (error) {
    console.error('Ошибка при создании маркетной карточки:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при создании маркетной карточки'
    });
  }
});

// Загрузить фотографию для маркетной карточки
router.post('/:marketCardId/photos', uploadMarketPhoto.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Фотография не загружена'
      });
    }
    
    const marketCardId = req.params.marketCardId;
    const marketCard = await MarketCard.findOne({ marketCardId });
    
    if (!marketCard) {
      // Удаляем загруженный файл, если карточка не найдена
      await fs.unlink(req.file.path);
      return res.status(404).json({
        status: 'error',
        message: 'Маркетная карточка не найдена'
      });
    }
    
    // Максимально допустимое количество фотографий
    const maxPhotos = 5;
    if (marketCard.photos.length >= maxPhotos) {
      // Удаляем загруженный файл, если достигнут лимит
      await fs.unlink(req.file.path);
      return res.status(400).json({
        status: 'error',
        message: `Достигнуто максимальное количество фотографий (${maxPhotos})`
      });
    }
    
    // Используем MarketPhotosService для обработки и сохранения фотографии
    const updatedPhotos = await MarketPhotosService.savePhotos(marketCardId, [req.file]);
    
    res.status(200).json({
      status: 'success',
      data: {
        ...marketCard.toObject(),
        photos: updatedPhotos
      }
    });
  } catch (error) {
    console.error('Ошибка при загрузке фотографии:', error);
    // Удаляем загруженный файл в случае ошибки
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Ошибка при удалении файла:', unlinkError);
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при загрузке фотографии'
    });
  }
});

// Обновить маркетную карточку
router.put('/:marketCardId', async (req, res) => {
  try {
    const { fullName, gender, birthday, preference, about } = req.body;
    const marketCardId = req.params.marketCardId;
    
    const marketCard = await MarketCard.findOne({ marketCardId });
    if (!marketCard) {
      return res.status(404).json({
        status: 'error',
        message: 'Маркетная карточка не найдена'
      });
    }
    
    // Обновляем поля
    if (fullName) marketCard.fullName = fullName;
    if (gender) marketCard.gender = gender;
    if (birthday) marketCard.birthday = new Date(birthday);
    if (preference) marketCard.preference = preference;
    if (about !== undefined) marketCard.about = about;
    
    // Поля real_loc и real_loc_country не обновляем при обычном обновлении карточки,
    // чтобы сохранить оригинальное местоположение карточки
    
    await marketCard.save();
    
    res.status(200).json({
      status: 'success',
      data: marketCard
    });
  } catch (error) {
    console.error('Ошибка при обновлении маркетной карточки:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении маркетной карточки'
    });
  }
});

// Удалить маркетную карточку
router.delete('/:marketCardId', async (req, res) => {
  try {
    const marketCardId = req.params.marketCardId;
    const marketCard = await MarketCard.findOne({ marketCardId });
    
    if (!marketCard) {
      return res.status(404).json({
        status: 'error',
        message: 'Маркетная карточка не найдена'
      });
    }
    
    // Удаляем фотографии карточки
    if (marketCard.photos.length > 0) {
      const uploadDir = `uploads/market/${marketCardId}`;
      try {
        await fs.rm(uploadDir, { recursive: true });
      } catch (unlinkError) {
        console.error('Ошибка при удалении директории с фотографиями:', unlinkError);
      }
    }
    
    // Если у карточки был привязан пользователь, удаляем ID карточки из его списка
    if (marketCard.userId) {
      const user = await User.findOne({ userId: marketCard.userId });
      
      if (user && user.market_cards) {
        // Удаляем ID карточки из массива market_cards пользователя
        user.market_cards = user.market_cards.filter(id => id !== marketCardId);
        await user.save();
        console.log(`Карточка ${marketCardId} удалена из списка пользователя ${marketCard.userId}`);
      }
    }
    
    // Удаляем карточку из БД
    await MarketCard.deleteOne({ marketCardId });
    
    res.status(200).json({
      status: 'success',
      message: 'Маркетная карточка успешно удалена'
    });
  } catch (error) {
    console.error('Ошибка при удалении маркетной карточки:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении маркетной карточки'
    });
  }
});

// Удалить фотографию маркетной карточки
router.delete('/:marketCardId/photos', async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const marketCardId = req.params.marketCardId;
    
    if (!photoUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'URL фотографии не указан'
      });
    }
    
    const marketCard = await MarketCard.findOne({ marketCardId });
    if (!marketCard) {
      return res.status(404).json({
        status: 'error',
        message: 'Маркетная карточка не найдена'
      });
    }
    
    // Используем MarketPhotosService для обновления списка фотографий
    const updatedPhotos = await MarketPhotosService.updatePhotos(marketCardId, 
      marketCard.photos.filter(photo => photo !== photoUrl)
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        ...marketCard.toObject(),
        photos: updatedPhotos
      }
    });
  } catch (error) {
    console.error('Ошибка при удалении фотографии:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении фотографии'
    });
  }
});

// Обновить фотографии маркетной карточки
router.put('/:marketCardId/photos', uploadMarketPhoto.array('photos', 5), async (req, res) => {
  try {
    console.log('Получен запрос на обновление фотографий');
    console.log('ID карточки:', req.params.marketCardId);
    console.log('Количество файлов:', req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Фотографии не загружены'
      });
    }
    
    const marketCardId = req.params.marketCardId;
    const marketCard = await MarketCard.findOne({ marketCardId });
    
    if (!marketCard) {
      // Удаляем загруженные файлы, если карточка не найдена
      for (const file of req.files) {
        await fs.unlink(file.path);
      }
      
      return res.status(404).json({
        status: 'error',
        message: 'Маркетная карточка не найдена'
      });
    }
    
    // Максимально допустимое количество фотографий
    const maxPhotos = 5;
    if (marketCard.photos.length + req.files.length > maxPhotos) {
      // Удаляем загруженные файлы, если будет превышен лимит
      for (const file of req.files) {
        await fs.unlink(file.path);
      }
      
      return res.status(400).json({
        status: 'error',
        message: `Превышено максимальное количество фотографий (${maxPhotos})`
      });
    }
    
    // Используем MarketPhotosService для обработки и сохранения фотографий
    const updatedPhotos = await MarketPhotosService.savePhotos(marketCardId, req.files);
    
    res.status(200).json({
      status: 'success',
      data: {
        ...marketCard.toObject(),
        photos: updatedPhotos
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении фотографий:', error);
    
    // Удаляем загруженные файлы в случае ошибки
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Ошибка при удалении файла:', unlinkError);
        }
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении фотографий'
    });
  }
});

// Получить количество карточек по стране
router.get('/count-by-country/:country', async (req, res) => {
  try {
    const country = req.params.country;
    const count = await MarketCard.countDocuments({ real_loc_country: country });
    
    res.status(200).json({
      status: 'success',
      data: {
        country: country,
        count: count
      }
    });
  } catch (error) {
    console.error('Ошибка при подсчете карточек по стране:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при подсчете карточек по стране'
    });
  }
});

module.exports = router; 