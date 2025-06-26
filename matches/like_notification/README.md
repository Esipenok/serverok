# Система счетчиков лайков (Firebase)

Упрощенная система для отправки уведомлений о лайках с использованием счетчиков, хранящихся в Firebase Realtime Database.

## Как это работает

1. **Первый лайк**: Создается запись в Firebase `/like_counters/{userId}` с `count: 1`
2. **Последующие лайки**: Счетчик увеличивается на +1, отправляется уведомление с обновленным количеством
3. **Уведомления**: Отправляются в Firebase `/notifications/{userId}` с типом `like_counter`

## Структура данных в Firebase

### Счетчики лайков
```
/like_counters/{userId}
{
  "count": 5,
  "lastUpdated": 1234567890
}
```

### Уведомления
```
/notifications/{userId}
{
  "type": "like_counter",
  "title": "Новый лайк!" | "Новые лайки!",
  "body": "Кто-то поставил вам лайк" | "5 человек поставили вам лайк",
  "data": {
    "likeCount": 5,
    "timestamp": 1234567890
  },
  "timestamp": 1234567890,
  "read": false
}
```

## API Endpoints

### Получить количество лайков
```
GET /api/like-counter/:userId
```

### Сбросить счетчик лайков
```
POST /api/like-counter/:userId/reset
```

### Удалить счетчик лайков
```
DELETE /api/like-counter/:userId
```

## Интеграция

Система автоматически интегрирована в `match.controller.js`. При лайке пользователя:

- Если образуется мэтч → отправляется уведомление о мэтче
- Если мэтч не образуется → вызывается `likeCounterService.incrementLikeCounter(targetUserId)`

## Использование

```javascript
const { likeCounterService } = require('../like_notification');

// Увеличить счетчик лайков
await likeCounterService.incrementLikeCounter(userId);

// Получить количество лайков
const count = await likeCounterService.getLikeCount(userId);

// Сбросить счетчик
await likeCounterService.resetLikeCounter(userId);
```

## Преимущества

- ✅ Простота: нет дополнительных моделей в MongoDB
- ✅ Производительность: прямое обновление в Firebase
- ✅ Масштабируемость: Firebase автоматически обрабатывает нагрузку
- ✅ Реальное время: мгновенные обновления счетчиков 