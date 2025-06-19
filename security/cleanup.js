const { cleanupBlacklistedTokens } = require('./token.service');

/**
 * Запускает периодическую очистку токенов в черном списке
 * @param {number} intervalMinutes - Интервал очистки в минутах
 */
const startTokenCleanup = (intervalMinutes = 60) => {
  // Запускаем очистку сразу при старте сервера
  cleanupBlacklistedTokens();
  
  // Запускаем периодическую очистку
  setInterval(cleanupBlacklistedTokens, intervalMinutes * 60 * 1000);
  
  console.log(`Запущена периодическая очистка токенов с интервалом ${intervalMinutes} минут`);
};

module.exports = {
  startTokenCleanup
}; 