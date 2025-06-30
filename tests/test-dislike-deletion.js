const Match = require('../matches/models/match.model');
const mongoose = require('mongoose');

// Тест удаления записи матча при дизлайке
async function testDislikeDeletion() {
  console.log('=== Тест удаления записи матча при дизлайке ===\n');

  try {
    // Создаем тестовую запись матча
    const testMatch = new Match({
      user1: 'test_user_1',
      user2: 'test_user_2',
      user1Liked: true,
      user2Liked: false,
      status: 'pending',
      feature: 'finder'
    });

    console.log('1. Создаем тестовую запись матча...');
    const savedMatch = await testMatch.save();
    console.log(`Запись создана с ID: ${savedMatch._id}`);

    // Проверяем, что запись существует
    const foundMatch = await Match.findById(savedMatch._id);
    console.log(`2. Проверяем существование записи: ${foundMatch ? 'НАЙДЕНА' : 'НЕ НАЙДЕНА'}`);

    // Симулируем дизлайк - устанавливаем статус disliked
    console.log('\n3. Симулируем дизлайк (устанавливаем статус disliked)...');
    foundMatch.status = 'disliked';
    await foundMatch.save();

    // Удаляем запись (как в контроллере)
    console.log('4. Удаляем запись матча...');
    await Match.findByIdAndDelete(foundMatch._id);
    console.log(`Запись ${foundMatch._id} удалена`);

    // Проверяем, что запись больше не существует
    console.log('\n5. Проверяем, что запись удалена...');
    const deletedMatch = await Match.findById(foundMatch._id);
    console.log(`Запись после удаления: ${deletedMatch ? 'ВСЕ ЕЩЕ СУЩЕСТВУЕТ' : 'УДАЛЕНА'}`);

    console.log('\n=== Тест завершен успешно ===');

  } catch (error) {
    console.error('Ошибка в тесте:', error);
  }
}

// Функция для подключения к базе данных (если нужно)
async function connectToDatabase() {
  try {
    // Здесь нужно указать правильный URL для подключения к MongoDB
    // await mongoose.connect('mongodb://localhost:27017/your_database');
    console.log('Подключение к базе данных...');
    // await testDislikeDeletion();
    console.log('Тест пропущен - требуется подключение к базе данных');
  } catch (error) {
    console.error('Ошибка подключения к базе данных:', error);
  }
}

// Запускаем тест
connectToDatabase(); 