const notificationService = require('../notifications/notification.service');

async function testFastMatchMatchNotifications() {
    console.log('=== Тестирование уведомлений о мэтчах в Fast Match ===\n');

    const user1Id = 'test_user_1';
    const user2Id = 'test_user_2';

    try {
        // Тест 1: Отправка уведомления о мэтче пользователю 1
        console.log('1. Отправка уведомления о мэтче пользователю 1...');
        const user2Data = {
            userId: user2Id,
            name: 'Мария',
            photoUrl: 'https://example.com/maria.jpg'
        };
        
        const result1 = await notificationService.sendMatchNotification(user1Id, user2Data);
        console.log('Результат:', result1 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 2: Отправка уведомления о мэтче пользователю 2
        console.log('2. Отправка уведомления о мэтче пользователю 2...');
        const user1Data = {
            userId: user1Id,
            name: 'Алексей',
            photoUrl: 'https://example.com/alex.jpg'
        };
        
        const result2 = await notificationService.sendMatchNotification(user2Id, user1Data);
        console.log('Результат:', result2 ? 'Успешно' : 'Ошибка');
        console.log('');

        // Тест 3: Получение уведомлений пользователя 1
        console.log('3. Получение уведомлений пользователя 1...');
        const notifications1 = await notificationService.getUserNotifications(user1Id);
        const matchNotification1 = notifications1.find(n => n.type === 'match');
        console.log('Найдено уведомлений:', notifications1.length);
        if (matchNotification1) {
            console.log('Уведомление о мэтче найдено:', {
                userId: matchNotification1.data?.userId,
                name: matchNotification1.data?.name,
                photoUrl: matchNotification1.data?.photoUrl
            });
        }
        console.log('');

        // Тест 4: Получение уведомлений пользователя 2
        console.log('4. Получение уведомлений пользователя 2...');
        const notifications2 = await notificationService.getUserNotifications(user2Id);
        const matchNotification2 = notifications2.find(n => n.type === 'match');
        console.log('Найдено уведомлений:', notifications2.length);
        if (matchNotification2) {
            console.log('Уведомление о мэтче найдено:', {
                userId: matchNotification2.data?.userId,
                name: matchNotification2.data?.name,
                photoUrl: matchNotification2.data?.photoUrl
            });
        }
        console.log('');

        // Тест 5: Отправка уведомлений о мэтче одновременно (имитация fast match)
        console.log('5. Отправка уведомлений о мэтче одновременно...');
        const fastMatchUser1Data = {
            userId: 'fast_user_1',
            name: 'Елена',
            photoUrl: 'https://example.com/elena.jpg'
        };
        
        const fastMatchUser2Data = {
            userId: 'fast_user_2',
            name: 'Дмитрий',
            photoUrl: 'https://example.com/dmitry.jpg'
        };
        
        const results = await Promise.all([
            notificationService.sendMatchNotification('fast_user_2', fastMatchUser1Data),
            notificationService.sendMatchNotification('fast_user_1', fastMatchUser2Data)
        ]);
        
        console.log('Результаты одновременной отправки:', results.map(r => r ? 'Успешно' : 'Ошибка'));
        console.log('');

        console.log('=== Тестирование завершено ===');

    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

// Запуск теста
testFastMatchMatchNotifications(); 