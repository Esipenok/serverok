# Система уведомлений (Firebase)

Упрощенная система для отправки уведомлений в Firebase Realtime Database. Вся логика подсчета лайков происходит в Firebase через Cloud Functions.

## Как это работает

1. **Сервер**: Отправляет простое уведомление с `likeCount: 1`
2. **Firebase Cloud Function**: Автоматически подсчитывает лайки и обновляет счетчик
3. **Клиент**: Получает актуальный счетчик из последнего уведомления типа `like_counter`

## Структура данных в Firebase

### Уведомления
```
/notifications/{userId}
{
  "type": "like_counter" | "match" | "message",
  "title": "Новый лайк!" | "Новый мэтч!" | "Новое сообщение",
  "body": "Кто-то поставил вам лайк",
  "data": {
    "likeCount": 1, // для like_counter
    "userId": "user123", // для match/message
    "name": "Имя пользователя",
    "photoUrl": "https://...",
    "timestamp": 1234567890
  },
  "timestamp": 1234567890,
  "read": false
}
```

## API Methods

### Отправка уведомления о лайке
```javascript
await notificationService.sendLikeNotification(targetUserId);
```

### Отправка уведомления о мэтче
```javascript
await notificationService.sendMatchNotification(targetUserId, {
  userId: 'user123',
  name: 'Имя пользователя',
  photoUrl: 'https://...'
});
```

### Отправка общего уведомления
```javascript
await notificationService.sendNotification(
  targetUserId,
  'custom_type',
  'Заголовок',
  'Текст уведомления',
  { customData: 'value' }
);
```

### Получение уведомлений пользователя
```javascript
const notifications = await notificationService.getUserNotifications(userId);
```

### Отметка как прочитанное
```javascript
await notificationService.markAsRead(userId, notificationId);
```

### Удаление уведомления
```javascript
await notificationService.deleteNotification(userId, notificationId);
```

## Cloud Function для подсчета лайков

Для автоматического подсчета лайков нужно создать Cloud Function в Firebase:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.aggregateLikeCounter = functions.database
  .ref('/notifications/{userId}/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const { userId, notificationId } = context.params;
    const newNotification = snapshot.val();

    if (!newNotification || newNotification.type !== 'like_counter') {
      return null;
    }

    const notificationsRef = admin.database().ref(`/notifications/${userId}`);
    const notificationsSnap = await notificationsRef.once('value');
    const notifications = notificationsSnap.val();

    let lastLikeKey = null;
    let lastLikeTimestamp = 0;

    // Ищем последнее уведомление типа like_counter
    for (const [key, notif] of Object.entries(notifications || {})) {
      if (
        key !== notificationId &&
        notif.type === 'like_counter' &&
        notif.timestamp > lastLikeTimestamp
      ) {
        lastLikeTimestamp = notif.timestamp;
        lastLikeKey = key;
      }
    }

    if (lastLikeKey) {
      const lastLikeNotif = notifications[lastLikeKey];
      const prevCount = lastLikeNotif.data?.likeCount || 1;

      // Обновляем новый notification
      await notificationsRef.child(notificationId).update({
        'data/likeCount': prevCount + 1,
        title: prevCount + 1 === 1 ? 'Новый лайк!' : 'Новые лайки!',
        body: prevCount + 1 === 1 ? 'Кто-то поставил вам лайк' : `${prevCount + 1} человек поставили вам лайк`
      });

      // Удаляем старое уведомление
      await notificationsRef.child(lastLikeKey).remove();
    }

    return null;
  });
```

## Интеграция в контроллере

В `match.controller.js`:

```javascript
// При лайке (если нет мэтча)
notificationService.sendLikeNotification(targetUserId)
  .catch(error => {
    console.error('Ошибка отправки уведомления о лайке:', error);
  });

// При мэтче
notificationService.sendMatchNotification(otherUserId, {
  userId: currentUser.userId,
  name: currentUser.name,
  photoUrl: currentUserPhotoUrl
});
```

## Преимущества новой архитектуры

- ✅ **Простота**: Сервер только отправляет уведомления
- ✅ **Производительность**: Подсчет происходит в Firebase
- ✅ **Масштабируемость**: Cloud Functions автоматически масштабируются
- ✅ **Консистентность**: Всегда актуальный счетчик
- ✅ **Реальное время**: Мгновенные обновления

## Автоматическая очистка

Уведомления автоматически удаляются через 30 дней после последнего обновления благодаря TTL индексу в MongoDB.

## Логирование

Все операции логируются в консоль для отладки и мониторинга. 