const QRCode = require('qrcode');
const sharp = require('sharp');
const path = require('path');

/**
 * Генерирует QR-код в виде сердечка
 * @param {string} data - Данные для QR-кода
 * @param {Object} options - Опции генерации
 * @returns {Promise<Buffer>} - Буфер с изображением QR-кода
 */
async function generateHeartQRCode(data, options = {}) {
  const {
    size = 300,
    margin = 1,
    foregroundColor = '#FF6B6B', // Розовый цвет для сердечек
    backgroundColor = '#FFFFFF',
    heartColor = '#FF4757', // Красный цвет сердечка
    heartSize = 0.25, // Размер сердечка относительно QR-кода
    errorCorrectionLevel = 'H' // Высокий уровень коррекции ошибок
  } = options;

  try {
    // Генерируем базовый QR-код
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel,
      margin,
      width: size,
      color: {
        dark: foregroundColor,
        light: backgroundColor
      }
    });

    // Конвертируем Data URL в буфер
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');

    // Создаем SVG сердечка
    const heartSVG = createHeartSVG(heartColor, size * heartSize);

    // Накладываем сердечко на QR-код
    const finalImage = await sharp(qrBuffer)
      .composite([
        {
          input: Buffer.from(heartSVG),
          top: Math.floor((size - size * heartSize) / 2),
          left: Math.floor((size - size * heartSize) / 2)
        }
      ])
      .png()
      .toBuffer();

    return finalImage;
  } catch (error) {
    console.error('Ошибка генерации QR-кода с сердечком:', error);
    throw error;
  }
}

/**
 * Создает SVG сердечка
 * @param {string} color - Цвет сердечка
 * @param {number} size - Размер сердечка
 * @returns {string} - SVG строка
 */
function createHeartSVG(color, size) {
  const heartSize = size;
  const centerX = heartSize / 2;
  const centerY = heartSize / 2;
  const radius = heartSize * 0.3;

  return `
    <svg width="${heartSize}" height="${heartSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="heartGradient" cx="30%" cy="30%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
        </radialGradient>
      </defs>
      <path d="M ${centerX} ${centerY + radius * 0.3} 
               C ${centerX - radius * 0.5} ${centerY - radius * 0.2} 
                 ${centerX - radius * 0.5} ${centerY - radius * 0.8} 
                 ${centerX} ${centerY - radius * 0.8}
               C ${centerX + radius * 0.5} ${centerY - radius * 0.8} 
                 ${centerX + radius * 0.5} ${centerY - radius * 0.2} 
                 ${centerX} ${centerY + radius * 0.3} Z"
            fill="url(#heartGradient)"
            stroke="${color}"
            stroke-width="2"/>
    </svg>
  `;
}

/**
 * Генерирует QR-код с множественными сердечками в углах
 * @param {string} data - Данные для QR-кода
 * @param {Object} options - Опции генерации
 * @returns {Promise<Buffer>} - Буфер с изображением QR-кода
 */
async function generateMultiHeartQRCode(data, options = {}) {
  const {
    size = 300,
    margin = 1,
    foregroundColor = '#FF6B6B',
    backgroundColor = '#FFFFFF',
    heartColor = '#FF4757',
    heartSize = 0.15, // Меньший размер для угловых сердечек
    errorCorrectionLevel = 'H'
  } = options;

  try {
    // Генерируем базовый QR-код
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel,
      margin,
      width: size,
      color: {
        dark: foregroundColor,
        light: backgroundColor
      }
    });

    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');

    // Создаем SVG сердечка
    const heartSVG = createHeartSVG(heartColor, size * heartSize);

    // Позиции для угловых сердечек
    const heartPositions = [
      { top: size * 0.1, left: size * 0.1 }, // Верхний левый
      { top: size * 0.1, left: size * 0.75 }, // Верхний правый
      { top: size * 0.75, left: size * 0.1 }, // Нижний левый
      { top: size * 0.75, left: size * 0.75 }, // Нижний правый
    ];

    // Создаем композицию с сердечками
    const composite = heartPositions.map(pos => ({
      input: Buffer.from(heartSVG),
      top: Math.floor(pos.top),
      left: Math.floor(pos.left)
    }));

    const finalImage = await sharp(qrBuffer)
      .composite(composite)
      .png()
      .toBuffer();

    return finalImage;
  } catch (error) {
    console.error('Ошибка генерации QR-кода с множественными сердечками:', error);
    throw error;
  }
}

/**
 * Генерирует QR-код с градиентным сердечком
 * @param {string} data - Данные для QR-кода
 * @param {Object} options - Опции генерации
 * @returns {Promise<Buffer>} - Буфер с изображением QR-кода
 */
async function generateGradientHeartQRCode(data, options = {}) {
  const {
    size = 300,
    margin = 1,
    foregroundColor = '#FF6B6B',
    backgroundColor = '#FFFFFF',
    gradientColors = ['#FF6B6B', '#FF8E8E', '#FF4757'],
    heartSize = 0.25,
    errorCorrectionLevel = 'H'
  } = options;

  try {
    // Генерируем базовый QR-код
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel,
      margin,
      width: size,
      color: {
        dark: foregroundColor,
        light: backgroundColor
      }
    });

    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');

    // Создаем градиентное сердечко
    const gradientHeartSVG = createGradientHeartSVG(gradientColors, size * heartSize);

    const finalImage = await sharp(qrBuffer)
      .composite([
        {
          input: Buffer.from(gradientHeartSVG),
          top: Math.floor((size - size * heartSize) / 2),
          left: Math.floor((size - size * heartSize) / 2)
        }
      ])
      .png()
      .toBuffer();

    return finalImage;
  } catch (error) {
    console.error('Ошибка генерации QR-кода с градиентным сердечком:', error);
    throw error;
  }
}

/**
 * Создает SVG градиентного сердечка
 * @param {Array<string>} colors - Массив цветов для градиента
 * @param {number} size - Размер сердечка
 * @returns {string} - SVG строка
 */
function createGradientHeartSVG(colors, size) {
  const heartSize = size;
  const centerX = heartSize / 2;
  const centerY = heartSize / 2;
  const radius = heartSize * 0.3;

  const gradientStops = colors.map((color, index) => 
    `<stop offset="${(index / (colors.length - 1)) * 100}%" style="stop-color:${color};stop-opacity:1" />`
  ).join('');

  return `
    <svg width="${heartSize}" height="${heartSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gradientHeart" cx="30%" cy="30%">
          ${gradientStops}
        </radialGradient>
      </defs>
      <path d="M ${centerX} ${centerY + radius * 0.3} 
               C ${centerX - radius * 0.5} ${centerY - radius * 0.2} 
                 ${centerX - radius * 0.5} ${centerY - radius * 0.8} 
                 ${centerX} ${centerY - radius * 0.8}
               C ${centerX + radius * 0.5} ${centerY - radius * 0.8} 
                 ${centerX + radius * 0.5} ${centerY - radius * 0.2} 
                 ${centerX} ${centerY + radius * 0.3} Z"
            fill="url(#gradientHeart)"
            stroke="${colors[0]}"
            stroke-width="2"/>
    </svg>
  `;
}

module.exports = {
  generateHeartQRCode,
  generateMultiHeartQRCode,
  generateGradientHeartQRCode,
  createHeartSVG,
  createGradientHeartSVG
}; 