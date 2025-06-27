#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

console.log('🔍 ДИАГНОСТИКА СЕРВЕРА');
console.log('=====================\n');

// 1. Проверка переменных окружения
console.log('1️⃣ ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'не установлена');
console.log('PORT:', process.env.PORT || 'не установлена');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'установлена' : 'НЕ УСТАНОВЛЕНА');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'установлен' : 'НЕ УСТАНОВЛЕН');
console.log('BASE_URL:', process.env.BASE_URL || 'не установлена');
console.log('STATIC_URL:', process.env.STATIC_URL || 'не установлена');
console.log('');

// 2. Проверка файлов конфигурации
console.log('2️⃣ ПРОВЕРКА ФАЙЛОВ КОНФИГУРАЦИИ:');
const configFiles = [
  'app.js',
  'server.js',
  'package.json',
  'config/app.config.js',
  'config/db.config.js',
  'config/logger.config.js'
];

configFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${file}: ${exists ? '✅ найден' : '❌ НЕ НАЙДЕН'}`);
});
console.log('');

// 3. Проверка SSL сертификатов
console.log('3️⃣ ПРОВЕРКА SSL СЕРТИФИКАТОВ:');
const sslDir = path.join(__dirname, 'ssl');
const sslFiles = ['privkey.pem', 'cert.pem', 'chain.pem'];

if (fs.existsSync(sslDir)) {
  console.log('Папка ssl: ✅ найдена');
  sslFiles.forEach(file => {
    const filePath = path.join(sslDir, file);
    const exists = fs.existsSync(filePath);
    console.log(`  ${file}: ${exists ? '✅ найден' : '❌ НЕ НАЙДЕН'}`);
  });
} else {
  console.log('Папка ssl: ❌ НЕ НАЙДЕНА');
}
console.log('');

// 4. Проверка подключения к MongoDB
console.log('4️⃣ ПРОВЕРКА ПОДКЛЮЧЕНИЯ К MONGODB:');
async function testMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI не установлена');
      return;
    }

    console.log('Попытка подключения к MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB подключен успешно');
    console.log(`   Хост: ${conn.connection.host}`);
    console.log(`   База данных: ${conn.connection.name}`);
    
    // Проверяем доступ к коллекциям
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`   Коллекций найдено: ${collections.length}`);
    
    await mongoose.disconnect();
    console.log('✅ Подключение закрыто');
  } catch (error) {
    console.log('❌ Ошибка подключения к MongoDB:');
    console.log(`   ${error.message}`);
    
    // Дополнительная диагностика
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   💡 MongoDB сервер недоступен. Проверьте:');
      console.log('      - Запущен ли MongoDB контейнер');
      console.log('      - Правильный ли порт (27017)');
      console.log('      - Доступность сети');
    } else if (error.message.includes('Authentication failed')) {
      console.log('   💡 Ошибка аутентификации. Проверьте:');
      console.log('      - Правильность логина/пароля');
      console.log('      - Права доступа пользователя');
    }
  }
}

// 5. Проверка зависимостей
console.log('5️⃣ ПРОВЕРКА ЗАВИСИМОСТЕЙ:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('✅ package.json прочитан');
  console.log(`   Зависимостей: ${Object.keys(packageJson.dependencies || {}).length}`);
  
  // Проверяем node_modules
  const nodeModulesExists = fs.existsSync('node_modules');
  console.log(`   node_modules: ${nodeModulesExists ? '✅ найден' : '❌ НЕ НАЙДЕН'}`);
  
  if (!nodeModulesExists) {
    console.log('   💡 Установите зависимости: npm install');
  }
} catch (error) {
  console.log('❌ Ошибка чтения package.json:', error.message);
}
console.log('');

// 6. Проверка портов
console.log('6️⃣ ПРОВЕРКА ПОРТОВ:');
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function checkPorts() {
  const ports = [3000, 80, 443];
  for (const port of ports) {
    const isAvailable = await checkPort(port);
    console.log(`   Порт ${port}: ${isAvailable ? '✅ свободен' : '❌ занят'}`);
  }
}
console.log('');

// 7. Проверка файловой системы
console.log('7️⃣ ПРОВЕРКА ФАЙЛОВОЙ СИСТЕМЫ:');
const requiredDirs = ['uploads', 'logs', 'config'];
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  console.log(`${dir}/: ${exists ? '✅ найден' : '❌ НЕ НАЙДЕН'}`);
});

// Проверяем права на запись
try {
  fs.accessSync('.', fs.constants.W_OK);
  console.log('Права на запись: ✅ есть');
} catch (error) {
  console.log('Права на запись: ❌ НЕТ');
}
console.log('');

// Запускаем проверки
async function runDiagnostics() {
  await testMongoDB();
  await checkPorts();
  
  console.log('8️⃣ РЕКОМЕНДАЦИИ:');
  console.log('================');
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ Установите MONGODB_URI в переменных окружения');
  }
  
  if (!process.env.JWT_SECRET) {
    console.log('❌ Установите JWT_SECRET в переменных окружения');
  }
  
  if (!fs.existsSync('node_modules')) {
    console.log('❌ Установите зависимости: npm install');
  }
  
  if (!fs.existsSync('ssl')) {
    console.log('⚠️  Папка ssl не найдена. В production режиме сервер попытается использовать HTTP');
  }
  
  console.log('\n✅ Диагностика завершена');
}

runDiagnostics().catch(console.error); 