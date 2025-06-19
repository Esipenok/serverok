const User = require('../auth/models/User');

async function filterUsersByGender(userId, users) {
    try {
        // Get current user's gender preferences
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        const { lookingFor } = currentUser;
        
        // If user is looking for 'all', return all users
        if (lookingFor === 'all') {
            return users;
        }

        // Filter users based on gender preference
        const filteredUsers = users.filter(user => {
            return user.gender === lookingFor;
        });

        return filteredUsers;
    } catch (error) {
        console.error('Error in gender filter:', error);
        throw error;
    }
}

module.exports = {
    filterUsersByGender
}; 