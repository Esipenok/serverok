const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const app = express();
app.use(express.json());

// Проверка существования пользователя по email (старый маршрут)
app.get('/api/users/check', async (req, res) => {
  try {
    const { email } = req.query;
    console.log('Проверка пользователя с email (старый маршрут):', email);
    console.log('Параметры запроса:', JSON.stringify(req.query, null, 2));
    
    if (!email) {
      console.log('Email не предоставлен');
      return res.status(400).json({
        status: 'fail',
        message: 'Email обязателен'
      });
    }

    // Нормализация email
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Нормализованный email:', normalizedEmail);

    // Поиск пользователя
    const user = await User.findOne({ email: normalizedEmail });
    console.log('Найденный пользователь:', user ? {
      userId: user.userId,
      email: user.email,
      isProfileCompleted: user.isProfileCompleted
    } : null);
    
    if (!user) {
      console.log('Пользователь не найден в базе данных');
      return res.status(404).json({
        status: 'fail',
        message: 'Пользователь не найден'
      });
    }

    // Проверка заполненности профиля
    const isProfileCompleted = Boolean(
      user.name && 
      user.birthday && 
      user.photos && 
      user.photos.length > 0
    );

    // Обновляем статус заполненности профиля, если он изменился
    if (user.isProfileCompleted !== isProfileCompleted) {
      user.isProfileCompleted = isProfileCompleted;
      await user.save();
      console.log('Обновлен статус заполненности профиля:', isProfileCompleted);
    }

    // Возвращаем данные пользователя
    const response = {
      status: 'success',
      data: {
        userId: user.userId,
        email: user.email,
        isProfileCompleted: isProfileCompleted,
        profileData: {
          name: user.name,
          birthday: user.birthday,
          photos: user.photos || []
        }
      }
    };
    
    console.log('Отправляем ответ:', JSON.stringify(response, null, 2));
    res.status(200).json(response);

  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error);
    console.error('Стек ошибки:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при проверке пользователя',
      error: error.message
    });
  }
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating_app')
  .then(() => {
    console.log('MongoDB подключен');
    app.listen(3001, () => {
      console.log('Сервер запущен на порту 3001');
    });
  })
  .catch(err => {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  }); 