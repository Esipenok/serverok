const User = require('../../auth/models/User');
const { calculateDistance } = require('./distance_utils');

async function filterUsersByDistance(userId, users) {
    try {
        // Получаем текущего пользователя для доступа к его настройкам фильтрации
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем настройки поиска и координаты пользователя
        const { searchDistance, change_loc } = currentUser;
        console.log('Настройки фильтрации:', {
            userId,
            searchDistance,
            hasLocation: !!change_loc,
            totalUsers: users.length
        });

        // Если searchDistance равен 100, возвращаем всех пользователей без фильтрации по расстоянию
        if (searchDistance === 100) {
            console.log('Поиск по расстоянию отключен (searchDistance = 100)');
            // Добавляем расстояние к данным пользователя для отображения
            users.forEach(user => {
                if (user.change_loc && user.change_loc.latitude && user.change_loc.longitude) {
                    const distance = calculateDistance(
                        change_loc.latitude,
                        change_loc.longitude,
                        user.change_loc.latitude,
                        user.change_loc.longitude
                    );
                    user.distance = Math.round(distance);
                }
            });
            return users;
        }

        if (!change_loc || !change_loc.latitude || !change_loc.longitude) {
            throw new Error('User change_loc location not found');
        }

        // Фильтруем переданных пользователей по расстоянию
        const filteredUsers = users.filter(user => {
            // Проверяем наличие координат у другого пользователя
            if (!user.change_loc || !user.change_loc.latitude || !user.change_loc.longitude) {
                return false;
            }

            // Вычисляем расстояние между пользователями
            const distance = calculateDistance(
                change_loc.latitude,
                change_loc.longitude,
                user.change_loc.latitude,
                user.change_loc.longitude
            );

            // Добавляем расстояние к данным пользователя для отображения
            user.distance = Math.round(distance);

            // Возвращаем true, если пользователь находится в пределах радиуса поиска
            return distance <= searchDistance;
        });

        console.log(`Отфильтровано по расстоянию: ${filteredUsers.length} пользователей из ${users.length} (searchDistance = ${searchDistance} км)`);
        return filteredUsers;
    } catch (error) {
        console.error('Error in filterUsersByDistance:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByDistance
}; 