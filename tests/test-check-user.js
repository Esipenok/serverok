const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating_app')
  .then(() => {
    console.log('MongoDB подключен');
    checkUser();
  })
  .catch(err => {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  });

async function checkUser() {
  try {
    const email = 'esipenokand@gmail.com';
    console.log('Проверка пользователя с email:', email);

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
      return;
    }

    // Проверка заполненности профиля
    const isProfileCompleted = Boolean(
      user.name && 
      user.birthday && 
      user.photos && 
      user.photos.length > 0
    );

    console.log('Статус заполненности профиля:', isProfileCompleted);
    console.log('Данные пользователя:', {
      userId: user.userId,
      email: user.email,
      isProfileCompleted: user.isProfileCompleted,
      profileData: {
        name: user.name,
        birthday: user.birthday,
        photos: user.photos || []
      }
    });

  } catch (error) {
    console.error('Ошибка при проверке пользователя:', error);
    console.error('Стек ошибки:', error.stack);
  } finally {
    mongoose.connection.close();
  }
} 