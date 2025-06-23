const { generateSimpleQRCode } = require('./image_qr/heartQrGenerator');
const fs = require('fs');

async function main() {
  const data = 'Тестовый QR-код ' + Date.now();
  const buffer = await generateSimpleQRCode(data, { size: 300 });
  fs.writeFileSync('test_simple_qr.png', buffer);
  console.log('QR-код успешно сгенерирован: test_simple_qr.png');
}

main(); 