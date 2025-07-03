const User = require('../../auth/models/User');
const calculateAge = require('../../../core/utils/age-calculator');

async function filterUsersByAge(userId, users) {
    try {
        // Get current user's age preferences
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        const { ageMin, ageMax } = currentUser;

        // Filter users based on age range
        const filteredUsers = users.filter(user => {
            // Вычисляем возраст на основе даты рождения
            let age = 0;
            if (user.birthday) {
                age = calculateAge(user.birthday);
            }
            return age >= ageMin && age <= ageMax;
        });

        return filteredUsers;
    } catch (error) {
        console.error('Error in age filter:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByAge
}; 