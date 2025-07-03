const User = require('../../auth/models/User');
const MarketCard = require('../../marketprofiles/models/MarketCard');
const { calculateDistance } = require('./distance_utils');

async function filterMarketCardsByDistance(userId, marketCards) {
    try {
        // Получаем текущего пользователя для доступа к его настройкам фильтрации
        const currentUser = await User.findOne({ userId: userId });
        if (!currentUser) {
            throw new Error('User not found');
        }

        // Получаем настройки поиска и координаты пользователя для маркета
        const searchDistance = currentUser.market_searchDistance || 100;
        
        // Если у пользователя установлены специальные координаты для маркета, используем их
        // Иначе используем обычные координаты
        const userLocation = currentUser.market_location && 
                          currentUser.market_location.latitude && 
                          currentUser.market_location.longitude
                        ? currentUser.market_location
                        : currentUser.change_loc;

        if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
            throw new Error('User location not found');
        }

        // Если не передан массив маркетных карточек, получаем все карточки из базы
        const cardsToFilter = marketCards || await MarketCard.find({ userId: { $ne: userId } });

        // Если searchDistance равен 100, возвращаем все карточки без фильтрации по расстоянию
        if (searchDistance === 100) {
            console.log('Поиск по расстоянию отключен (searchDistance = 100)');
            // Добавляем расстояние к данным карточки для отображения
            for (const card of cardsToFilter) {
                const cardOwner = await User.findOne({ userId: card.userId });
                if (cardOwner && cardOwner.change_loc && 
                    cardOwner.change_loc.latitude && cardOwner.change_loc.longitude) {
                    const distance = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        cardOwner.change_loc.latitude,
                        cardOwner.change_loc.longitude
                    );
                    card.distance = Math.round(distance);
                }
            }
            return cardsToFilter;
        }

        // Для каждой карточки нам нужно получить пользователя, чтобы проверить его местоположение
        const filteredCards = [];
        
        for (const card of cardsToFilter) {
            // Получаем владельца карточки
            const cardOwner = await User.findOne({ userId: card.userId });
            
            // Если владелец не найден или у него нет местоположения, пропускаем карточку
            if (!cardOwner || !cardOwner.change_loc || 
                !cardOwner.change_loc.latitude || !cardOwner.change_loc.longitude) {
                continue;
            }
            
            // Вычисляем расстояние между пользователем и владельцем карточки
            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                cardOwner.change_loc.latitude,
                cardOwner.change_loc.longitude
            );
            
            // Добавляем расстояние к данным карточки для отображения
            card.distance = Math.round(distance);
            
            // Если расстояние в пределах настроек поиска, добавляем карточку в результат
            if (distance <= searchDistance) {
                filteredCards.push(card);
            }
        }

        console.log(`Отфильтровано по расстоянию (маркет): ${filteredCards.length} маркетных карточек из ${cardsToFilter.length} (searchDistance = ${searchDistance} км)`);
        return filteredCards;
    } catch (error) {
        console.error('Error in filterMarketCardsByDistance:', error);
        throw error;
    }
}

module.exports = {
    filterMarketCardsByDistance
}; 