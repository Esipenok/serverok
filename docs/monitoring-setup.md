# Система мониторинга Dating App

## Обзор

Система мониторинга включает в себя:
- **Prometheus** - сбор и хранение метрик
- **Grafana** - визуализация метрик через дашборды
- **Экспортеры** - сбор метрик с различных сервисов
- **Node.js метрики** - бизнес-метрики приложения

## Компоненты

### 1. Prometheus
- **Порт**: 9090
- **URL**: http://localhost:9090
- **Функции**: Сбор, хранение и запрос метрик

### 2. Grafana
- **Порт**: 3001
- **URL**: http://localhost:3001
- **Логин**: admin/admin123
- **Функции**: Визуализация метрик через дашборды

### 3. Экспортеры

#### Redis Exporter
- **Порт**: 9121
- **URL**: http://localhost:9121/metrics
- **Метрики**: Использование памяти, команды, подключения

#### Kafka Exporter
- **Порт**: 9308
- **URL**: http://localhost:9308/metrics
- **Метрики**: Сообщения, лаг консьюмеров, топики

#### Node Exporter
- **Порт**: 9100
- **URL**: http://localhost:9100/metrics
- **Метрики**: CPU, память, диск, сеть

## Запуск

### Автоматический запуск
```bash
chmod +x scripts/start-monitoring.sh
./scripts/start-monitoring.sh
```

### Ручной запуск
```bash
# Запуск всех сервисов мониторинга
docker-compose -f docker-compose.zero-downtime.yml up -d prometheus grafana redis-exporter kafka-exporter node-exporter

# Проверка статуса
docker-compose -f docker-compose.zero-downtime.yml ps
```

## Дашборды Grafana

### 1. Dating App Overview
- **Описание**: Общий обзор приложения
- **Метрики**: HTTP запросы, время ответа, активные пользователи, матчи
- **Обновление**: каждые 10 секунд

### 2. Redis Monitoring
- **Описание**: Мониторинг Redis
- **Метрики**: Использование памяти, команды, hit rate
- **Обновление**: каждые 10 секунд

### 3. Kafka Monitoring
- **Описание**: Мониторинг Kafka
- **Метрики**: Сообщения, лаг консьюмеров, топики
- **Обновление**: каждые 10 секунд

### 4. System Monitoring
- **Описание**: Системные метрики
- **Метрики**: CPU, память, диск, сеть
- **Обновление**: каждые 10 секунд

## Метрики приложения

### HTTP метрики
- `http_requests_total` - общее количество HTTP запросов
- `http_request_duration_seconds` - время выполнения запросов

### Бизнес метрики
- `active_users_total` - количество активных пользователей
- `matches_total` - общее количество матчей
- `fast_matches_total` - количество fast matches
- `one_night_total` - количество one night событий
- `market_profiles_total` - количество market профилей

### Kafka метрики
- `kafka_messages_produced_total` - количество отправленных сообщений
- `kafka_messages_consumed_total` - количество полученных сообщений

## Настройка алертов

### Prometheus Rules
Создайте файл `prometheus/rules.yml`:

```yaml
groups:
  - name: dating-app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Высокий уровень ошибок"
          description: "{{ $value }} ошибок в секунду"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Высокое время ответа"
          description: "95-й процентиль времени ответа: {{ $value }}s"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Высокое использование памяти Redis"
          description: "Использование памяти: {{ $value | humanizePercentage }}"
```

### Grafana Alerts
Настройте алерты в Grafana:
1. Откройте дашборд
2. Нажмите на панель
3. Перейдите в "Alert" tab
4. Настройте условия алерта

## Полезные запросы Prometheus

### Топ-5 самых медленных эндпоинтов
```promql
topk(5, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```

### Количество ошибок по кодам
```promql
rate(http_requests_total{status_code=~"4..|5.."}[5m])
```

### Использование памяти Redis
```promql
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

### Лаг Kafka консьюмеров
```promql
kafka_consumer_group_lag
```

## Устранение неполадок

### Prometheus не собирает метрики
1. Проверьте конфигурацию в `prometheus/prometheus.yml`
2. Убедитесь, что экспортеры доступны
3. Проверьте логи: `docker logs dating_app_prometheus`

### Grafana не подключается к Prometheus
1. Проверьте настройки datasource в `grafana/provisioning/datasources/`
2. Убедитесь, что Prometheus запущен
3. Проверьте сетевую связность

### Метрики приложения недоступны
1. Проверьте endpoint `/metrics` на порту 3000
2. Убедитесь, что middleware подключен
3. Проверьте логи приложения

## Масштабирование

### Горизонтальное масштабирование
Для масштабирования мониторинга:
1. Добавьте несколько экземпляров Prometheus
2. Настройте Grafana для работы с несколькими источниками данных
3. Используйте load balancer для экспортеров

### Вертикальное масштабирование
Для увеличения производительности:
1. Увеличьте ресурсы контейнеров в docker-compose
2. Настройте retention policy в Prometheus
3. Оптимизируйте запросы в Grafana

## Безопасность

### Рекомендации
1. Измените пароли по умолчанию
2. Настройте аутентификацию для Grafana
3. Ограничьте доступ к портам мониторинга
4. Используйте HTTPS для внешнего доступа

### Настройка аутентификации Grafana
```bash
# В docker-compose.yml
environment:
  - GF_SECURITY_ADMIN_USER=your_admin
  - GF_SECURITY_ADMIN_PASSWORD=your_secure_password
  - GF_USERS_ALLOW_SIGN_UP=false
  - GF_AUTH_ANONYMOUS_ENABLED=false
``` 