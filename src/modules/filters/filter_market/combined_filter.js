const { filterMarketCardsByGender } = require('./gender_filter');
const { filterMarketCardsByAge } = require('./age_filter');
const { filterMarketCardsByDistance } = require('./location_filter');
const { filterMarketCardsByExclude } = require('./exclude_filter');
const { filterMarketCardsByMarketCardExclude } = require('./market_card_exclude_filter');
const MarketCard = require('../../marketprofiles/models/MarketCard');
const User = require('../../auth/models/User');

async function filterMarketCards(userId) {
    try {
        console.log('Начало комбинированной фильтрации маркетных карточек для пользователя:', userId);

        // Получаем все маркетные карточки (исключая карточки текущего пользователя)
        const allMarketCards = await MarketCard.find({ userId: { $ne: userId } });
        console.log(`Найдено ${allMarketCards.length} маркетных карточек (исключая карточки текущего пользователя)`);

        // Шаг 1: Фильтруем по списку исключений
        const excludeFiltered = await filterMarketCardsByExclude(userId, allMarketCards);
        console.log(`После фильтрации по исключениям: ${excludeFiltered.length} карточек`);

        // Шаг 2: Фильтруем по market_card_exclude
        const marketCardExcludeFiltered = await filterMarketCardsByMarketCardExclude(userId, excludeFiltered);
        console.log(`После фильтрации по market_card_exclude: ${marketCardExcludeFiltered.length} карточек`);

        // Шаг 3: Фильтруем по расстоянию
        const cardsInRange = await filterMarketCardsByDistance(userId, marketCardExcludeFiltered);
        console.log(`Маркетных карточек в заданном радиусе: ${cardsInRange.length}`);

        // Шаг 4: Фильтруем по полу
        const genderFiltered = await filterMarketCardsByGender(userId, cardsInRange);
        console.log(`Маркетных карточек после фильтрации по полу: ${genderFiltered.length}`);

        // Шаг 5: Фильтруем по возрасту
        const finalFiltered = await filterMarketCardsByAge(userId, genderFiltered);
        console.log(`Итоговое количество маркетных карточек: ${finalFiltered.length}`);

        return finalFiltered;
    } catch (error) {
        console.error('Error in combined filter for market cards:', error);
        throw error;
    }
}

module.exports = {
    filterMarketCards
}; 