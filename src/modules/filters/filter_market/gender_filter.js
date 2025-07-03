const User = require('../../auth/models/User');
const MarketCard = require('../../marketprofiles/models/MarketCard');

async function filterMarketCardsByGender(userId, marketCards) {
    try {
        // Получаем текущего пользователя для доступа к его настройкам фильтрации
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем настройки фильтрации по полу/предпочтениям для маркета
        const lookingFor = currentUser.market_lookingFor || 'all';

        // Если не передан массив маркетных карточек, получаем все карточки из базы
        const cardsToFilter = marketCards || await MarketCard.find({ userId: { $ne: userId } });

        // Фильтруем маркетные карточки по полу в соответствии с предпочтениями пользователя
        let filteredCards = cardsToFilter;

        // Применяем фильтр в соответствии с выбранным предпочтением
        if (lookingFor === 'man') {
            console.log('Фильтрация маркета: показываем только мужчин');
            filteredCards = cardsToFilter.filter(card => card.gender === 'man');
        } else if (lookingFor === 'woman') {
            console.log('Фильтрация маркета: показываем только женщин');
            filteredCards = cardsToFilter.filter(card => card.gender === 'woman');
        } else if (lookingFor === 'other') {
            console.log('Фильтрация маркета: показываем только других');
            filteredCards = cardsToFilter.filter(card => card.gender === 'other');
        } else {
            console.log('Фильтрация маркета: показываем всех (all)');
            // lookingFor === 'all', фильтр не применяется
        }

        console.log(`Отфильтровано по полу (маркет): ${filteredCards.length} маркетных карточек для preference ${lookingFor}`);
        return filteredCards;
    } catch (error) {
        console.error('Error in filterMarketCardsByGender:', error);
        throw error;
    }
}

module.exports = {
    filterMarketCardsByGender
}; 