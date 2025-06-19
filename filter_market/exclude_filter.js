/**
 * Фильтрует маркетные карточки, исключая те, которые пользователь добавил в список исключений
 * @param {string} userId - ID пользователя
 * @param {Array} marketCards - Массив маркетных карточек для фильтрации
 * @returns {Promise<Array>} - Отфильтрованный массив маркетных карточек
 */
async function filterMarketCardsByExclude(userId, marketCards = []) {
  try {
    // Если передан пустой массив, нечего фильтровать
    if (!marketCards || marketCards.length === 0) {
      console.log('Пустой массив маркетных карточек для фильтрации по исключениям');
      return [];
    }

    // Временно возвращаем все карточки, так как функционал исключений отключен
    console.log(`Возвращаем все ${marketCards.length} карточек для пользователя ${userId}`);
    return marketCards;
  } catch (error) {
    console.error('Ошибка при фильтрации маркетных карточек по исключениям:', error);
    // В случае ошибки возвращаем исходный массив
    return marketCards;
  }
}

module.exports = {
  filterMarketCardsByExclude
}; 