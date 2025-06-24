const QRCode = require('qrcode');
const fs = require('fs');

async function generateSimpleQR(text, filename) {
  try {
    console.log(`Генерируем QR код для текста: ${text}`);
    
    // Генерируем QR-код как буфер
    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.9,
      margin: 4,  // Увеличиваем отступы
      width: 500, // Увеличиваем размер QR-кода
      color: {
        dark: '#0066CC',  // Синий цвет для темных элементов
        light: '#FFFFFF'  // Белый цвет для светлых элементов
      }
    });
    
    console.log(`Буфер сгенерирован, размер: ${buffer.length} байт`);
    
    // Сохраняем в файл
    fs.writeFileSync(filename, buffer);
    console.log(`QR-код успешно сохранен: ${filename}`);
    
    return buffer;
  } catch (error) {
    console.error(`Ошибка при генерации QR кода: ${error.message}`, error.stack);
    throw error;
  }
}

async function main() {
  try {
    // Тест 1: Простой текст
    await generateSimpleQR('Тестовый QR-код ' + Date.now(), 'test_simple_qr.png');
    
    // Тест 2: URL для приложения
    await generateSimpleQR('yourapp://qr/permanent/test-uuid-123', 'test_app_url_qr.png');
    
    // Тест 3: Длинный текст
    await generateSimpleQR('Это очень длинный текст для тестирования QR кода с русскими символами и цифрами 123456789', 'test_long_text_qr.png');
    
    console.log('Все тесты завершены успешно!');
  } catch (error) {
    console.error('Ошибка в тестах:', error.message);
  }
}

main(); 