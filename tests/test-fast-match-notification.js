const notificationService = require('../notifications/notification.service');

async function testFastMatchNotifications() {
    console.log('=== Тестирование системы уведомлений Fast Match ===\n');

    const testUserId = 'test_user_456';
    const testRequestId = 'test_request_123';

    try {
        // Тест 1: Создание уведомления о fast match
        console.log('1. Создание уведомления о fast match...');
        const senderData = {
            userId: 'sender_123',
            name: 'Анна',
            photoUrl: 'https://example.com/photo.jpg'
        };
        
        const result1 = await notificationService.sendFastMatchNotification(testUserId, senderData, testRequestId);
        console.log('Результат:', result1 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 2: Получение уведомлений
        console.log('2. Получение уведомлений пользователя...');
        const notifications = await notificationService.getUserNotifications(testUserId);
        const fastMatchNotification = notifications.find(n => n.type === 'fast_match');
        console.log('Найдено уведомлений:', notifications.length);
        if (fastMatchNotification) {
            console.log('Fast Match уведомление найдено:', {
                requestId: fastMatchNotification.data?.requestId,
                senderName: fastMatchNotification.data?.senderName,
                expiresAt: new Date(fastMatchNotification.data?.expiresAt).toISOString()
            });
        }
        console.log('');

        // Тест 3: Удаление уведомления по requestId
        console.log('3. Удаление уведомления по requestId...');
        const result2 = await notificationService.deleteFastMatchNotificationByRequestId(testUserId, testRequestId);
        console.log('Результат удаления:', result2 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 4: Проверка после удаления
        console.log('4. Проверка после удаления...');
        const notificationsAfter = await notificationService.getUserNotifications(testUserId);
        const fastMatchNotificationAfter = notificationsAfter.find(n => n.type === 'fast_match');
        console.log('Найдено уведомлений:', notificationsAfter.length);
        console.log('Fast Match уведомление существует:', !!fastMatchNotificationAfter);
        console.log('');

        // Тест 5: Тест автоматического удаления (сокращенное время)
        console.log('5. Тест автоматического удаления (5 секунд)...');
        const testRequestId2 = 'test_request_456';
        const result3 = await notificationService.sendFastMatchNotification(testUserId, senderData, testRequestId2);
        console.log('Уведомление создано:', result3 ? 'Успешно' : 'Ошибка');
        
        // Планируем удаление через 5 секунд для теста
        notificationService.scheduleFastMatchNotificationDeletion(testUserId, 'test_notification_id', 5000);
        console.log('Запланировано автоматическое удаление через 5 секунд');
        console.log('');

        console.log('=== Тестирование завершено ===');
        console.log('Примечание: Автоматическое удаление произойдет через 5 секунд');

    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

// Запуск теста
testFastMatchNotifications(); 