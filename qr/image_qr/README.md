# QR-коды с сердечками 🖤

Система для генерации красивых QR-кодов с сердечками в различных стилях.

## Возможности

- ❤️ **Сердечко в центре** - одно красивое сердечко в центре QR-кода
- 💕 **Сердечки в углах** - четыре маленьких сердечка в углах
- 💖 **Градиентное сердечко** - сердечко с красивым градиентом
- 🎨 **Кастомизация цветов** - настройка цветов QR-кода и сердечек
- 📏 **Различные размеры** - от 200px до 1000px
- 🔧 **Высокий уровень коррекции ошибок** - QR-код остается читаемым

## Структура файлов

```
willowe/qr/image_qr/
├── heartQrGenerator.js      # Основной генератор QR-кодов
├── heartQrController.js     # Контроллер для API
├── heartQrRoutes.js         # Маршруты API
├── test-heart-qr.js         # Тестовый файл
└── README.md               # Документация
```

## API Эндпоинты

### 1. Получить доступные стили
```
GET /api/qr/heart/styles
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "center",
      "name": "Сердечко в центре",
      "description": "Одно красивое сердечко в центре QR-кода",
      "preview": "❤️"
    },
    {
      "id": "corners",
      "name": "Сердечки в углах",
      "description": "Четыре маленьких сердечка в углах QR-кода",
      "preview": "❤️❤️\n❤️❤️"
    },
    {
      "id": "gradient",
      "name": "Градиентное сердечко",
      "description": "Сердечко с красивым градиентом в центре",
      "preview": "💖"
    }
  ]
}
```

### 2. Генерировать QR-код с сердечком по QR ID
```
GET /api/qr/heart/image/:qrId?style=center&size=300&heartColor=#FF4757
```

**Параметры:**
- `style` - стиль QR-кода (`center`, `corners`, `gradient`)
- `size` - размер изображения (200-1000)
- `heartColor` - цвет сердечка (hex)
- `foregroundColor` - цвет QR-кода (hex)
- `backgroundColor` - цвет фона (hex)

### 3. Генерировать QR-код с сердечком для пользователя
```
GET /api/qr/heart/user/:userId?style=center&size=300&heartColor=#FF4757
```

### 4. Тестировать генерацию
```
POST /api/qr/heart/test
```

**Тело запроса:**
```json
{
  "data": "https://example.com",
  "style": "center",
  "size": 300,
  "heartColor": "#FF4757",
  "foregroundColor": "#FF6B6B",
  "backgroundColor": "#FFFFFF"
}
```

## Примеры использования

### JavaScript (Node.js)
```javascript
const { generateHeartQRCode } = require('./heartQrGenerator');

// Генерируем QR-код с сердечком в центре
const qrBuffer = await generateHeartQRCode('https://example.com', {
  size: 300,
  foregroundColor: '#FF6B6B',
  backgroundColor: '#FFFFFF',
  heartColor: '#FF4757'
});
```

### cURL
```bash
# Получить QR-код с сердечком в центре
curl "http://localhost:3000/api/qr/heart/image/your-qr-id?style=center&size=300&heartColor=%23FF4757" \
  -o heart-qr.png

# Получить QR-код с сердечками в углах
curl "http://localhost:3000/api/qr/heart/image/your-qr-id?style=corners&size=400" \
  -o corners-heart-qr.png

# Получить градиентный QR-код
curl "http://localhost:3000/api/qr/heart/image/your-qr-id?style=gradient&size=500" \
  -o gradient-heart-qr.png
```

## Тестирование

Запустите тестовый файл для проверки работы:

```bash
cd willowe/qr/image_qr
node test-heart-qr.js
```

Это создаст несколько тестовых QR-кодов в папке `test-output/`.

## Цветовые схемы

### Романтичная (по умолчанию)
- QR-код: `#FF6B6B` (розовый)
- Фон: `#FFFFFF` (белый)
- Сердечко: `#FF4757` (красный)

### Фиолетовая
- QR-код: `#755BED` (фиолетовый)
- Фон: `#F8F9FA` (светло-серый)
- Сердечко: `#F5635B` (красный)

### Градиентная
- QR-код: `#FF6B6B` (розовый)
- Фон: `#FFFFFF` (белый)
- Сердечко: `['#FF6B6B', '#FF8E8E', '#FF4757']` (градиент)

## Технические детали

### Зависимости
- `qrcode` - генерация QR-кодов
- `sharp` - обработка изображений
- `express` - веб-сервер

### Уровень коррекции ошибок
Используется уровень `H` (High) для максимальной надежности чтения QR-кода даже при наложении сердечек.

### Размеры
- Минимальный размер: 200px
- Максимальный размер: 1000px
- Рекомендуемый размер: 300-500px

### Форматы
- Выходной формат: PNG
- Поддержка прозрачности: Нет
- Сжатие: Автоматическое

## Интеграция с Flutter

Для использования в Flutter приложении:

```dart
// В QrService добавьте метод для получения QR-кода с сердечком
Future<String> getHeartQrImageUrl(String qrId, {
  String style = 'center',
  int size = 300,
  String heartColor = '#FF4757',
}) async {
  final queryParams = {
    'style': style,
    'size': size.toString(),
    'heartColor': heartColor,
  };
  
  final uri = Uri.parse('${ApiConfig.baseUrl}/api/qr/heart/image/$qrId')
      .replace(queryParameters: queryParams);
      
  return uri.toString();
}
```

## Безопасность

- Все входные данные валидируются
- Ограничения на размер изображения
- Кэширование результатов
- Защита от переполнения буфера

## Производительность

- Генерация занимает ~100-300ms
- Кэширование на 1 час
- Оптимизированные SVG сердечки
- Эффективная обработка изображений

## Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте логи сервера
2. Запустите тестовый файл
3. Убедитесь, что все зависимости установлены
4. Проверьте права доступа к папкам

## Лицензия

Этот код является частью проекта Willowe и подчиняется его лицензии. 