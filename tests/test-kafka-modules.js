const { initializeKafka, kafkaModuleService } = require('../kafka/init');
const logger = require('../config/logger.config');

async function testKafkaModules() {
  console.log('🧪 Тестирование Kafka с модулями...\n');

  try {
    // Инициализируем Kafka
    console.log('1. Инициализация Kafka...');
    await initializeKafka();
    console.log('✅ Kafka инициализирован\n');

    // Тест 1: КРИТИЧЕСКИ ВАЖНЫЕ МОДУЛИ
    console.log('2. Тест критически важных модулей...');
    
    // Фотографии
    const photoResult = await kafkaModuleService.sendPhotoOperation('upload', {
      userId: 'user123',
      photoId: 'photo456',
      fileName: 'profile.jpg',
      size: 1024000
    });
    console.log(photoResult ? '✅ Операция с фото отправлена' : '❌ Ошибка отправки фото\n');

    // Мэтчи
    const matchResult = await kafkaModuleService.sendMatchOperation('create', {
      user1Id: 'user123',
      user2Id: 'user456',
      user1Name: 'Анна',
      user2Name: 'Мария',
      user1Age: 25,
      user2Age: 28,
      user1PhotoUrl: 'https://example.com/photo1.jpg',
      user2PhotoUrl: 'https://example.com/photo2.jpg'
    });
    console.log(matchResult ? '✅ Операция с мэтчем отправлена' : '❌ Ошибка отправки мэтча\n');

    // Тест 2: ВЫСОКИЙ ПРИОРИТЕТ - ФИЛЬТРЫ
    console.log('3. Тест фильтров (высокий приоритет)...');
    
    const filterResults = await Promise.all([
      kafkaModuleService.sendFilterOperation('filter_fast_match', 'fast_match_filter', {
        userId: 'user123',
        filters: { age: { min: 20, max: 30 }, distance: 50 },
        location: { lat: 55.7558, lng: 37.6176 }
      }),
      kafkaModuleService.sendFilterOperation('filter_finder', 'finder_filter', {
        userId: 'user456',
        searchParams: { interests: ['спорт', 'музыка'] },
        page: 1,
        limit: 20
      }),
      kafkaModuleService.sendFilterOperation('filter_market', 'market_filter', {
        userId: 'user789',
        category: 'premium',
        excludeList: ['user123', 'user456'],
        location: { lat: 55.7558, lng: 37.6176 }
      })
    ]);
    
    const filterSuccess = filterResults.every(result => result);
    console.log(filterSuccess ? '✅ Все фильтры отправлены' : '❌ Ошибка отправки фильтров\n');

    // Тест 3: СРЕДНИЙ ПРИОРИТЕТ
    console.log('4. Тест модулей среднего приоритета...');
    
    const mediumResults = await Promise.all([
      kafkaModuleService.sendAuthOperation('register', {
        userId: 'newuser123',
        email: 'test@example.com',
        username: 'testuser'
      }),
      kafkaModuleService.sendFastMatchOperation('request', {
        userId: 'user123',
        targetUserId: 'user456',
        requestId: 'req789'
      }),
      kafkaModuleService.sendMarketOperation('create', {
        userId: 'user123',
        marketType: 'premium',
        description: 'Премиум профиль'
      }),
      kafkaModuleService.sendQROperation('generate', {
        userId: 'user123',
        qrType: 'profile',
        data: 'https://willowe.love/user123'
      })
    ]);
    
    const mediumSuccess = mediumResults.every(result => result);
    console.log(mediumSuccess ? '✅ Все модули среднего приоритета отправлены' : '❌ Ошибка отправки\n');

    // Тест 4: НИЗКИЙ ПРИОРИТЕТ
    console.log('5. Тест модулей низкого приоритета...');
    
    const lowResults = await Promise.all([
      kafkaModuleService.sendComplainOperation('submit', {
        userId: 'user123',
        targetUserId: 'user456',
        reason: 'spam',
        description: 'Спам сообщения'
      }),
      kafkaModuleService.sendCountryOperation('detect', {
        userId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      }),
      kafkaModuleService.sendInviteOperation('send', {
        userId: 'user123',
        inviteCode: 'INVITE123',
        email: 'friend@example.com'
      })
    ]);
    
    const lowSuccess = lowResults.every(result => result);
    console.log(lowSuccess ? '✅ Все модули низкого приоритета отправлены' : '❌ Ошибка отправки\n');

    // Тест 5: АНАЛИТИКА
    console.log('6. Тест аналитики...');
    
    const analyticsResults = await Promise.all([
      kafkaModuleService.sendAnalyticsEvent('user_action', {
        userId: 'user123',
        action: 'profile_view',
        timestamp: Date.now(),
        metadata: { viewedUserId: 'user456' }
      }),
      kafkaModuleService.sendSystemMetric('performance', {
        endpoint: '/api/matches',
        responseTime: 150,
        statusCode: 200,
        timestamp: Date.now()
      })
    ]);
    
    const analyticsSuccess = analyticsResults.every(result => result);
    console.log(analyticsSuccess ? '✅ Аналитика отправлена' : '❌ Ошибка отправки аналитики\n');

    // Ждем обработки сообщений
    console.log('7. Ожидание обработки сообщений...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Отключаемся от Kafka
    console.log('8. Отключение от Kafka...');
    await kafkaModuleService.disconnect();
    console.log('✅ Kafka отключен\n');

    console.log('🎉 Все тесты завершены!');
    console.log('\n📊 Результаты:');
    console.log('- Критически важные модули: ' + (photoResult && matchResult ? '✅' : '❌'));
    console.log('- Фильтры (высокий приоритет): ' + (filterSuccess ? '✅' : '❌'));
    console.log('- Средний приоритет: ' + (mediumSuccess ? '✅' : '❌'));
    console.log('- Низкий приоритет: ' + (lowSuccess ? '✅' : '❌'));
    console.log('- Аналитика: ' + (analyticsSuccess ? '✅' : '❌'));

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    await kafkaModuleService.disconnect();
  }
}

// Запускаем тест
testKafkaModules(); 