# 🚀 Система мониторинга Dating App

Полноценная система мониторинга для приложения знакомств с использованием Prometheus, Grafana и различных экспортеров.

## 🎯 Что мониторим

- **Приложение**: HTTP запросы, время ответа, бизнес-метрики
- **Redis**: Использование памяти, команды, hit rate
- **Kafka**: Сообщения, лаг консьюмеров, топики
- **Система**: CPU, память, диск, сеть

## 🚀 Быстрый старт

```bash
# Запуск системы мониторинга
./scripts/start-monitoring.sh

# Тестирование метрик
node tests/test-metrics.js
```

## 📊 Доступные интерфейсы

| Сервис | URL | Описание |
|--------|-----|----------|
| **Grafana** | http://localhost:3001 | Дашборды (admin/admin123) |
| **Prometheus** | http://localhost:9090 | Сбор метрик |
| **App Metrics** | http://localhost:3000/metrics | Метрики приложения |
| **Redis Exporter** | http://localhost:9121/metrics | Метрики Redis |
| **Kafka Exporter** | http://localhost:9308/metrics | Метрики Kafka |
| **Node Exporter** | http://localhost:9100/metrics | Системные метрики |

## 📈 Дашборды Grafana

1. **Dating App Overview** - Общий обзор приложения
2. **Redis Monitoring** - Мониторинг Redis
3. **Kafka Monitoring** - Мониторинг Kafka
4. **System Monitoring** - Системные метрики

## 🔧 Команды управления

```bash
# Статус сервисов
docker-compose -f docker-compose.zero-downtime.yml ps

# Логи Prometheus
docker logs dating_app_prometheus

# Логи Grafana
docker logs dating_app_grafana

# Перезапуск мониторинга
docker-compose -f docker-compose.zero-downtime.yml restart prometheus grafana
```

## 📋 Метрики приложения

### HTTP метрики
- `http_requests_total` - количество запросов
- `http_request_duration_seconds` - время ответа

### Бизнес метрики
- `matches_total` - количество матчей
- `fast_matches_total` - количество fast matches
- `active_users_total` - активные пользователи

### Kafka метрики
- `kafka_messages_produced_total` - отправленные сообщения
- `kafka_messages_consumed_total` - полученные сообщения

## 🎨 Настройка дашбордов

Дашборды автоматически загружаются при запуске Grafana из папки `grafana/provisioning/dashboards/`.

Для создания нового дашборда:
1. Создайте JSON файл в `grafana/provisioning/dashboards/`
2. Перезапустите Grafana
3. Дашборд появится автоматически

## 🔔 Алерты

### Настройка алертов в Prometheus
Создайте файл `prometheus/rules.yml` с правилами алертов.

### Настройка алертов в Grafana
1. Откройте панель дашборда
2. Перейдите в "Alert" tab
3. Настройте условия и уведомления

## 🛠️ Устранение неполадок

### Метрики не отображаются
1. Проверьте статус экспортеров
2. Убедитесь, что Prometheus собирает данные
3. Проверьте конфигурацию в `prometheus/prometheus.yml`

### Grafana не подключается к Prometheus
1. Проверьте настройки datasource
2. Убедитесь, что Prometheus запущен
3. Проверьте сетевую связность

## 📚 Документация

Подробная документация: [docs/monitoring-setup.md](docs/monitoring-setup.md)

## 🔒 Безопасность

- Измените пароли по умолчанию
- Настройте аутентификацию для Grafana
- Ограничьте доступ к портам мониторинга
- Используйте HTTPS для внешнего доступа

---

**🎉 Система мониторинга готова к использованию!** 