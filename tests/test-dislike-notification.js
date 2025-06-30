const NotificationService = require('../notifications/notification.service');

// Тест логики дизлайка
async function testDislikeNotification() {
  console.log('=== Тест логики дизлайка и уведомлений ===\n');

  // Симулируем сценарий:
  // 1. Юзер 1 лайкает юзера 2
  // 2. Юзер 2 дизлайкает юзера 1
  // 3. Проверяем, что счетчик у юзера 2 уменьшился

  const user1Id = 'user1_test';
  const user2Id = 'user2_test';

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

  console.log('\n3. Симулируем дизлайк юзера 2 к юзеру 1...');
  console.log('(Уменьшаем счетчик уведомлений у юзера 2)');
  const dislikeResult = await NotificationService.decrementLikeCounter(user2Id);
  console.log(`Результат уменьшения счетчика: ${dislikeResult ? 'УСПЕХ' : 'ОШИБКА'}`);

  console.log('\n4. Проверяем результат...');
  const notificationsAfter = await NotificationService.getUserNotifications(user2Id);
  console.log(`Уведомлений после дизлайка: ${notificationsAfter.length}`);
  
  const likeNotificationAfter = notificationsAfter.find(n => n.type === 'like_counter');
  if (likeNotificationAfter) {
    console.log(`Счетчик лайков после дизлайка: ${likeNotificationAfter.data?.likeCount || 0}`);
  } else {
    console.log('Уведомление о лайках удалено (счетчик стал 0)');
  }

  console.log('\n=== Тест завершен ===');
}

// Запускаем тест
testDislikeNotification().catch(console.error); 