prometheus.scrape "app" {
  targets = [{__address__ = "app:3000"}]
  forward_to = [prometheus.remote_write.metrics_hosted_prometheus.receiver]
}

prometheus.scrape "redis" {
  targets = [{__address__ = "redis-exporter:9121"}]
  forward_to = [prometheus.remote_write.metrics_hosted_prometheus.receiver]
}

prometheus.scrape "kafka" {
  targets = [{__address__ = "kafka-exporter:9308"}]
  forward_to = [prometheus.remote_write.metrics_hosted_prometheus.receiver]
}

prometheus.scrape "node" {
  targets = [{__address__ = "node-exporter:9100"}]
  forward_to = [prometheus.remote_write.metrics_hosted_prometheus.receiver]
}

prometheus.remote_write "metrics_hosted_prometheus" {
  endpoint {
    name = "hosted-prometheus"
    url = "https://prometheus-prod-56-prod-us-east-2.grafana.net/api/prom/push"
    basic_auth {
      username = env("GRAFANA_PROMETHEUS_USERNAME")
      password = env("GRAFANA_PROMETHEUS_PASSWORD")
    }
  }
}

// Конфигурация для отправки логов в Grafana Cloud Loki
loki.source.file "app_logs" {
  targets = [
    {__path__ = "/app/logs/*.log", job = "dating-app"},
    {__path__ = "/app/logs/error/*.log", job = "dating-app-errors"},
  ]
  forward_to = [loki.write.hosted_loki.receiver]
}

loki.write "hosted_loki" {
  endpoint {
    url = "https://logs-prod-036.grafana.net/loki/api/v1/push"
    basic_auth {
      username = env("GRAFANA_LOKI_USERNAME")
      password = env("GRAFANA_LOKI_PASSWORD")
    }
  }
} 