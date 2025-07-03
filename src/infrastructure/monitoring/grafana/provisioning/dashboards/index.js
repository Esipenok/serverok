// Grafana dashboards configuration
const path = require('path');
const systemDashboard = require('./system-dashboard.json');
const kafkaDashboard = require('./kafka-dashboard.json');
const redisDashboard = require('./redis-dashboard.json');
const datingAppDashboard = require('./dating-app-overview.json');

module.exports = {
  config: path.join(__dirname, 'dashboards.yml'),
  system: systemDashboard,
  kafka: kafkaDashboard,
  redis: redisDashboard,
  datingApp: datingAppDashboard
}; 