const QRCode = require('qrcode');
const fs = require('fs');

// Тестовые данные
const testData = [
  {
    name: 'permanent-qr',
    url: 'yourapp://qr/permanent/test-uuid-123',
    description: 'Постоянный QR код'
  },
  {
    name: 'transferable-qr', 
    url: 'yourapp://qr/transferable/test-uuid-456',
    description: 'Передаваемый QR код'
  },
  {
    name: 'custom-url-qr',
    url: 'https://example.com/test',
    description: 'QR код с кастомным URL'
  }
];

// Функция для генерации QR кода
async function generateQR(data, filename) {
  try {
    const options = {
      errorCorrectionLevel: 'Q', // Максимальная коррекция ошибок
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#665BFF',  // Синий цвет
        light: '#FFFFFF'  // Белый фон
      },
      width: 500
    };

    console.log(`Генерируем QR код: ${data.description}`);
    console.log(`URL: ${data.url}`);
    
    const buffer = await QRCode.toBuffer(data.url, options);
    
    // Сохраняем файл
    fs.writeFileSync(filename, buffer);
    console.log(`✅ QR код сохранен: ${filename}`);
    console.log(`📏 Размер файла: ${buffer.length} байт`);
    console.log('---');
    
    return buffer;
  } catch (error) {
    console.error(`❌ Ошибка при генерации QR кода "${data.name}":`, error.message);
    return null;
  }
}

// Основная функция
async function runTests() {
  console.log('🚀 Начинаем тестирование генерации QR кодов...\n');
  
  for (const data of testData) {
    const filename = `test-${data.name}.png`;
    await generateQR(data, filename);
  }
  
  console.log('🎉 Тестирование завершено!');
  console.log('\n📁 Сгенерированные файлы:');
  testData.forEach(data => {
    console.log(`   - test-${data.name}.png`);
  });
}

// Запускаем тесты
runTests().catch(console.error); 