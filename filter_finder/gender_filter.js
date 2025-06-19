const User = require('../auth/models/User');

async function filterUsersByGender(userId, users) {
    try {
        // Получаем текущего пользователя для доступа к его настройкам фильтрации
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем настройку фильтрации по полу
        const { lookingFor } = currentUser;

        // Если не передан массив пользователей, получаем всех пользователей из базы
        const usersToFilter = users || await User.find({ userId: { $ne: userId } });

        // Фильтруем пользователей по полу
        let filteredUsers;
        if (lookingFor === 'all') {
            // Если пользователь ищет "всех", не фильтруем по полу
            filteredUsers = usersToFilter;
        } else {
            // Иначе фильтруем по выбранному полу
            filteredUsers = usersToFilter.filter(user => user.gender === lookingFor);
        }

        console.log(`Отфильтровано по полу: ${filteredUsers.length} пользователей`);
        return filteredUsers;
    } catch (error) {
        console.error('Error in filterUsersByGender:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByGender
}; 