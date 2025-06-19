# Защита от инъекций в MongoDB

## Обзор

В этом документе описаны меры защиты от NoSQL инъекций, реализованные в проекте. NoSQL инъекции — это тип атаки, при котором злоумышленник может манипулировать запросами к базе данных MongoDB, чтобы получить несанкционированный доступ к данным или выполнить вредоносные операции.

## Реализованные меры защиты

### 1. Middleware для защиты от инъекций

В файле `server/middleware/validation.middleware.js` реализован middleware `protectFromInjection`, который:

- Проверяет query-параметры на наличие потенциально опасных конструкций
- Санитизирует тело запроса, экранируя специальные символы
- Блокирует запросы с подозрительными параметрами

Этот middleware автоматически применяется ко всем маршрутам через `app.use(protectFromInjection)` в `app.js`.

### 2. Утилиты для безопасной работы с MongoDB

В файле `server/utils/mongo-safety.js` реализованы утилиты для безопасной работы с MongoDB:

- `createSafeQuery` - создает безопасный объект запроса, фильтруя разрешенные поля
- `createSafeUpdate` - создает безопасный объект обновления, удаляя операторы MongoDB
- `createSafeOptions` - создает безопасные опции для запросов, ограничивая возможности сортировки и пагинации
- `createSafeId` - проверяет и санитизирует ID для безопасного использования в запросах

### 3. Валидация входных данных

Реализованы дополнительные middleware для валидации входных данных:

- `validateMongoId` - проверяет валидность MongoDB ObjectId
- `validateUserId` - проверяет валидность userId

## Примеры использования

### Пример 1: Безопасный запрос к базе данных

```javascript
const { createSafeQuery, createSafeOptions } = require('../../utils/mongo-safety');

// Создаем безопасный объект запроса
const query = createSafeQuery(req.query);

// Создаем безопасные опции
const options = createSafeOptions({
  limit: req.query.limit,
  skip: req.query.skip,
  sort: { createdAt: req.query.sort || 'desc' }
});

// Выполняем запрос с безопасными параметрами
const users = await User.find(query)
  .limit(options.limit || 10)
  .skip(options.skip || 0)
  .sort(options.sort || { createdAt: -1 });
```

### Пример 2: Безопасное обновление документа

```javascript
const { createSafeUpdate, createSafeId } = require('../../utils/mongo-safety');

// Проверяем ID
const userId = createSafeId(req.params.userId);
if (!userId) {
  return res.status(400).json({
    status: 'fail',
    message: 'Недопустимый формат userId'
  });
}

// Создаем безопасный объект обновления
const updateData = createSafeUpdate(req.body);

// Выполняем обновление
const user = await User.findOneAndUpdate(
  { userId },
  updateData,
  { new: true }
);
```

## Дополнительные рекомендации

1. **Всегда используйте проекцию полей**: Указывайте точно, какие поля нужно вернуть из базы данных
2. **Ограничивайте результаты запросов**: Используйте limit для ограничения количества возвращаемых документов
3. **Используйте параметризованные запросы**: Не формируйте запросы конкатенацией строк
4. **Проверяйте типы данных**: Всегда проверяйте и приводите типы данных перед использованием в запросах

## Тестирование защиты

Для проверки эффективности защиты можно попробовать выполнить следующие атаки:

1. Отправить запрос с операторами MongoDB в параметрах: `?name[$ne]=test`
2. Попытаться внедрить JavaScript-код: `?query={"$where": "sleep(1000)"}`
3. Попытаться использовать оператор $regex для DoS-атаки: `?name[$regex]=^(a+)+$` 