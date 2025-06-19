const { filterUsersByGender } = require('./gender_filter');
const { filterUsersByAge } = require('./age_filter');
const { filterUsersByDistance } = require('./location_filter');
const User = require('../auth/models/User');

async function filterUsers(userId, queryParams = {}) {
    try {
        console.log('Начало комбинированной фильтрации для пользователя:', userId);
        console.log('Параметры фильтрации:', queryParams);

        // Получаем текущего пользователя
        const currentUser = await User.findOne({ userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем всех пользователей (исключая текущего) с ограниченным набором полей
        const allUsers = await User.find(
            { userId: { $ne: userId } },
            {
                userId: 1,
                name: 1,
                photos: 1,
                birthday: 1,
                about: 1,
                real_loc: 1,
                change_loc: 1,
                gender: 1
            }
        );
        console.log(`Найдено ${allUsers.length} пользователей (исключая текущего)`);

        // Фильтруем по расстоянию с учетом параметров запроса
        const usersInRange = await filterUsersByDistance(
            userId, 
            allUsers,
            queryParams.latitude,
            queryParams.longitude,
            queryParams.searchDistance
        );
        console.log(`Пользователей в заданном радиусе: ${usersInRange.length}`);

        // Фильтруем по полу с учетом параметров запроса
        const genderFiltered = await filterUsersByGender(
            userId, 
            usersInRange,
            queryParams.gender,
            queryParams.lookingFor
        );
        console.log(`Пользователей после фильтрации по полу: ${genderFiltered.length}`);

        // Фильтруем по возрасту с учетом параметров запроса
        const ageFiltered = await filterUsersByAge(
            userId, 
            genderFiltered,
            queryParams.ageMin,
            queryParams.ageMax
        );
        console.log(`Пользователей после фильтрации по возрасту: ${ageFiltered.length}`);

        // Фильтруем по excludedUsers
        const excludedUsersFiltered = ageFiltered.filter(user => 
            !currentUser.excludedUsers?.includes(user.userId)
        );
        console.log(`Пользователей после фильтрации по excludedUsers: ${excludedUsersFiltered.length}`);

        // Фильтруем по blocked_users
        const finalFiltered = excludedUsersFiltered.filter(user => {
            // Проверяем, что blocked_users существует и является массивом
            if (!currentUser.blocked_users || !Array.isArray(currentUser.blocked_users)) {
                return true; // Если blocked_users не существует или не является массивом, пропускаем пользователя
            }
            return !currentUser.blocked_users.includes(user.userId);
        });
        console.log(`Итоговое количество пользователей: ${finalFiltered.length}`);

        return finalFiltered;
    } catch (error) {
        console.error('Error in combined filter:', error);
        throw error;
    }
}

module.exports = {
    filterUsers
}; 