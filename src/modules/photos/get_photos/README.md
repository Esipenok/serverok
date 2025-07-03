# API для получения изображений

Модуль предоставляет API для получения изображений разных размеров и форматов. Все изображения автоматически конвертируются в формат WebP для оптимизации размера и скорости загрузки.

## Эндпоинты

### 1. Получение изображения с указанным типом (размером)

```
GET /api/images/:photoPath?imageType=gallery
```

#### Параметры:

- `photoPath` - Путь к фотографии (URL-encoded)
- `imageType` - Тип изображения (query параметр):
  - `profile` - Оптимизировано для профиля (800px, качество 85%)
  - `gallery` - Оптимизировано для галереи (1200px, качество 80%)
  - `thumbnail` - Миниатюра (300px, качество 75%)
  - `chat` - Оптимизировано для чата (600px, качество 70%)

#### Пример запроса:

```
GET /api/images/users/123456/photo.jpg?imageType=profile
```

### 2. Получение миниатюры

```
GET /api/images/thumbnail/:photoPath
```

#### Параметры:

- `photoPath` - Путь к фотографии (URL-encoded)

#### Пример запроса:

```
GET /api/images/thumbnail/users/123456/photo.jpg
```

### 3. Получение информации о фотографии

```
GET /api/images/info/:photoPath
```

#### Параметры:

- `photoPath` - Путь к фотографии (URL-encoded)

#### Пример запроса:

```
GET /api/images/info/users/123456/photo.jpg
```

#### Пример ответа:

```json
{
  "status": "success",
  "data": {
    "width": 800,
    "height": 600,
    "format": "webp",
    "size": 52428,
    "url": "https://api.yourappname.com/uploads/users/123456/photo.jpg"
  }
}
```

## Особенности

1. Все изображения автоматически конвертируются в формат WebP
2. Размер и качество изображения оптимизируются в зависимости от указанного типа
3. Поддерживаются форматы: JPEG, PNG, GIF, WEBP, HEIC, HEIF
4. Для каждого типа изображения применяются оптимальные настройки сжатия

## Примеры использования в приложении

### Получение фотографии профиля:

```javascript
const profileImageUrl = `${apiBaseUrl}/api/images/users/${userId}/${photoFileName}?imageType=profile`;
```

### Получение миниатюры:

```javascript
const thumbnailUrl = `${apiBaseUrl}/api/images/thumbnail/users/${userId}/${photoFileName}`;
```

### Получение информации о фотографии:

```javascript
fetch(`${apiBaseUrl}/api/images/info/users/${userId}/${photoFileName}`)
  .then(response => response.json())
  .then(data => console.log(data));
``` 