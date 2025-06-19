const express = require('express');
const router = express.Router();
const { getCountryFromCoordinates } = require('./countryService');
const User = require('../users/models/User');
const MarketCard = require('../marketprofiles/models/MarketCard');

// Получение страны по координатам
router.post('/get-country', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать широту и долготу'
      });
    }
    
    const country = await getCountryFromCoordinates(latitude, longitude);
    
    res.status(200).json({
      status: 'success',
      country
    });
  } catch (error) {
    console.error('Ошибка при получении страны по координатам:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении страны по координатам'
    });
  }
});

// Получение количества карточек по стране для маркета
router.get('/market-cards-count/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    if (!country) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать страну'
      });
    }
    
    // Считаем количество карточек с указанной страной по полю real_loc_country
    const count = await MarketCard.countDocuments({ real_loc_country: country });
    
    console.log(`Количество маркетных карточек для страны ${country}: ${count}`);
    
    res.status(200).json({
      status: 'success',
      count
    });
  } catch (error) {
    console.error('Ошибка при подсчете карточек по стране:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при подсчете карточек по стране'
    });
  }
});

// Обработка GET запроса для получения страны по координатам в query параметрах
router.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      console.error('Invalid query parameters:', { lat, lng });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid coordinates provided. Latitude and longitude must be numbers in query parameters.'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    console.log(`Processing GET request for coordinates: lat=${latitude}, lng=${longitude}`);
    
    const country = await getCountryFromCoordinates(latitude, longitude);
    
    if (!country) {
      console.log('Country not found for coordinates:', { latitude, longitude });
      return res.status(404).json({
        status: 'error',
        message: 'Country not found for provided coordinates'
      });
    }

    console.log('Successfully found country:', country);
    res.json({
      status: 'success',
      country
    });
  } catch (error) {
    console.error('Error in GET country route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting country information'
    });
  }
});

// Новый маршрут для обновления страны для маркета по координатам
router.post('/update-market-country', async (req, res) => {
  try {
    console.log('Received update-market-country request:', req.body);
    const { userId, coordinates } = req.body;
    
    if (!userId || !coordinates || 
        typeof coordinates.latitude !== 'number' || 
        typeof coordinates.longitude !== 'number') {
      console.error('Invalid request data:', { userId, coordinates });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID or coordinates provided.'
      });
    }

    // Получаем страну по координатам
    const country = await getCountryFromCoordinates(coordinates.latitude, coordinates.longitude);
    
    if (!country) {
      console.log('Country not found for market coordinates:', coordinates);
      return res.status(404).json({
        status: 'error',
        message: 'Country not found for provided coordinates'
      });
    }

    // Находим пользователя и обновляем его данные
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Обновляем поле market_location_country
    user.market_location_country = country;
    await user.save();

    console.log(`Successfully updated market_location_country to ${country} for user ${userId}`);
    res.json({
      status: 'success',
      data: {
        userId,
        market_location_country: country
      }
    });
  } catch (error) {
    console.error('Error in update-market-country route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating market country information'
    });
  }
});

// Маршрут для подсчета количества пользователей в маркете по стране
router.get('/market-users-count/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    // Проверяем, не пустая ли строка
    if (!country || country.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать страну'
      });
    }

    console.log(`Получение количества пользователей маркета в стране: ${country}`);

    // Выполняем поиск пользователей по полю market_location_country
    const count = await User.countDocuments({
      market_location_country: country
    });

    console.log(`Найдено ${count} пользователей маркета в стране ${country}`);

    res.json({
      status: 'success',
      count: count
    });
  } catch (error) {
    console.error('Ошибка при получении количества пользователей маркета по стране:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 