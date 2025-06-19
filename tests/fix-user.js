const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const { Counter } = require('./models/Counter');

async function fixUser() {
  try {
    // Подключаемся к базе данных
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating_app');
    console.log('Connected to MongoDB');

    // Находим пользователя
    const user = await User.findOne({ email: 'esipenokand@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Current user data:', user);

    // Проверяем и исправляем userId
    if (!user.userId || typeof user.userId !== 'number' || isNaN(user.userId)) {
      console.log('Fixing userId...');
      
      // Получаем текущее значение счетчика
      const counter = await Counter.findOne({ _id: 'userId' });
      const newUserId = counter ? counter.seq + 1 : 1;
      
      // Обновляем счетчик
      await Counter.findOneAndUpdate(
        { _id: 'userId' },
        { $set: { seq: newUserId } },
        { upsert: true }
      );
      
      // Обновляем userId пользователя
      user.userId = newUserId;
      await user.save();
      
      console.log('Fixed userId:', newUserId);
    } else {
      console.log('UserId is already correct:', user.userId);
    }

    // Проверяем результат
    const updatedUser = await User.findOne({ email: 'esipenokand@gmail.com' });
    console.log('Updated user data:', updatedUser);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixUser(); 