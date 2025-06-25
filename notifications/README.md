# Система уведомлений

## Описание
Система уведомлений отправляет push-уведомления в Firebase Realtime Database при различных событиях в приложении.

## Структура данных в Firebase

Уведомления сохраняются в следующей структуре:
```
notifications/
  {userId}/
    {notificationId}/
      {
        "type": "match|like|message",
        "title": "Заголовок уведомления",
        "body": "Текст уведомления",
        "data": {
          "userId": "id_пользователя",
          "name": "имя_пользователя",
          "photoUrl": "url_аватара"
        },
        "timestamp": 1234567890,
        "read": false
      }
```

## Типы уведомлений

### 1. Match (Мэтч)
Отправляется при образовании взаимного мэтча между пользователями.

**Данные:**
- `type`: "match"
- `title`: "Новый мэтч!"
- `body`: "У вас новый мэтч с {name}"
- `data.userId`: ID сматченного пользователя
- `data.name`: Имя сматченного пользователя
- `data.photoUrl`: URL аватара сматченного пользователя

### 2. Like (Лайк)
Отправляется при получении лайка от другого пользователя.

**Данные:**
- `type`: "like"
- `title`: "Новый лайк!"
- `body`: "{name} поставил вам лайк"
- `data.userId`: ID пользователя, который поставил лайк
- `data.name`: Имя пользователя, который поставил лайк
- `data.photoUrl`: URL аватара пользователя

### 3. Message (Сообщение)
Отправляется при получении нового сообщения.

**Данные:**
- `type`: "message"
- `title`: "Новое сообщение от {name}"
- `body`: Превью сообщения
- `data.userId`: ID отправителя
- `data.name`: Имя отправителя
- `data.photoUrl`: URL аватара отправителя
- `data.messagePreview`: Превью сообщения

## Использование

### Отправка уведомления о мэтче
```javascript
const notificationService = require('./notifications/notification.service');

const matchedUserData = {
  userId: 'user123',
  name: 'Анна',
  photoUrl: 'https://example.com/photo.jpg'
};

await notificationService.sendMatchNotification('targetUserId', matchedUserData);
```

### Отправка уведомления о лайке
```javascript
const likerData = {
  userId: 'user456',
  name: 'Михаил',
  photoUrl: 'https://example.com/photo2.jpg'
};

await notificationService.sendLikeNotification('targetUserId', likerData);
```

### Отправка уведомления о сообщении
```javascript
const senderData = {
  userId: 'user789',
  name: 'Елена',
  photoUrl: 'https://example.com/photo3.jpg'
};

await notificationService.sendMessageNotification('targetUserId', senderData, 'Привет! Как дела?');
```

## Интеграция с контроллерами

### Мэтчи
В `willowe/matches/controllers/match.controller.js` добавлена логика отправки уведомлений при образовании мэтча.

### Лайки
Для отправки уведомлений о лайках нужно добавить вызов в соответствующий контроллер.

### Сообщения
Для отправки уведомлений о сообщениях нужно добавить вызов в контроллер сообщений.

## Тестирование

Для тестирования системы уведомлений используйте файл `test-notification.js`:

```bash
node notifications/test-notification.js
```

## Обработка ошибок

Система уведомлений обрабатывает ошибки следующим образом:
- Если Firebase недоступен, уведомление не отправляется
- Ошибки логируются в консоль
- Основной функционал приложения не блокируется при ошибках уведомлений

## Безопасность

- Уведомления отправляются только авторизованным пользователям
- Данные пользователей передаются только в зашифрованном виде
- Firebase URL защищен настройками безопасности Firebase 