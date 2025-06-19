# Улучшения безопасности: Заголовки безопасности и HTTPS

## 1. Заголовки безопасности

В файле `server/security/config.js` мы настроили расширенные заголовки безопасности с помощью Helmet:

### Content-Security-Policy (CSP)
Определяет, откуда могут загружаться ресурсы:
- `defaultSrc: ["'self'"]` - по умолчанию ресурсы могут загружаться только с того же источника
- `scriptSrc` - разрешает скрипты с определенных источников
- `styleSrc` - разрешает стили с определенных источников
- `imgSrc` - разрешает изображения с определенных источников
- `upgradeInsecureRequests: true` - автоматически обновляет HTTP до HTTPS

### Cross-Origin Policies
- `crossOriginEmbedderPolicy: { policy: "credentialless" }` - менее строгий режим для мобильных API
- `crossOriginOpenerPolicy: { policy: "same-origin" }` - окна могут взаимодействовать только с того же источника
- `crossOriginResourcePolicy: { policy: "cross-origin" }` - разрешает загрузку ресурсов с других источников

### HTTP Strict Transport Security (HSTS)
- `maxAge: 31536000` - браузер должен использовать HTTPS в течение 1 года
- `includeSubDomains: true` - включает поддомены
- `preload: true` - включает предварительную загрузку

### Другие заголовки безопасности
- `hidePoweredBy: true` - скрывает информацию о сервере
- `noSniff: true` - предотвращает MIME-sniffing
- `referrerPolicy: { policy: "strict-origin-when-cross-origin" }` - ограничивает информацию о реферере
- `xssFilter: true` - защита от XSS-атак
- `noCache: true` - запрещает кэширование для API-запросов

## 2. HTTPS для всех соединений

В файле `server/middleware/https.middleware.js` мы реализовали middleware для обеспечения HTTPS:

### redirectToHttps
- Перенаправляет HTTP-запросы на HTTPS в production-режиме
- Проверяет заголовок `x-forwarded-proto` для работы за прокси

### addHstsHeader
- Добавляет заголовок HSTS для принудительного использования HTTPS
- Настраивает параметры HSTS для максимальной безопасности

## 3. Certificate Pinning (на стороне клиента)

В файле `lib/services/network/certificate_pinning.dart` мы реализовали Certificate Pinning для Flutter:

### Как это работает
1. Мы храним хеши публичных ключей сертификатов, которым доверяем
2. При каждом HTTPS-соединении проверяем, соответствует ли сертификат сервера одному из доверенных хешей
3. Если сертификат не соответствует, соединение прерывается

### Преимущества
- Защита от поддельных сертификатов (даже если они подписаны доверенным CA)
- Защита от атак man-in-the-middle
- Защита от компрометации CA

### Как обновить хеши сертификатов
Для получения хеша сертификата используйте метод `CertificatePinningHttpClient.getCertificateHashForDomain`:

```dart
final hash = await CertificatePinningHttpClient.getCertificateHashForDomain('your-api-domain.com');
print('Certificate hash: $hash');
```

## Интеграция с мобильным приложением

### На стороне сервера
- Все заголовки безопасности настроены автоматически
- HTTPS принудительно используется в production-режиме
- Никаких дополнительных действий не требуется

### На стороне клиента
1. Используйте `ApiService` для всех запросов к API
2. Инициализируйте сервис при запуске приложения:
   ```dart
   final apiService = ApiService();
   await apiService.initialize();
   ```
3. Используйте методы сервиса для запросов:
   ```dart
   final response = await apiService.get('users/profile');
   ```

## Тестирование безопасности

### Заголовки безопасности
Проверьте заголовки безопасности с помощью [Security Headers](https://securityheaders.com/)

### HTTPS
Проверьте настройки HTTPS с помощью [SSL Labs](https://www.ssllabs.com/ssltest/)

### Certificate Pinning
1. Измените хеш в `_pinnedCertificateHashes` на неправильный
2. Убедитесь, что запросы к API не проходят 