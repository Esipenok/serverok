const notificationService = require('./notification.service');

async function testNotification() {
  console.log('Тестируем отправку уведомления о мэтче...');
  
  const testData = {
    userId: 'test_user_123',
    name: 'Анна',
    photoUrl: 'https://example.com/photo.jpg'
  };
  
  const result = await notificationService.sendMatchNotification('target_user_456', testData);
  
  if (result) {
    console.log('✅ Уведомление успешно отправлено!');
  } else {
    console.log('❌ Ошибка отправки уведомления');
  }
}

// Запускаем тест
testNotification().catch(console.error); 