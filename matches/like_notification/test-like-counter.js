const { likeCounterService } = require('./index');

// Тестовые данные
const testUserId = 'test_user_123';

async function testLikeCounter() {
  console.log('🧪 Начинаем тестирование системы счетчиков лайков (Firebase)...\n');

  try {
    // Тест 1: Получение счетчика для нового пользователя
    console.log('📊 Тест 1: Получение счетчика для нового пользователя');
    let count = await likeCounterService.getLikeCount(testUserId);
    console.log(`Результат: ${count} лайков\n`);

    // Тест 2: Увеличение счетчика (первый лайк)
    console.log('👍 Тест 2: Увеличение счетчика (первый лайк)');
    await likeCounterService.incrementLikeCounter(testUserId);
    count = await likeCounterService.getLikeCount(testUserId);
    console.log(`Результат: ${count} лайков\n`);

    // Тест 3: Увеличение счетчика (второй лайк)
    console.log('👍 Тест 3: Увеличение счетчика (второй лайк)');
    await likeCounterService.incrementLikeCounter(testUserId);
    count = await likeCounterService.getLikeCount(testUserId);
    console.log(`Результат: ${count} лайков\n`);

    // Тест 4: Увеличение счетчика (третий лайк)
    console.log('👍 Тест 4: Увеличение счетчика (третий лайк)');
    await likeCounterService.incrementLikeCounter(testUserId);
    count = await likeCounterService.getLikeCount(testUserId);
    console.log(`Результат: ${count} лайков\n`);

    // Тест 5: Сброс счетчика
    console.log('🔄 Тест 5: Сброс счетчика');
    await likeCounterService.resetLikeCounter(testUserId);
    count = await likeCounterService.getLikeCount(testUserId);
    console.log(`Результат: ${count} лайков\n`);

    // Тест 6: Удаление счетчика
    console.log('🗑️ Тест 6: Удаление счетчика');
    await likeCounterService.deleteLikeCounter(testUserId);
    count = await likeCounterService.getLikeCount(testUserId);
    console.log(`Результат: ${count} лайков\n`);

    console.log('✅ Все тесты завершены успешно!');
    console.log('📱 Проверьте Firebase Console для просмотра данных:');
    console.log('   - /like_counters/{userId} - счетчики лайков');
    console.log('   - /notifications/{userId} - уведомления');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запуск тестов
if (require.main === module) {
  testLikeCounter();
}

module.exports = { testLikeCounter }; 