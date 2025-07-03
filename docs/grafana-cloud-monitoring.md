# 🌐 Мониторинг через Grafana Cloud

Система мониторинга приложения знакомств теперь использует **Grafana Cloud** вместо локальных сервисов.

## 🎯 Преимущества Grafana Cloud

- **Облачное хранение** - метрики и логи хранятся в облаке
- **Высокая доступность** - 99.9% uptime
- **Автоматическое масштабирование** - не нужно управлять инфраструктурой
- **Готовые дашборды** - предустановленные шаблоны
- **Алерты** - встроенная система уведомлений

## 🚀 Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Node.js App   │    │   Redis/Kafka   │    │   System        │
│   (Port 3000)   │    │   Exporters     │    │   (Node Exporter)│
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Grafana Alloy          │
                    │   (Port 12345)            │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Grafana Cloud          │
                    │   - Prometheus            │
                    │   - Loki (Logs)           │
                    │   - Grafana (UI)          │
                    └───────────────────────────┘
```

## 📊 Что мониторится

### Метрики приложения
- HTTP запросы и время ответа
- Бизнес-метрики (матчи, пользователи)
- Kafka сообщения
- Redis использование

### Логи
- Логи приложения (`/app/logs/*.log`)
- Логи ошибок (`/app/logs/error/*.log`)

### Системные метрики
- CPU, память, диск
- Сетевая активность
- Процессы

## 🔧 Конфигурация

### Grafana Alloy (`docker/alloy-config.hcl`)
```hcl
// Сбор метрик с приложения
prometheus.scrape "app" {
  targets = ["app:3000"]
  forward_to = [prometheus.remote_write.metrics_hosted_prometheus.receiver]
}

// Отправка в Grafana Cloud Prometheus
prometheus.remote_write "metrics_hosted_prometheus" {
  endpoint {
    url = "https://prometheus-prod-56-prod-us-east-2.grafana.net/api/prom/push"
    basic_auth {
      username = "2535207"
      password = "YOUR_API_TOKEN"
    }
  }
}

// Сбор и отправка логов
loki.source.file "app_logs" {
  targets = [
    {__path__ = "/app/logs/*.log", job = "dating-app"},
    {__path__ = "/app/logs/error/*.log", job = "dating-app-errors"}
  ]
  forward_to = [loki.write.hosted_loki.receiver]
}
```

## 🚀 Запуск

### Автоматический перезапуск
```powershell
# Windows
.\scripts\update\restart_monitoring.ps1

# Linux/Mac
./scripts/update/restart_monitoring.sh
```

### Ручной запуск
```bash
# Остановка старых сервисов
docker-compose -f docker/docker-compose.zero-downtime.yml stop prometheus grafana

# Запуск новой конфигурации
docker-compose -f docker/docker-compose.zero-downtime.yml up -d alloy
```

## 📈 Доступ к дашбордам

1. **Войдите в Grafana Cloud**: https://grafana.com/auth/sign-in
2. **Перейдите в вашу организацию**
3. **Откройте Grafana**: https://your-org.grafana.net
4. **Найдите дашборды**:
   - Dating App Overview
   - Redis Monitoring  
   - Kafka Monitoring
   - System Monitoring

## 🔔 Алерты

### Настройка алертов в Grafana Cloud
1. Откройте панель дашборда
2. Нажмите "Alert" → "Create Alert"
3. Настройте условия:
   - Высокое время ответа (> 2s)
   - Много ошибок (> 5% от запросов)
   - Высокое использование памяти (> 80%)
4. Добавьте уведомления (email, Slack, Telegram)

## 🛠️ Устранение неполадок

### Метрики не отправляются
```bash
# Проверка статуса Alloy
docker logs dating_app_alloy

# Проверка конфигурации
docker exec dating_app_alloy alloy --config.file=/etc/alloy/config.alloy --check
```

### Логи не отправляются
```bash
# Проверка путей к логам
docker exec dating_app_alloy ls -la /app/logs/

# Проверка прав доступа
docker exec dating_app_alloy cat /app/logs/app.log
```

### Проверка подключения к Grafana Cloud
```bash
# Тест API токена
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://prometheus-prod-56-prod-us-east-2.grafana.net/api/v1/status/config
```

## 🔒 Безопасность

- **API токен** хранится в конфигурации Alloy
- **HTTPS** соединение с Grafana Cloud
- **Аутентификация** через Grafana Cloud
- **Ротация токенов** каждые 90 дней

## 💰 Стоимость

Grafana Cloud предлагает бесплатный план:
- **Free Tier**: 3 пользователя, 10k серий метрик, 50GB логов
- **Pro**: $49/месяц за дополнительные возможности

## 📚 Полезные ссылки

- [Grafana Cloud Documentation](https://grafana.com/docs/grafana-cloud/)
- [Alloy Configuration](https://grafana.com/docs/alloy/latest/)
- [Prometheus Remote Write](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Loki Configuration](https://grafana.com/docs/loki/latest/configuration/)

---

**🎉 Мониторинг успешно настроен в облаке!** 