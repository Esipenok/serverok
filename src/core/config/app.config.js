// Конфигурация приложения
const config = {
  // Базовый URL для API и статических файлов
  // В разработке используется http://10.0.2.2:3000 для доступа из эмулятора Android
  // В продакшене используется HTTPS с доменом willowe.love
  baseUrl: process.env.BASE_URL || 'https://willowe.love',
  
  // URL для статических файлов (фотографии и другие ресурсы)
  staticUrl: process.env.STATIC_URL || 'https://willowe.love',
  
  // Порт для сервера
  port: process.env.PORT || 3000,
  
  // Режим работы (development, production)
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Настройки для разработки
  development: {
    baseUrl: 'http://10.0.2.2:3000', // Для Android эмулятора
    staticUrl: 'http://10.0.2.2:3000'
  }
};

// Если мы в режиме разработки, используем соответствующие URL
if (config.nodeEnv === 'development') {
  config.baseUrl = config.development.baseUrl;
  config.staticUrl = config.development.staticUrl;
}

// Функция для получения полного URL для статических файлов
config.getFullPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  
  // Если URL уже полный, возвращаем как есть
  if (photoPath.startsWith('http')) {
    return photoPath;
  }
  
  // Добавляем слеш в начало пути, если его нет
  const normalizedPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  
  // Возвращаем полный URL
  return `${config.staticUrl}${normalizedPath}`;
};

module.exports = config; 