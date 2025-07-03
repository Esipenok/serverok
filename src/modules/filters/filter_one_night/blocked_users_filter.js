const User = require('../../auth/models/User');

async function filterByBlockedUsers(userId, users) {
    try {
        console.log('Начало фильтрации по blocked_users');
        console.log(`Количество пользователей до фильтрации: ${users.length}`);

        // Получаем информацию о текущем пользователе
        const currentUser = await User.findOne({ userId });
        
        if (!currentUser || !currentUser.blocked_users) {
            console.log('У пользователя нет поля blocked_users или пользователь не найден');
            return users;
        }

        // Фильтруем пользователей, исключая тех, кто находится в списке заблокированных
        const filteredUsers = users.filter(user => 
            !currentUser.blocked_users.includes(user.userId.toString())
        );

        console.log(`Исключено ${users.length - filteredUsers.length} пользователей по полю blocked_users`);
        console.log(`Количество пользователей после фильтрации: ${filteredUsers.length}`);
        
        return filteredUsers;
    } catch (error) {
        console.error('Error in blocked users filter:', error);
        throw error;
    }
}

module.exports = {
    filterByBlockedUsers
}; 