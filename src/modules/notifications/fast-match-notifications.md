# Система уведомлений Fast Match

## Обзор

Система уведомлений для приглашений на быстрые встречи (fast match) создает отдельное уведомление для каждого приглашения и автоматически удаляет его через 10 минут, если пользователь не ответил. При создании мэтча отправляются уведомления о мэтче обоим пользователям.

## Типы уведомлений

### 1. Fast Match приглашения (`fast_match`)
- **Описание**: Отдельные уведомления для каждого приглашения на быструю встречу
- **Структура**: Отдельное уведомление для каждого приглашения
- **Время жизни**: 10 минут (автоматическое удаление)
- **Управление**: Создается при приглашении, удаляется при ответе или истечении времени

### 2. Fast Match мэтчи (`match`)
- **Описание**: Уведомления о новых мэтчах в fast match
- **Структура**: Отдельное уведомление для каждого мэтча
- **Управление**: Создается при создании мэтча между пользователями
- **Получатели**: Оба пользователя получают уведомления о мэтче

## Методы API

### 1. sendFastMatchNotification(targetUserId, senderData, requestId)

Отправляет уведомление о приглашении на быструю встречу.

**Параметры:**
- `targetUserId` (string) - ID пользователя, которому отправляется уведомление
- `senderData` (object) - Данные отправителя:
  - `userId` (string) - ID отправителя
  - `name` (string) - Имя отправителя
  - `photoUrl` (string) - URL фото отправителя
- `requestId` (string) - ID запроса fast match

**Логика:**
- Создает новое уведомление типа `fast_match`
- Планирует автоматическое удаление через 10 минут
- Сохраняет данные отправителя и requestId

**Пример использования:**
```javascript
const notificationService = require('./notifications/notification.service');

const senderData = {
  userId: 'user123',
  name: 'Анна',
  photoUrl: 'https://example.com/photo.jpg'
};

await notificationService.sendFastMatchNotification('targetUser456', senderData, 'request789');
```

### 2. scheduleFastMatchNotificationDeletion(userId, notificationId, delayMs)

Планирует автоматическое удаление fast match уведомления через указанное время.

**Параметры:**
- `userId` (string) - ID пользователя
- `notificationId` (string) - ID уведомления
- `delayMs` (number) - Задержка в миллисекундах (по умолчанию 10 минут)

**Логика:**
- Использует `setTimeout` для планирования удаления
- Проверяет существование уведомления перед удалением
- Автоматически вызывается при создании уведомления

### 3. deleteFastMatchNotificationByRequestId(userId, requestId)

Удаляет fast match уведомление по ID запроса.

**Параметры:**
- `userId` (string) - ID пользователя
- `requestId` (string) - ID запроса fast match

**Логика:**
- Ищет уведомление типа `fast_match` с указанным `requestId`
- Удаляет найденное уведомление
- Используется при ответе на приглашение или отмене

**Пример использования:**
```javascript
await notificationService.deleteFastMatchNotificationByRequestId('user456', 'request789');
```

### 4. sendMatchNotification(targetUserId, matchData)

Отправляет уведомление о мэтче (используется для fast match мэтчей).

**Параметры:**
- `targetUserId` (string) - ID пользователя, которому отправляется уведомление
- `matchData` (object) - Данные о мэтче:
  - `userId` (string) - ID пользователя, с которым произошел мэтч
  - `name` (string) - Имя пользователя
  - `photoUrl` (string) - URL фото пользователя

## Интеграция с Fast Match контроллером

### Создание приглашения (`createFastMatch`)

```javascript
// После создания fast match записи
const sender = await User.findOne({ userId: user_first }).select('userId name photos');

if (sender) {
  const senderData = {
    userId: sender.userId,
    name: sender.name || 'Пользователь',
    photoUrl: sender.photos && sender.photos.length > 0 ? sender.photos[0] : null
  };
  
  await notificationService.sendFastMatchNotification(user_second, senderData, fastMatch._id.toString());
}
```

### Ответ на приглашение (`acceptFastMatch`)

```javascript
// При любом ответе на приглашение (принятие или отказ)
await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());

// При создании мэтча отправляем уведомления о мэтче обоим пользователям
if (isNewMatch) {
  const [user1Info, user2Info] = await Promise.all([
    User.findOne({ userId: actualUserFirst }).select('userId name photos'),
    User.findOne({ userId: actualUserSecond }).select('userId name photos')
  ]);
  
  if (user1Info && user2Info) {
    const user1Data = {
      userId: user1Info.userId,
      name: user1Info.name || 'Пользователь',
      photoUrl: user1Info.photos && user1Info.photos.length > 0 ? user1Info.photos[0] : null
    };
    
    const user2Data = {
      userId: user2Info.userId,
      name: user2Info.name || 'Пользователь',
      photoUrl: user2Info.photos && user2Info.photos.length > 0 ? user2Info.photos[0] : null
    };
    
    await Promise.all([
      notificationService.sendMatchNotification(actualUserSecond, user1Data),
      notificationService.sendMatchNotification(actualUserFirst, user2Data)
    ]);
  }
}
```

### Отмена приглашения (`deleteFastMatch`)

```javascript
// При отмене приглашения
await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());
```

## Структура уведомлений

### Fast Match приглашение
```json
{
  "type": "fast_match",
  "title": "Новое приглашение на быструю встречу!",
  "body": "Анна приглашает вас на быструю встречу",
  "data": {
    "requestId": "request789",
    "senderId": "user123",
    "senderName": "Анна",
    "senderPhotoUrl": "https://example.com/photo.jpg",
    "timestamp": 1640995200000,
    "expiresAt": 1640995800000
  },
  "timestamp": 1640995200000,
  "read": false
}
```

### Fast Match мэтч
```json
{
  "type": "match",
  "title": "Новый мэтч!",
  "body": "Анна понравился вам!",
  "data": {
    "userId": "user123",
    "name": "Анна",
    "photoUrl": "https://example.com/photo.jpg",
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000,
  "read": false
}
```

## Сценарии использования

### 1. Новое приглашение
- Пользователь 1 приглашает пользователя 2 на быструю встречу
- Система создает уведомление типа `fast_match` для пользователя 2
- Планируется автоматическое удаление через 10 минут

### 2. Принятие приглашения (создание мэтча)
- Пользователь 2 принимает приглашение
- Система удаляет уведомление типа `fast_match`
- Создается мэтч между пользователями
- Оба пользователя получают уведомления типа `match`

### 3. Отказ от приглашения
- Пользователь 2 отказывается от приглашения
- Система удаляет уведомление типа `fast_match`
- Пользователи добавляются в excludedUsers
- Уведомления о мэтче НЕ отправляются

### 4. Отмена приглашения
- Пользователь 1 отменяет приглашение
- Система удаляет уведомление типа `fast_match`
- Пользователи НЕ добавляются в excludedUsers
- Уведомления о мэтче НЕ отправляются

### 5. Автоматическое истечение
- Проходит 10 минут без ответа
- Система автоматически удаляет уведомление типа `fast_match`
- Запись fast match также удаляется из базы данных
- Уведомления о мэтче НЕ отправляются

## Оптимизация производительности

### Fast Match уведомления
- Использование `setTimeout` вместо cron jobs
- Минимальная нагрузка на систему
- Автоматическое удаление через 10 минут
- Проверка существования перед удалением

### Уведомления о мэтчах
- Отправка уведомлений обоим пользователям одновременно
- Использование `Promise.all` для параллельной отправки
- Graceful handling ошибок

### Обработка ошибок
- Все методы уведомлений обрабатывают ошибки gracefully
- Ошибки логируются, но не блокируют основной функционал
- Основная логика приложения продолжает работать

## Тестирование

### Тестовые файлы
- `tests/test-fast-match-notification.js` - Тестирование fast match приглашений
- `tests/test-fast-match-match-notification.js` - Тестирование уведомлений о мэтчах

### Запуск тестов
```bash
node tests/test-fast-match-notification.js
node tests/test-fast-match-match-notification.js
```

## Firebase структура

Уведомления сохраняются в Firebase Realtime Database по пути:
```
/notifications/{userId}/{notificationId}
```

Где:
- `{userId}` - ID пользователя
- `{notificationId}` - автоматически генерируемый ID уведомления

## Временные метки

- `timestamp` - время создания уведомления
- `expiresAt` - время истечения (только для fast_match, timestamp + 10 минут)
- Автоматическое удаление происходит через 10 минут после создания (только для fast_match) 