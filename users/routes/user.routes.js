const express = require('express');
const router = express.Router();
const User = require('../../auth/models/User');
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../../auth/middleware/auth.middleware');
const { verifyToken: authVerifyToken } = require('../../auth/middleware/auth');
const photosRoutes = require('../photos/photos.routes');
const { upload } = require('../photos/photos.middleware');
const fetch = require('node-fetch');
const blockUnblockRoutes = require('../block_unblock_users');
const deleteAllUserRoutes = require('../delete_all_user/delete_all_user.routes');

// Используем маршруты для фотографий
router.use('/', photosRoutes);

// Маршруты блокировки/разблокировки
router.use('/block', blockUnblockRoutes);

// Маршруты удаления всех данных пользователя
router.use('/delete', deleteAllUserRoutes);

// Эндпоинт для сохранения отсканированного пользователя в поле qr
router.post('/save-qr-scan', async (req, res) => {
    try {
        const { userId, scannedUserId } = req.body;

        if (!userId || !scannedUserId) {
            return res.status(400).json({
                success: false,
                message: 'userId и scannedUserId обязательны'
            });
        }

        // Находим пользователя
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // Проверяем, что отсканированный пользователь существует
        const scannedUser = await User.findOne({ userId: scannedUserId });
        if (!scannedUser) {
            return res.status(404).json({
                success: false,
                message: 'Отсканированный пользователь не найден'
            });
        }

        // Добавляем отсканированного пользователя в поле qr, если его там еще нет
        if (!user.qr.includes(scannedUserId)) {
            user.qr.push(scannedUserId);
            await user.save();
        }

        res.json({
            success: true,
            message: 'Пользователь успешно добавлен в QR список',
            data: {
                userId: user.userId,
                qrCount: user.qr.length
            }
        });
    } catch (error) {
        console.error('Ошибка при сохранении отсканированного пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            error: error.message
        });
    }
});

// Обновление профиля пользователя
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;

        // Проверяем существование пользователя
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Сохраняем флаги для асинхронного определения стран
        let needRealLocCountry = false;
        let needChangeLocCountry = false;
        let needMarketLocCountry = false;
        
        if (updateData.real_loc && 
            typeof updateData.real_loc.latitude === 'number' && 
            typeof updateData.real_loc.longitude === 'number') {
            needRealLocCountry = true;
        }
        
        if (updateData.change_loc && 
            typeof updateData.change_loc.latitude === 'number' && 
            typeof updateData.change_loc.longitude === 'number') {
            needChangeLocCountry = true;
        }

        if (updateData.market_location && 
            typeof updateData.market_location.latitude === 'number' && 
            typeof updateData.market_location.longitude === 'number') {
            needMarketLocCountry = true;
        }

        // Обновляем только разрешенные поля
        const allowedFields = [
            'name',
            'birthday',
            'gender',
            'lookingFor',
            'about',
            'searchDistance',
            'ageMin',
            'ageMax',
            'real_loc',
            'change_loc',
            'market_location',
            'market_location_country',
            'market_searchDistance',
            'market_lookingFor',
            'market_ageMin',
            'market_ageMax',
            'isProfileCompleted',
            'photos',
            'market_card_exclude',
            'firebaseUid'
        ];

        // Обновляем только разрешенные поля
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                user[field] = updateData[field];
            }
        }

        // Сохраняем изменения
        await user.save();
        
        console.log('Обновленные данные пользователя:', {
            userId: user.userId,
            searchDistance: user.searchDistance,
            lookingFor: user.lookingFor,
            ageMin: user.ageMin,
            ageMax: user.ageMax,
            market_searchDistance: user.market_searchDistance,
            market_lookingFor: user.market_lookingFor,
            market_ageMin: user.market_ageMin,
            market_ageMax: user.market_ageMax
        });
        
        // Отправляем ответ клиенту без ожидания определения стран
        res.json({
            status: 'success',
            data: user,
            countryStatus: {
                realLocCountryPending: needRealLocCountry,
                changeLocCountryPending: needChangeLocCountry,
                marketLocCountryPending: needMarketLocCountry
            }
        });
        
        // Асинхронно определяем страны после отправки ответа
        if (needRealLocCountry) {
            determineCountryAsync(user.userId, 'real_loc', user.real_loc.latitude, user.real_loc.longitude);
        }
        
        if (needChangeLocCountry) {
            determineCountryAsync(user.userId, 'change_loc', user.change_loc.latitude, user.change_loc.longitude);
        }

        if (needMarketLocCountry) {
            determineCountryAsync(user.userId, 'market_location', user.market_location.latitude, user.market_location.longitude);
        }
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Функция для определения страны по координатам
async function getCountryFromCoordinates(latitude, longitude) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        return data.address.country;
    } catch (error) {
        console.error('Ошибка при определении страны:', error);
        return null;
    }
}

// Функция для асинхронного определения страны
// Отслеживание запущенных процессов определения страны
const pendingCountryRequests = new Map();

async function determineCountryAsync(userId, locType, latitude, longitude) {
    try {
        // Создаем уникальный ключ для запроса
        const requestKey = `${userId}-${locType}`;
        
        // Проверяем, не выполняется ли уже запрос для этого пользователя и типа локации
        if (pendingCountryRequests.has(requestKey)) {
            console.log(`Уже выполняется запрос определения страны для ${userId}, тип: ${locType}`);
            return;
        }
        
        // Отмечаем, что запрос выполняется
        pendingCountryRequests.set(requestKey, true);
        
        console.log(`Асинхронное определение страны для ${userId}, тип: ${locType}`);
        
        // Сначала проверяем, возможно страна уже была определена для другого типа локации
        const user = await User.findOne({ userId });
        if (!user) {
            console.error(`Пользователь ${userId} не найден при определении страны`);
            pendingCountryRequests.delete(requestKey);
            return;
        }
        
        // Если координаты совпадают для real_loc и change_loc, и одна из стран уже определена,
        // используем имеющееся значение
        if (user.real_loc && user.change_loc && 
            Math.abs(user.real_loc.latitude - user.change_loc.latitude) < 0.0001 &&
            Math.abs(user.real_loc.longitude - user.change_loc.longitude) < 0.0001) {
            
            if (locType === 'real_loc' && user.change_loc_country) {
                user.real_loc_country = user.change_loc_country;
                console.log(`Используем существующую страну для real_loc: ${user.change_loc_country}`);
                await user.save();
                console.log(`Данные страны обновлены для ${userId}`);
                pendingCountryRequests.delete(requestKey);
                return;
            } else if (locType === 'change_loc' && user.real_loc_country) {
                user.change_loc_country = user.real_loc_country;
                console.log(`Используем существующую страну для change_loc: ${user.real_loc_country}`);
                await user.save();
                console.log(`Данные страны обновлены для ${userId}`);
                pendingCountryRequests.delete(requestKey);
                return;
            }
        }
        
        // Если нет существующего значения, определяем страну
        const country = await getCountryFromCoordinates(latitude, longitude);
        
        if (country) {
            // Получаем актуальные данные пользователя
            const updatedUser = await User.findOne({ userId });
            if (!updatedUser) {
                console.error(`Пользователь ${userId} не найден при обновлении страны`);
                pendingCountryRequests.delete(requestKey);
                return;
            }
            
            if (locType === 'real_loc') {
                updatedUser.real_loc_country = country;
                updatedUser.market_location_country = country;
                console.log(`Страна для real_loc определена: ${country}`);
                console.log(`Страна для market_location_country установлена: ${country}`);
            } else if (locType === 'change_loc') {
                updatedUser.change_loc_country = country;
                console.log(`Страна для change_loc определена: ${country}`);
            } else if (locType === 'market_location') {
                updatedUser.market_location_country = country;
                console.log(`Страна для market_location определена: ${country}`);
            }
            
            await updatedUser.save();
            console.log(`Данные страны обновлены для ${userId}`);
            
            // Если координаты для real_loc и change_loc совпадают, 
            // устанавливаем значение страны для обоих типов
            if (updatedUser.real_loc && updatedUser.change_loc && 
                Math.abs(updatedUser.real_loc.latitude - updatedUser.change_loc.latitude) < 0.0001 &&
                Math.abs(updatedUser.real_loc.longitude - updatedUser.change_loc.longitude) < 0.0001) {
                
                if (locType === 'real_loc' && !updatedUser.change_loc_country) {
                    updatedUser.change_loc_country = country;
                    await updatedUser.save();
                    console.log(`Автоматически установлена страна для change_loc: ${country}`);
                } else if (locType === 'change_loc' && !updatedUser.real_loc_country) {
                    updatedUser.real_loc_country = country;
                    await updatedUser.save();
                    console.log(`Автоматически установлена страна для real_loc: ${country}`);
                }
            }
        } else {
            console.log(`Не удалось определить страну для ${userId}, тип: ${locType}`);
        }
        
        // Удаляем запрос из отслеживаемых
        pendingCountryRequests.delete(requestKey);
    } catch (error) {
        console.error(`Ошибка при асинхронном определении страны для ${userId}:`, error);
        // Обязательно удаляем запрос из отслеживаемых даже при ошибке
        pendingCountryRequests.delete(`${userId}-${locType}`);
    }
}

// Получение статуса определения страны
router.get('/:userId/country-status', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        res.json({
            status: 'success',
            data: {
                real_loc_country: user.real_loc_country || null,
                change_loc_country: user.change_loc_country || null,
                real_loc_pending: user.real_loc && !user.real_loc_country,
                change_loc_pending: user.change_loc && !user.change_loc_country
            }
        });
    } catch (error) {
        console.error('Ошибка при получении статуса стран:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Получение пользователя по ID
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Получение всех пользователей
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.json({
            status: 'success',
            data: users
        });
    } catch (error) {
        console.error('Ошибка при получении пользователей:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Обновление статуса fast_match_active
router.put('/:userId/fast-match-status', authVerifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { fast_match_active } = req.body;

        if (typeof fast_match_active !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'fast_match_active должен быть булевым значением'
            });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        user.fast_match_active = fast_match_active;
        await user.save();

        console.log(`Статус fast_match_active обновлен для пользователя ${userId}: ${fast_match_active}`);

        res.json({
            status: 'success',
            data: {
                userId,
                fast_match_active
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении статуса fast_match_active:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Обновление местоположения пользователя
router.put('/:userId/location', async (req, res) => {
    try {
        const { userId } = req.params;
        const { real_loc, change_loc, forceUpdate } = req.body;
        
        // Проверяем существование пользователя
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        const updateData = {};
        let needRealLocCountry = false;
        let needChangeLocCountry = false;

        // Обрабатываем real_loc
        if (real_loc && typeof real_loc.latitude === 'number' && typeof real_loc.longitude === 'number') {
            updateData.real_loc = real_loc;
            needRealLocCountry = true;
        }

        // Обрабатываем change_loc
        if (change_loc && typeof change_loc.latitude === 'number' && typeof change_loc.longitude === 'number') {
            updateData.change_loc = change_loc;
            
            // Проверяем, если местоположение изменилось или требуется принудительное обновление
            const isLocationChanged = !user.change_loc || 
                user.change_loc.latitude !== change_loc.latitude || 
                user.change_loc.longitude !== change_loc.longitude;
                
            if (isLocationChanged || forceUpdate === true) {
                needChangeLocCountry = true;
                // Если forceUpdate = true, сбрасываем значение страны, чтобы запустить повторное определение
                if (forceUpdate === true) {
                    console.log('Принудительное обновление страны для change_loc запрошено');
                    updateData.change_loc_country = null;
                }
            }
        }

        // Обновляем данные пользователя
        Object.assign(user, updateData);
        await user.save();

        // Отправляем ответ без ожидания определения стран
        res.json({
            status: 'success',
            data: user,
            countryStatus: {
                realLocCountryPending: needRealLocCountry,
                changeLocCountryPending: needChangeLocCountry
            }
        });
        
        // Асинхронно определяем страны
        if (needRealLocCountry) {
            determineCountryAsync(user.userId, 'real_loc', user.real_loc.latitude, user.real_loc.longitude);
        }
        
        if (needChangeLocCountry) {
            determineCountryAsync(user.userId, 'change_loc', user.change_loc.latitude, user.change_loc.longitude);
        }
    } catch (error) {
        console.error('Ошибка при обновлении местоположения:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Получение количества пользователей по стране
router.get('/count-by-country/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    // Проверяем, не пустая ли строка
    if (!country || country.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать страну'
      });
    }

    // Выполняем поиск пользователей по стране (проверяем оба поля)
    const count = await User.countDocuments({
      $or: [
        { change_loc_country: country },
        { real_loc_country: country }
      ]
    });

    console.log(`Найдено ${count} пользователей в стране ${country}`);

    res.json({
      status: 'success',
      count: count
    });
  } catch (error) {
    console.error('Ошибка при получении количества пользователей по стране:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Добавляем аудиосообщение в список exclude_audio
router.post('/add-exclude-audio', async (req, res) => {
  try {
    const { userId, audioId } = req.body;
    
    if (!userId || !audioId) {
      return res.status(400).json({
        status: 'error',
        message: 'Отсутствуют обязательные параметры: userId, audioId'
      });
    }
    
    // Преобразуем audioId в число, если передана строка
    const audioIdNumber = typeof audioId === 'string' ? parseInt(audioId, 10) : audioId;
    
    if (isNaN(audioIdNumber)) {
      return res.status(400).json({
        status: 'error',
        message: 'audioId должен быть числом'
      });
    }
    
    console.log(`Добавление аудиосообщения ${audioIdNumber} в список исключенных для пользователя ${userId}`);
    
    // Находим пользователя
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }
    
    // Инициализируем массив exclude_audio, если он отсутствует
    if (!user.exclude_audio) {
      user.exclude_audio = [];
    }
    
    // Проверяем, есть ли уже такой ID в списке
    if (!user.exclude_audio.includes(audioIdNumber)) {
      user.exclude_audio.push(audioIdNumber);
      await user.save();
      console.log(`Аудиосообщение ${audioIdNumber} добавлено в список exclude_audio для пользователя ${userId}`);
    } else {
      console.log(`Аудиосообщение ${audioIdNumber} уже есть в списке exclude_audio для пользователя ${userId}`);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Аудиосообщение добавлено в список исключенных',
      exclude_audio: user.exclude_audio
    });
  } catch (error) {
    console.error('Ошибка при добавлении аудиосообщения в список исключенных:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера при добавлении аудиосообщения в список исключенных'
    });
  }
});

// Получение списка исключенных аудиосообщений
router.get('/get-exclude-audio', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'Отсутствует обязательный параметр: userId'
      });
    }
    
    // Находим пользователя
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }
    
    // Возвращаем список исключенных аудиосообщений
    res.status(200).json({
      status: 'success',
      exclude_audio: user.exclude_audio || []
    });
  } catch (error) {
    console.error('Ошибка при получении списка исключенных аудиосообщений:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера при получении списка исключенных аудиосообщений'
    });
  }
});

module.exports = router; 