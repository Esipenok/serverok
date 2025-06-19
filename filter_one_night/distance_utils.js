// Функция для расчета расстояния между двумя точками по формуле гаверсинусов
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли в километрах
    
    // Переводим градусы в радианы
    const lat1Rad = toRadians(lat1);
    const lon1Rad = toRadians(lon1);
    const lat2Rad = toRadians(lat2);
    const lon2Rad = toRadians(lon2);
    
    // Разница координат
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;
    
    // Формула гаверсинусов
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Расстояние в километрах
    
    return distance;
}

// Вспомогательная функция для перевода градусов в радианы
function toRadians(degrees) {
    return degrees * (Math.PI/180);
}

module.exports = {
    calculateDistance
}; 