const prometheus = require('prom-client');

// Создаем регистр метрик
const register = new prometheus.Registry();

// Добавляем стандартные метрики
prometheus.collectDefaultMetrics({ register });

// HTTP метрики
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Бизнес метрики
const activeUsersTotal = new prometheus.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users'
});

const matchesTotal = new prometheus.Counter({
  name: 'matches_total',
  help: 'Total number of matches created'
});

const fastMatchesTotal = new prometheus.Counter({
  name: 'fast_matches_total',
  help: 'Total number of fast matches'
});

const oneNightTotal = new prometheus.Counter({
  name: 'one_night_total',
  help: 'Total number of one night events'
});

const marketProfilesTotal = new prometheus.Counter({
  name: 'market_profiles_total',
  help: 'Total number of market profiles created'
});

// Kafka метрики
const kafkaMessagesProduced = new prometheus.Counter({
  name: 'kafka_messages_produced_total',
  help: 'Total number of Kafka messages produced',
  labelNames: ['topic']
});

const kafkaMessagesConsumed = new prometheus.Counter({
  name: 'kafka_messages_consumed_total',
  help: 'Total number of Kafka messages consumed',
  labelNames: ['topic']
});

// Регистрируем все метрики
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeUsersTotal);
register.registerMetric(matchesTotal);
register.registerMetric(fastMatchesTotal);
register.registerMetric(oneNightTotal);
register.registerMetric(marketProfilesTotal);
register.registerMetric(kafkaMessagesProduced);
register.registerMetric(kafkaMessagesConsumed);

// Middleware для сбора HTTP метрик
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Endpoint для получения метрик
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

// Функции для обновления бизнес метрик
const updateActiveUsers = (count) => {
  activeUsersTotal.set(count);
};

const incrementMatches = () => {
  matchesTotal.inc();
};

const incrementFastMatches = () => {
  fastMatchesTotal.inc();
};

const incrementOneNight = () => {
  oneNightTotal.inc();
};

const incrementMarketProfiles = () => {
  marketProfilesTotal.inc();
};

const incrementKafkaProduced = (topic) => {
  kafkaMessagesProduced.labels(topic).inc();
};

const incrementKafkaConsumed = (topic) => {
  kafkaMessagesConsumed.labels(topic).inc();
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  updateActiveUsers,
  incrementMatches,
  incrementFastMatches,
  incrementOneNight,
  incrementMarketProfiles,
  incrementKafkaProduced,
  incrementKafkaConsumed,
  register
}; 