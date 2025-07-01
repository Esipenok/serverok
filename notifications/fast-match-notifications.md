# Система уведомлений Fast Match

## Обзор

Система уведомлений для приглашений на быстрые встречи (fast match) создает отдельное уведомление для каждого приглашения и автоматически удаляет его через 10 минут, если пользователь не ответил.

## Тип уведомления

- **Тип**: `fast_match`
- **Время жизни**: 10 минут (автоматическое удаление)

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
```

### Отмена приглашения (`deleteFastMatch`)

```javascript
// При отмене приглашения
await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());
```

## Структура уведомления

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

## Сценарии использования

### 1. Новое приглашение
- Пользователь 1 приглашает пользователя 2 на быструю встречу
- Система создает уведомление для пользователя 2
- Планируется автоматическое удаление через 10 минут

### 2. Принятие приглашения
- Пользователь 2 принимает приглашение
- Система немедленно удаляет уведомление
- Создается матч между пользователями

### 3. Отказ от приглашения
- Пользователь 2 отказывается от приглашения
- Система немедленно удаляет уведомление
- Пользователи добавляются в excludedUsers

### 4. Отмена приглашения
- Пользователь 1 отменяет приглашение
- Система немедленно удаляет уведомление
- Пользователи НЕ добавляются в excludedUsers

### 5. Автоматическое истечение
- Проходит 10 минут без ответа
- Система автоматически удаляет уведомление
- Запись fast match также удаляется из базы данных

## Оптимизация производительности

### Использование setTimeout вместо cron
- Минимальная нагрузка на систему
- Каждое уведомление планирует свое собственное удаление
- Нет необходимости в фоновых процессах

### Проверка существования перед удалением
- Система проверяет, существует ли уведомление перед удалением
- Избегает ошибок при повторном удалении
- Graceful handling ошибок

### Обработка ошибок
- Все методы уведомлений обрабатывают ошибки gracefully
- Ошибки логируются, но не блокируют основной функционал
- Основная логика приложения продолжает работать

## Тестирование

Для тестирования системы используйте файл `tests/test-fast-match-notification.js`:

```bash
node tests/test-fast-match-notification.js
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
- `expiresAt` - время истечения (timestamp + 10 минут)
- Автоматическое удаление происходит через 10 минут после создания 