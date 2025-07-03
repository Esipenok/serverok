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
        const { searchDistance, real_loc } = currentUser;

        if (!real_loc || !real_loc.latitude || !real_loc.longitude) {
            throw new Error('User location not found');
        }

        // Фильтруем переданных пользователей по расстоянию
        const filteredUsers = users.filter(user => {
            // Проверяем наличие координат у другого пользователя
            if (!user.real_loc || !user.real_loc.latitude || !user.real_loc.longitude) {
                return false;
            }

            // Вычисляем расстояние между пользователями
            const distance = calculateDistance(
                real_loc.latitude,
                real_loc.longitude,
                user.real_loc.latitude,
                user.real_loc.longitude
            );

            // Возвращаем true, если пользователь находится в пределах радиуса поиска
            return distance <= searchDistance;
        });

        return filteredUsers;
    } catch (error) {
        console.error('Error in filterUsersByDistance:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByDistance
}; 