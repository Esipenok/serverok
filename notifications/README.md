# Система уведомлений Willowe

## Обзор

Система уведомлений Willowe поддерживает несколько типов уведомлений для различных функций приложения. Все уведомления сохраняются в Firebase Realtime Database и управляются через единый сервис.

## Типы уведомлений

### 1. Лайки (`like_counter`)
- **Описание**: Счетчик лайков с возможностью увеличения/уменьшения
- **Структура**: Одно уведомление на пользователя с счетчиком
- **Управление**: Увеличивается при новом лайке, уменьшается при отмене

### 2. One Night (`one_night_counter`)
- **Описание**: Счетчик приглашений на одну ночь
- **Структура**: Одно уведомление на пользователя с счетчиком
- **Управление**: Увеличивается при приглашении, уменьшается при ответе/отмене

### 3. Fast Match (`fast_match`)
- **Описание**: Отдельные уведомления для каждого приглашения на быструю встречу
- **Структура**: Отдельное уведомление для каждого приглашения
- **Время жизни**: 10 минут (автоматическое удаление)
- **Управление**: Создается при приглашении, удаляется при ответе или истечении времени

### 4. Fast Match мэтчи (`match`)
- **Описание**: Уведомления о новых мэтчах в fast match
- **Структура**: Отдельное уведомление для каждого мэтча
- **Управление**: Создается при создании мэтча между пользователями
- **Получатели**: Оба пользователя получают уведомления о мэтче

### 5. Мэтчи (`match`)
- **Описание**: Уведомления о новых мэтчах
- **Структура**: Отдельное уведомление для каждого мэтча
- **Управление**: Создается при создании мэтча

## Основные методы

### Общие методы
- `getUserNotifications(userId)` - Получение всех уведомлений пользователя
- `markAsRead(userId, notificationId)` - Отметка уведомления как прочитанного
- `deleteNotification(userId, notificationId)` - Удаление уведомления
- `sendNotification(targetUserId, type, title, body, data)` - Отправка общего уведомления

### Лайки
- `sendLikeNotification(targetUserId)` - Отправка/увеличение счетчика лайков
- `decrementLikeCounter(userId)` - Уменьшение счетчика лайков

### One Night
- `sendOneNightNotification(targetUserId)` - Отправка/увеличение счетчика one night
- `decrementOneNightCounter(userId)` - Уменьшение счетчика one night

### Fast Match
- `sendFastMatchNotification(targetUserId, senderData, requestId)` - Отправка уведомления о fast match
- `scheduleFastMatchNotificationDeletion(userId, notificationId, delayMs)` - Планирование автоматического удаления
- `deleteFastMatchNotificationByRequestId(userId, requestId)` - Удаление по ID запроса

### Мэтчи
- `sendMatchNotification(targetUserId, matchData)` - Отправка уведомления о мэтче

## Интеграция с контроллерами

### Лайки
```javascript
// При лайке
await notificationService.sendLikeNotification(targetUserId);

// При отмене лайка
await notificationService.decrementLikeCounter(targetUserId);
```

### One Night
```javascript
// При создании приглашения
await notificationService.sendOneNightNotification(userId2);

// При ответе на приглашение
await notificationService.decrementOneNightCounter(userId2);

// При отмене приглашения
await notificationService.decrementOneNightCounter(userId2);
```

### Fast Match
```javascript
// При создании приглашения
const senderData = {
  userId: sender.userId,
  name: sender.name,
  photoUrl: sender.photos[0]
};
await notificationService.sendFastMatchNotification(user_second, senderData, fastMatch._id.toString());

// При ответе на приглашение
await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());

// При отмене приглашения
await notificationService.deleteFastMatchNotificationByRequestId(fastMatch.user_second, fastMatch._id.toString());
```

### Мэтчи
```javascript
// При создании мэтча
const matchData = {
  userId: otherUser.userId,
  name: otherUser.name,
  photoUrl: otherUser.photos[0]
};
await notificationService.sendMatchNotification(targetUserId, matchData);
```

## Структура данных

### Firebase Realtime Database
```
/notifications/{userId}/{notificationId}
```

### Общая структура уведомления
```json
{
  "type": "notification_type",
  "title": "Заголовок уведомления",
  "body": "Текст уведомления",
  "data": {
    // Специфичные данные для типа уведомления
  },
  "timestamp": 1640995200000,
  "read": false
}
```

## Оптимизация производительности

### Fast Match уведомления
- Использование `setTimeout` вместо cron jobs
- Минимальная нагрузка на систему
- Автоматическое удаление через 10 минут
- Проверка существования перед удалением

### Счетчики (Лайки, One Night)
- Одно уведомление на пользователя
- Увеличение/уменьшение счетчика
- Автоматическое удаление при счетчике = 0

### Обработка ошибок
- Graceful handling всех ошибок
- Логирование ошибок без блокировки основного функционала
- Продолжение работы приложения даже при сбоях уведомлений

## Тестирование

### Тестовые файлы
- `tests/test-one-night-notification.js` - Тестирование one night уведомлений
- `tests/test-fast-match-notification.js` - Тестирование fast match приглашений
- `tests/test-fast-match-match-notification.js` - Тестирование уведомлений о мэтчах в fast match

### Запуск тестов
```bash
node tests/test-one-night-notification.js
node tests/test-fast-match-notification.js
node tests/test-fast-match-match-notification.js
```

## Документация

- `one-night-notifications.md` - Подробная документация по one night уведомлениям
- `fast-match-notifications.md` - Подробная документация по fast match уведомлениям

## Конфигурация

### Firebase URL
Устанавливается в конструкторе `NotificationService`:
```javascript
this.firebaseUrl = 'https://willowe-139e2-default-rtdb.europe-west1.firebasedatabase.app';
```

### Временные настройки
- Fast Match: 10 минут (600,000 мс)
- Автоматическое удаление: планируется при создании уведомления

## Мониторинг

### Логирование
Все операции логируются в консоль:
- Создание уведомлений
- Удаление уведомлений
- Ошибки операций
- Автоматические действия

### Отладка
Для отладки можно использовать тестовые файлы или проверить Firebase Realtime Database напрямую. 