const OneNight = require('../models/one_night.model');
const User = require('../../auth/models/User');

// Создание нового приглашения
exports.createInvitation = async (req, res) => {
    try {
        const { userId1, userId2 } = req.body;
        console.log('Создание приглашения:', { userId1, userId2 });

        // Проверяем существование пользователей
        const user1 = await User.findOne({ userId: userId1 });
        const user2 = await User.findOne({ userId: userId2 });

        if (!user1 || !user2) {
            console.log('Пользователи не найдены:', { user1: !!user1, user2: !!user2 });
            return res.status(404).json({ message: 'Пользователи не найдены' });
        }

        // Создаем новое приглашение
        const invitation = new OneNight({
            userId1,
            userId2,
            user1status: true, // Инициатор сразу получает статус true
            user2status: null, // Ожидание ответа
            status: null      // Ожидание финального статуса
        });

        await invitation.save();
        console.log('Приглашение создано:', invitation);

        res.status(201).json({ message: 'Приглашение создано', invitation });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Приглашение уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// Получение всех приглашений для пользователя
exports.getInvitations = async (req, res) => {
    try {
        const { userId } = req.params;

        // Находим все приглашения, где пользователь является userId2
        const invitations = await OneNight.find({ userId2: userId });

        // Получаем ID всех пользователей, которые отправили приглашения
        const userIds = invitations.map(inv => inv.userId1);

        // Получаем данные пользователей
        const users = await User.find(
            { userId: { $in: userIds } },
            { name: 1, birthday: 1, about: 1, photos: 1, userId: 1 }
        );

        res.status(200).json({ success: true, incomingRequests: users });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// Обработка ответа на приглашение
exports.handleResponse = async (req, res) => {
    try {
        const { userId1, userId2, response } = req.body;

        const invitation = await OneNight.findOne({ userId1, userId2 });

        if (!invitation) {
            return res.status(404).json({ message: 'Приглашение не найдено' });
        }

        // Обновляем статус второго пользователя
        invitation.user2status = response;
        
        // Добавляем userId в поля excludedUsers обоих пользователей независимо от ответа
        try {
            // Добавляем userId1 в excludedUsers пользователя userId2
            await User.updateOne(
                { userId: userId2 },
                { $addToSet: { excludedUsers: userId1 } }
            );
            console.log(`Пользователь ${userId1} добавлен в excludedUsers пользователя ${userId2}`);
            
            // Добавляем userId2 в excludedUsers пользователя userId1
            await User.updateOne(
                { userId: userId1 },
                { $addToSet: { excludedUsers: userId2 } }
            );
            console.log(`Пользователь ${userId2} добавлен в excludedUsers пользователя ${userId1}`);
        } catch (updateError) {
            console.error('Ошибка при обновлении excludedUsers:', updateError);
            // Продолжаем выполнение даже при ошибке обновления excludedUsers
        }
        
        // Определяем финальный статус
        if (invitation.user1status && invitation.user2status) {
            invitation.status = 'create';
        } else {
            invitation.status = 'delete';
        }

        await invitation.save();

        // Отправляем ответ и удаляем запись
        const result = invitation.status;
        await OneNight.deleteOne({ _id: invitation._id });

        res.status(200).json({ status: result });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// Удаление запроса на одну ночь
exports.deleteInvitation = async (req, res) => {
    try {
        const { userId1, userId2 } = req.body;

        // Находим запрос перед удалением
        const invitation = await OneNight.findOne({ userId1, userId2 });

        if (!invitation) {
            return res.status(404).json({ message: 'Запрос не найден' });
        }

        // Находим и удаляем запрос
        await OneNight.deleteOne({ _id: invitation._id });

        res.status(200).json({ status: 'delete' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
}; 