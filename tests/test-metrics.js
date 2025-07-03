const fetch = require('node-fetch');

async function testMetrics() {
  console.log('🧪 Тестирование системы метрик...\n');

  try {
    // Тест метрик приложения
    console.log('📊 Проверка метрик приложения...');
    const appMetrics = await fetch('http://localhost:3000/metrics');
    if (appMetrics.ok) {
      const metrics = await appMetrics.text();
      console.log('✅ Метрики приложения доступны');
      
      // Проверяем наличие основных метрик
      const hasHttpMetrics = metrics.includes('http_requests_total');
      const hasBusinessMetrics = metrics.includes('matches_total') || metrics.includes('fast_matches_total');
      
      console.log(`   HTTP метрики: ${hasHttpMetrics ? '✅' : '❌'}`);
      console.log(`   Бизнес метрики: ${hasBusinessMetrics ? '✅' : '❌'}`);
    } else {
      console.log('❌ Метрики приложения недоступны');
    }

    // Тест метрик Redis
    console.log('\n📊 Проверка метрик Redis...');
    const redisMetrics = await fetch('http://localhost:9121/metrics');
    if (redisMetrics.ok) {
      const metrics = await redisMetrics.text();
      console.log('✅ Метрики Redis доступны');
      
      const hasMemoryMetrics = metrics.includes('redis_memory_used_bytes');
      const hasCommandMetrics = metrics.includes('redis_commands_processed_total');
      
      console.log(`   Метрики памяти: ${hasMemoryMetrics ? '✅' : '❌'}`);
      console.log(`   Метрики команд: ${hasCommandMetrics ? '✅' : '❌'}`);
    } else {
      console.log('❌ Метрики Redis недоступны');
    }

    // Тест метрик Kafka
    console.log('\n📊 Проверка метрик Kafka...');
    const kafkaMetrics = await fetch('http://localhost:9308/metrics');
    if (kafkaMetrics.ok) {
      const metrics = await kafkaMetrics.text();
      console.log('✅ Метрики Kafka доступны');
      
      const hasTopicMetrics = metrics.includes('kafka_topic_partition_current_offset');
      const hasConsumerMetrics = metrics.includes('kafka_consumer_group_lag');
      
      console.log(`   Метрики топиков: ${hasTopicMetrics ? '✅' : '❌'}`);
      console.log(`   Метрики консьюмеров: ${hasConsumerMetrics ? '✅' : '❌'}`);
    } else {
      console.log('❌ Метрики Kafka недоступны');
    }

    // Тест системных метрик
    console.log('\n📊 Проверка системных метрик...');
    const systemMetrics = await fetch('http://localhost:9100/metrics');
    if (systemMetrics.ok) {
      const metrics = await systemMetrics.text();
      console.log('✅ Системные метрики доступны');
      
      const hasCpuMetrics = metrics.includes('node_cpu_seconds_total');
      const hasMemoryMetrics = metrics.includes('node_memory_MemTotal_bytes');
      
      console.log(`   CPU метрики: ${hasCpuMetrics ? '✅' : '❌'}`);
      console.log(`   Memory метрики: ${hasMemoryMetrics ? '✅' : '❌'}`);
    } else {
      console.log('❌ Системные метрики недоступны');
    }

    // Тест Prometheus
    console.log('\n📊 Проверка Prometheus...');
    const prometheusStatus = await fetch('http://localhost:9090/api/v1/status/targets');
    if (prometheusStatus.ok) {
      const status = await prometheusStatus.json();
      console.log('✅ Prometheus доступен');
      
      const targets = status.data.activeTargets || [];
      console.log(`   Активные таргеты: ${targets.length}`);
      
      targets.forEach(target => {
        console.log(`     - ${target.labels.job}: ${target.health}`);
      });
    } else {
      console.log('❌ Prometheus недоступен');
    }

    // Тест Grafana
    console.log('\n📊 Проверка Grafana...');
    const grafanaStatus = await fetch('http://localhost:3001/api/health');
    if (grafanaStatus.ok) {
      console.log('✅ Grafana доступен');
    } else {
      console.log('❌ Grafana недоступен');
    }

    console.log('\n🎯 Рекомендации:');
    console.log('1. Откройте Grafana: http://localhost:3001 (admin/admin123)');
    console.log('2. Проверьте дашборды в разделе Dashboards');
    console.log('3. Настройте алерты в разделе Alerting');
    console.log('4. Изучите метрики в Prometheus: http://localhost:9090');

  } catch (error) {
    console.error('❌ Ошибка при тестировании метрик:', error.message);
    console.log('\n💡 Убедитесь, что все сервисы запущены:');
    console.log('   docker-compose -f docker-compose.zero-downtime.yml up -d');
  }
}

// Запуск теста
testMetrics(); 