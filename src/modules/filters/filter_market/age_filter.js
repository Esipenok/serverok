const User = require('../../auth/models/User');
const MarketCard = require('../../marketprofiles/models/MarketCard');
const logger = require('../../../core/config/logger.config');
const calculateAge = require('../../../core/utils/age-calculator');

async function filterMarketCardsByAge(userId, marketCards) {
    try {
        // Получаем текущего пользователя для доступа к его настройкам фильтрации
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем настройки фильтрации по возрасту для маркета
        const ageMin = currentUser.market_ageMin || 18;
        const ageMax = currentUser.market_ageMax || 100;

        // Если не передан массив маркетных карточек, получаем все карточки из базы
        const cardsToFilter = marketCards || await MarketCard.find({ userId: { $ne: userId } });

        // Фильтруем маркетные карточки по возрасту
        const filteredCards = cardsToFilter.filter(card => {
            // Вычисляем возраст из даты рождения с помощью общей функции
            if (!card.birthday) return false;
            
            const age = calculateAge(card.birthday);
            return age >= ageMin && age <= ageMax;
        });

        console.log(`Отфильтровано по возрасту (маркет): ${filteredCards.length} маркетных карточек`);

        return filteredCards;
    } catch (error) {
        console.error('Error in filterMarketCardsByAge:', error);
        throw error;
    }
}

module.exports = {
    filterMarketCardsByAge
}; 