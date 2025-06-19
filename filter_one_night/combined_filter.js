const User = require('../auth/models/User');

async function filterUsers(userId, filters = {}) {
    try {
        console.log('Начало комбинированной фильтрации для пользователя:', userId);
        console.log('Полученные фильтры:', filters);

        // Получаем текущего пользователя для проверки его предпочтений
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Создаем базовый запрос
        const query = {
            userId: { $ne: userId }, // Исключаем текущего пользователя
            one_night: true, // Только активные пользователи
            $and: [
                // Проверка на взаимные предпочтения
                {
                    $or: [
                        { lookingFor: 'all' },
                        { lookingFor: currentUser.gender }
                    ]
                }
            ]
        };

        // Добавляем фильтр по возрасту
        if (filters.ageMin && filters.ageMax) {
            query.$and.push({
                $expr: {
                    $and: [
                        { $gte: [{ $subtract: [new Date(), { $toDate: '$birthday' }] }, filters.ageMin * 365 * 24 * 60 * 60 * 1000] },
                        { $lte: [{ $subtract: [new Date(), { $toDate: '$birthday' }] }, filters.ageMax * 365 * 24 * 60 * 60 * 1000] }
                    ]
                }
            });
        }

        // Добавляем фильтр по полу
        if (filters.lookingFor && filters.lookingFor !== 'all') {
            query.$and.push({ gender: filters.lookingFor });
        }

        // Добавляем фильтр по расстоянию
        if (filters.searchDistance) {
            // Проверяем, что значение находится в допустимом диапазоне
            const distance = Math.min(Math.max(filters.searchDistance, 1), 100);
            query.$and.push({
                $expr: {
                    $lte: [
                        {
                            $divide: [
                                {
                                    $add: [
                                        { $pow: [{ $subtract: ['$real_loc.latitude', currentUser.real_loc.latitude] }, 2] },
                                        { $pow: [{ $subtract: ['$real_loc.longitude', currentUser.real_loc.longitude] }, 2] }
                                    ]
                                },
                                distance * 1000 // Конвертируем км в метры
                            ]
                        },
                        distance * 1000 // Добавляем второй элемент для сравнения
                    ]
                }
            });
        }

        // Добавляем фильтр по исключенным пользователям (matches)
        if (filters.matches && filters.matches.length > 0) {
            query.$and.push({
                userId: { $nin: filters.matches }
            });
        }

        // Добавляем фильтр по заблокированным пользователям
        if (filters.blockedUsers && filters.blockedUsers.length > 0) {
            query.$and.push({
                userId: { $nin: filters.blockedUsers }
            });
        }

        // Добавляем фильтр по excludedUsers
        if (currentUser.excludedUsers && currentUser.excludedUsers.length > 0) {
            query.$and.push({
                userId: { $nin: currentUser.excludedUsers }
            });
        }

        console.log('Итоговый запрос:', JSON.stringify(query, null, 2));

        // Выполняем запрос с выборкой только нужных полей
        const filteredUsers = await User.find(query).select('name birthday about photos userId');
        console.log(`Найдено ${filteredUsers.length} пользователей после фильтрации`);

        return filteredUsers;
    } catch (error) {
        console.error('Error in combined filter:', error);
        throw error;
    }
}

module.exports = {
    filterUsers
}; 