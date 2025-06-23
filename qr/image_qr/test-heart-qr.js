const {
  generateHeartQRCode,
  generateMultiHeartQRCode,
  generateGradientHeartQRCode
} = require('./heartQrGenerator');
const fs = require('fs').promises;
const path = require('path');

/**
 * Тестирует генерацию QR-кодов с сердечками
 */
async function testHeartQrGeneration() {
  try {
    console.log('🧪 Тестирование генерации QR-кодов с сердечками...\n');

    const testData = 'https://example.com/test-heart-qr';
    const outputDir = path.join(__dirname, 'test-output');

    // Создаем папку для тестовых файлов
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Папка уже существует
    }

    // Тест 1: QR-код с сердечком в центре
    console.log('1️⃣ Генерируем QR-код с сердечком в центре...');
    const centerHeartQr = await generateHeartQRCode(testData, {
      size: 300,
      foregroundColor: '#FF6B6B',
      backgroundColor: '#FFFFFF',
      heartColor: '#FF4757'
    });
    await fs.writeFile(path.join(outputDir, 'center-heart-qr.png'), centerHeartQr);
    console.log('✅ QR-код с сердечком в центре создан: center-heart-qr.png\n');

    // Тест 2: QR-код с сердечками в углах
    console.log('2️⃣ Генерируем QR-код с сердечками в углах...');
    const cornersHeartQr = await generateMultiHeartQRCode(testData, {
      size: 300,
      foregroundColor: '#FF6B6B',
      backgroundColor: '#FFFFFF',
      heartColor: '#FF4757'
    });
    await fs.writeFile(path.join(outputDir, 'corners-heart-qr.png'), cornersHeartQr);
    console.log('✅ QR-код с сердечками в углах создан: corners-heart-qr.png\n');

    // Тест 3: QR-код с градиентным сердечком
    console.log('3️⃣ Генерируем QR-код с градиентным сердечком...');
    const gradientHeartQr = await generateGradientHeartQRCode(testData, {
      size: 300,
      foregroundColor: '#FF6B6B',
      backgroundColor: '#FFFFFF',
      gradientColors: ['#FF6B6B', '#FF8E8E', '#FF4757']
    });
    await fs.writeFile(path.join(outputDir, 'gradient-heart-qr.png'), gradientHeartQr);
    console.log('✅ QR-код с градиентным сердечком создан: gradient-heart-qr.png\n');

    // Тест 4: QR-код с большим размером
    console.log('4️⃣ Генерируем большой QR-код с сердечком...');
    const largeHeartQr = await generateHeartQRCode(testData, {
      size: 500,
      foregroundColor: '#FF6B6B',
      backgroundColor: '#FFFFFF',
      heartColor: '#FF4757',
      heartSize: 0.3
    });
    await fs.writeFile(path.join(outputDir, 'large-heart-qr.png'), largeHeartQr);
    console.log('✅ Большой QR-код с сердечком создан: large-heart-qr.png\n');

    // Тест 5: QR-код с разными цветами
    console.log('5️⃣ Генерируем QR-код с разными цветами...');
    const colorfulHeartQr = await generateHeartQRCode(testData, {
      size: 300,
      foregroundColor: '#755BED', // Фиолетовый
      backgroundColor: '#F8F9FA', // Светло-серый
      heartColor: '#F5635B' // Красный
    });
    await fs.writeFile(path.join(outputDir, 'colorful-heart-qr.png'), colorfulHeartQr);
    console.log('✅ Цветной QR-код с сердечком создан: colorful-heart-qr.png\n');

    console.log('🎉 Все тесты завершены успешно!');
    console.log(`📁 Файлы сохранены в: ${outputDir}`);
    console.log('\n📋 Список созданных файлов:');
    console.log('- center-heart-qr.png - Сердечко в центре');
    console.log('- corners-heart-qr.png - Сердечки в углах');
    console.log('- gradient-heart-qr.png - Градиентное сердечко');
    console.log('- large-heart-qr.png - Большой размер');
    console.log('- colorful-heart-qr.png - Разные цвета');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

/**
 * Тестирует генерацию QR-кода с пользовательскими данными
 */
async function testCustomData() {
  try {
    console.log('\n🔧 Тестирование с пользовательскими данными...\n');

    const customData = 'yourapp://qr/permanent/test-user-123';
    const outputDir = path.join(__dirname, 'test-output');

    // Генерируем QR-код с пользовательскими данными
    const customHeartQr = await generateHeartQRCode(customData, {
      size: 400,
      foregroundColor: '#F5635B',
      backgroundColor: '#FFFFFF',
      heartColor: '#755BED',
      heartSize: 0.2
    });
    await fs.writeFile(path.join(outputDir, 'custom-user-qr.png'), customHeartQr);
    console.log('✅ Пользовательский QR-код создан: custom-user-qr.png');

  } catch (error) {
    console.error('❌ Ошибка при тестировании пользовательских данных:', error);
  }
}

// Запускаем тесты
if (require.main === module) {
  testHeartQrGeneration()
    .then(() => testCustomData())
    .then(() => {
      console.log('\n✨ Тестирование завершено!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = {
  testHeartQrGeneration,
  testCustomData
}; 