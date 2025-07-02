const kafkaService = require('../notifications/kafka.service');
const logger = require('../config/logger.config');

async function testKafkaIntegration() {
  console.log('🧪 Тестирование интеграции Kafka...\n');

  try {
    // Подключаемся к Kafka
    console.log('1. Подключение к Kafka...');
    await kafkaService.connect();
    console.log('✅ Kafka подключен\n');

    // Тест 1: Отправка уведомления о лайке
    console.log('2. Тест отправки уведомления о лайке...');
    const likeResult = await kafkaService.sendLikeNotification('user123', {
      name: 'Анна',
      age: 25,
      photoUrl: 'https://example.com/photo.jpg'
    });
    console.log(likeResult ? '✅ Уведомление о лайке отправлено' : '❌ Ошибка отправки\n');

    // Тест 2: Отправка уведомления о мэтче
    console.log('3. Тест отправки уведомления о мэтче...');
    const matchResult = await kafkaService.sendMatchNotification('user456', {
      name: 'Мария',
      age: 28,
      photoUrl: 'https://example.com/photo2.jpg'
    });
    console.log(matchResult ? '✅ Уведомление о мэтче отправлено' : '❌ Ошибка отправки\n');

    // Тест 3: Отправка уведомления о fast match
    console.log('4. Тест отправки уведомления о fast match...');
    const fastMatchResult = await kafkaService.sendFastMatchNotification('user789', {
      name: 'Елена',
      age: 26,
      photoUrl: 'https://example.com/photo3.jpg'
    }, 'request123');
    console.log(fastMatchResult ? '✅ Уведомление о fast match отправлено' : '❌ Ошибка отправки\n');

    // Тест 4: Отправка аналитического события
    console.log('5. Тест отправки аналитического события...');
    const analyticsResult = await kafkaService.sendAnalyticsEvent('user_login', {
      userId: 'user123',
      timestamp: Date.now(),
      userAgent: 'Mozilla/5.0...',
      ip: '192.168.1.1'
    });
    console.log(analyticsResult ? '✅ Аналитическое событие отправлено' : '❌ Ошибка отправки\n');

    // Ждем немного для обработки сообщений
    console.log('6. Ожидание обработки сообщений...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Отключаемся от Kafka
    console.log('7. Отключение от Kafka...');
    await kafkaService.disconnect();
    console.log('✅ Kafka отключен\n');

    console.log('🎉 Все тесты завершены!');
    console.log('\n📊 Результаты:');
    console.log('- Лайки: ' + (likeResult ? '✅' : '❌'));
    console.log('- Мэтчи: ' + (matchResult ? '✅' : '❌'));
    console.log('- Fast Match: ' + (fastMatchResult ? '✅' : '❌'));
    console.log('- Аналитика: ' + (analyticsResult ? '✅' : '❌'));

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    await kafkaService.disconnect();
  }
}

// Запускаем тест
testKafkaIntegration(); 