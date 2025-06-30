const NotificationService = require('../notifications/notification.service');

// Тест логики уведомлений при создании мэтча
async function testMatchNotification() {
  console.log('=== Тест уведомлений при создании мэтча ===\n');

  // Симулируем сценарий:
  // 1. Юзер 1 лайкает юзера 2
  // 2. Юзер 2 лайкает юзера 1 (создается мэтч)
  // 3. Проверяем, что счетчик у юзера 2 уменьшился

  const user1Id = 'user1_match_test';
  const user2Id = 'user2_match_test';

  console.log('1. Отправляем уведомление о лайке юзеру 2...');
  const likeResult = await NotificationService.sendLikeNotification(user2Id);
  console.log(`Результат отправки лайка: ${likeResult ? 'УСПЕХ' : 'ОШИБКА'}`);

  console.log('\n2. Получаем уведомления юзера 2...');
  const notifications = await NotificationService.getUserNotifications(user2Id);
  console.log(`Найдено уведомлений: ${notifications.length}`);
  
  const likeNotification = notifications.find(n => n.type === 'like_counter');
  if (likeNotification) {
    console.log(`Счетчик лайков: ${likeNotification.data?.likeCount || 0}`);
  }

  console.log('\n3. Симулируем создание мэтча (юзер 2 ответил взаимностью)...');
  console.log('(Уменьшаем счетчик уведомлений у юзера 2)');
  const matchResult = await NotificationService.decrementLikeCounter(user2Id);
  console.log(`Результат уменьшения счетчика при мэтче: ${matchResult ? 'УСПЕХ' : 'ОШИБКА'}`);

  console.log('\n4. Проверяем результат...');
  const notificationsAfter = await NotificationService.getUserNotifications(user2Id);
  console.log(`Уведомлений после мэтча: ${notificationsAfter.length}`);
  
  const likeNotificationAfter = notificationsAfter.find(n => n.type === 'like_counter');
  if (likeNotificationAfter) {
    console.log(`Счетчик лайков после мэтча: ${likeNotificationAfter.data?.likeCount || 0}`);
  } else {
    console.log('Уведомление о лайках удалено (счетчик стал 0)');
  }

  console.log('\n=== Тест завершен ===');
}

// Запускаем тест
testMatchNotification().catch(console.error); 