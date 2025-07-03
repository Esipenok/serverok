const User = require('../../auth/models/User');

async function filterUsersByActiveStatus(userId, users) {
    try {
        console.log('Начало фильтрации по sex');
        console.log(`Количество пользователей до фильтрации: ${users.length}`);

        // Фильтруем только активных пользователей
        const activeUsers = users.filter(user => user.sex === true);

        console.log(`Количество активных пользователей: ${activeUsers.length}`);
        return activeUsers;
    } catch (error) {
        console.error('Error in active status filter:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByActiveStatus
}; 