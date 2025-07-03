const User = require('../../auth/models/User');
const logger = require('../../../core/config/logger.config');
const calculateAge = require('../../../core/utils/age-calculator');

async function filterUsersByAge(userId, users) {
    try {
        // Получаем текущего пользователя для доступа к его настройкам фильтрации
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем настройки фильтрации по возрасту
        const { ageMin, ageMax } = currentUser;

        // Если не передан массив пользователей, получаем всех пользователей из базы
        const usersToFilter = users || await User.find({ userId: { $ne: userId } });

        // Фильтруем пользователей по возрасту
        const filteredUsers = usersToFilter.filter(user => {
            // Вычисляем возраст на основе даты рождения
            let age = 0;
            if (user.birthday) {
                age = calculateAge(user.birthday);
            }
            return age >= ageMin && age <= ageMax;
        });

        console.log(`Отфильтровано по возрасту: ${filteredUsers.length} пользователей`);
        return filteredUsers;
    } catch (error) {
        console.error('Error in filterUsersByAge:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByAge
}; 