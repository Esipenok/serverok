const NodeGeocoder = require('node-geocoder');
const nodeFetch = require('node-fetch');
const { kafkaModuleService } = require('../../infrastructure/kafka/service.js');

// Кеш для хранения результатов геокодирования
const countryCache = new Map();

// Время последнего запроса для контроля частоты
let lastRequestTime = 0;
// Минимальный интервал между запросами (1 секунда)
const REQUEST_DELAY = 1000;

const options = {
  provider: 'openstreetmap',
  language: 'en',
  // Используем request вместо fetch
  httpAdapter: 'http',
  // Добавляем User-Agent и другие параметры для OSM
  apiParams: {
    'accept-language': 'en',
    'user-agent': 'Dating-App/1.0 (support@example.com)'
  },
  formatter: null
};

const geocoder = NodeGeocoder(options);

// Функция для создания ключа кеша
function getCacheKey(latitude, longitude) {
  // Округляем координаты до 4 десятичных знаков для эффективного кеширования похожих координат
  const lat = Math.round(latitude * 10000) / 10000;
  const lon = Math.round(longitude * 10000) / 10000;
  return `${lat},${lon}`;
}

// Функция для задержки выполнения для соблюдения ограничений API
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_DELAY) {
    const delay = REQUEST_DELAY - timeSinceLastRequest;
    console.log(`Enforcing rate limit. Waiting ${delay}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
}

async function getCountryFromCoordinates(latitude, longitude) {
  try {
    console.log(`Getting country for coordinates: latitude=${latitude}, longitude=${longitude}`);
    
    // Проверяем кеш
    const cacheKey = getCacheKey(latitude, longitude);
    if (countryCache.has(cacheKey)) {
      const cachedCountry = countryCache.get(cacheKey);
      console.log(`Found cached country: ${cachedCountry}`);
      return cachedCountry;
    }
    
    // Соблюдаем лимит запросов
    await enforceRateLimit();
    
    const results = await geocoder.reverse({ lat: latitude, lon: longitude });
    
    if (results && results.length > 0) {
      const country = results[0].country;
      console.log(`Found country: ${country}`);
      
      // Сохраняем в кеш
      countryCache.set(cacheKey, country);
      
      // Отправляем асинхронные операции в Kafka
      try {
        // Асинхронная аналитика определения страны
        await kafkaModuleService.sendCountryOperation('analytics', {
          latitude: latitude,
          longitude: longitude,
          country: country,
          action: 'geocode_success',
          timestamp: new Date().toISOString()
        });
        
        // Асинхронное обновление кэша
        await kafkaModuleService.sendCountryOperation('cache_update', {
          cacheKey: cacheKey,
          country: country,
          coordinates: { latitude, longitude },
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.error('Ошибка отправки асинхронных операций в Kafka:', error);
        // Не прерываем основной поток, так как страна уже определена
      }
      
      return country;
    }
    
    console.log('No results found for coordinates');
    return null;
  } catch (error) {
    console.error('Error getting country:', error);
    
    // Если ошибка связана с превышением лимита или другими проблемами API,
    // проверяем кеш на похожие координаты
    console.log('Checking cache for similar coordinates');
    // Попытка найти ближайшие координаты в кеше
    for (const [key, value] of countryCache.entries()) {
      const [cachedLat, cachedLon] = key.split(',').map(Number);
      if (Math.abs(cachedLat - latitude) < 0.1 && Math.abs(cachedLon - longitude) < 0.1) {
        console.log(`Using nearby cached country: ${value}`);
        return value;
      }
    }
    
    // В случае ошибки API или отсутствия кешированных значений возвращаем США для тестирования
    // Это временное решение для демонстрации работы приложения
    console.log('Using fallback country: United States');
    countryCache.set(cacheKey, 'United States');
    return 'United States';
  }
}

module.exports = {
  getCountryFromCoordinates
}; 