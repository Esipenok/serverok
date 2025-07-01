const notificationService = require('../notifications/notification.service');

async function testOneNightNotifications() {
    console.log('=== Тестирование системы уведомлений One Night ===\n');

    const testUserId = 'test_user_123';

    try {
        // Тест 1: Создание первого уведомления
        console.log('1. Создание первого уведомления...');
        const result1 = await notificationService.sendOneNightNotification(testUserId);
        console.log('Результат:', result1 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 2: Увеличение счетчика
        console.log('2. Увеличение счетчика...');
        const result2 = await notificationService.sendOneNightNotification(testUserId);
        console.log('Результат:', result2 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 3: Еще одно увеличение счетчика
        console.log('3. Еще одно увеличение счетчика...');
        const result3 = await notificationService.sendOneNightNotification(testUserId);
        console.log('Результат:', result3 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 4: Получение уведомлений
        console.log('4. Получение уведомлений пользователя...');
        const notifications = await notificationService.getUserNotifications(testUserId);
        const oneNightNotification = notifications.find(n => n.type === 'one_night_counter');
        console.log('Найдено уведомлений:', notifications.length);
        if (oneNightNotification) {
            console.log('One Night счетчик:', oneNightNotification.data?.oneNightCount);
        }
        console.log('');

        // Тест 5: Уменьшение счетчика
        console.log('5. Уменьшение счетчика...');
        const result4 = await notificationService.decrementOneNightCounter(testUserId);
        console.log('Результат:', result4 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 6: Проверка после уменьшения
        console.log('6. Проверка после уменьшения...');
        const notificationsAfter = await notificationService.getUserNotifications(testUserId);
        const oneNightNotificationAfter = notificationsAfter.find(n => n.type === 'one_night_counter');
        console.log('Найдено уведомлений:', notificationsAfter.length);
        if (oneNightNotificationAfter) {
            console.log('One Night счетчик после уменьшения:', oneNightNotificationAfter.data?.oneNightCount);
        }
        console.log('');

        // Тест 7: Уменьшение до 0
        console.log('7. Уменьшение счетчика до 0...');
        const result5 = await notificationService.decrementOneNightCounter(testUserId);
        const result6 = await notificationService.decrementOneNightCounter(testUserId);
        console.log('Результат уменьшения 1:', result5 ? 'Успешно' : 'Ошибка');
        console.log('Результат уменьшения 2:', result6 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 8: Проверка удаления уведомления
        console.log('8. Проверка удаления уведомления...');
        const finalNotifications = await notificationService.getUserNotifications(testUserId);
        const finalOneNightNotification = finalNotifications.find(n => n.type === 'one_night_counter');
        console.log('Найдено уведомлений:', finalNotifications.length);
        console.log('One Night уведомление существует:', !!finalOneNightNotification);
        console.log('');

        console.log('=== Тестирование завершено ===');

    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

// Запуск теста
testOneNightNotifications(); 