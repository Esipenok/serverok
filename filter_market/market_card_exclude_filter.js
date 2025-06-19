const User = require('../auth/models/User');

/**
 * Фильтрует маркетные карточки, исключая те, которые пользователь добавил в список market_card_exclude
 * и карточки заблокированных пользователей
 * @param {string} userId - ID пользователя
 * @param {Array} marketCards - Массив маркетных карточек для фильтрации
 * @returns {Promise<Array>} - Отфильтрованный массив маркетных карточек
 */
async function filterMarketCardsByMarketCardExclude(userId, marketCards = []) {
  try {
    // Если передан пустой массив, нечего фильтровать
    if (!marketCards || marketCards.length === 0) {
      console.log('Пустой массив маркетных карточек для фильтрации по market_card_exclude');
      return [];
    }

    // Получаем данные пользователя
    const user = await User.findOne({ userId: userId.toString() });
    
    // Если у пользователя нет данных, возвращаем все карточки
    if (!user) {
      console.log('Пользователь не найден:', userId);
      return marketCards;
    }

    // Получаем список ID исключенных карточек
    const excludedCardIds = user.market_card_exclude || [];
    
    // Получаем список заблокированных пользователей
    const blockedUserIds = user.blocked_market_users || [];
    
    // Если есть заблокированные пользователи, получаем их карточки
    let blockedUserCards = [];
    if (blockedUserIds.length > 0) {
      const blockedUsers = await User.find(
        { userId: { $in: blockedUserIds } },
        { market_cards: 1 }
      );
      
      // Собираем все карточки заблокированных пользователей
      blockedUserCards = blockedUsers.reduce((acc, blockedUser) => {
        return acc.concat(blockedUser.market_cards || []);
      }, []);
    }

    // Объединяем списки исключенных карточек
    const allExcludedCardIds = [...new Set([...excludedCardIds, ...blockedUserCards])];
    
    console.log(`Найдено ${excludedCardIds.length} исключенных карточек и ${blockedUserCards.length} карточек заблокированных пользователей для пользователя ${userId}`);
    
    // Фильтруем карточки, исключая те, что находятся в списке исключений
    const filteredCards = marketCards.filter(card => 
      !allExcludedCardIds.includes(card.marketCardId.toString())
    );
    
    console.log(`Отфильтровано по market_card_exclude и заблокированным пользователям: ${marketCards.length - filteredCards.length} карточек удалено, осталось ${filteredCards.length}`);
    return filteredCards;
  } catch (error) {
    console.error('Ошибка при фильтрации маркетных карточек по market_card_exclude:', error);
    // В случае ошибки возвращаем исходный массив
    return marketCards;
  }
}

module.exports = {
  filterMarketCardsByMarketCardExclude
}; 