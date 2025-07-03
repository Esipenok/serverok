const { filterUsersByAge } = require('./age_filter');
const { filterUsersByGender } = require('./gender_filter');

async function applyFilters(userId, users) {
    try {
        // Apply gender filter first
        const genderFiltered = await filterUsersByGender(userId, users);
        
        // Then apply age filter
        const ageAndGenderFiltered = await filterUsersByAge(userId, genderFiltered);

        return ageAndGenderFiltered;
    } catch (error) {
        console.error('Error applying filters:', error);
        throw error;
    }
}

module.exports = {
    applyFilters
}; 