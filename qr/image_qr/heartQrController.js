const {
  generateHeartQRCode,
  generateMultiHeartQRCode,
  generateGradientHeartQRCode
} = require('./heartQrGenerator');
const QrCode = require('../models/QrCode');

/**
 * Генерирует QR-код с сердечком в центре
 */
exports.generateHeartQrImage = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { 
      style = 'center', // 'center', 'corners', 'gradient'
      size = 300,
      heartColor = '#FF4757',
      foregroundColor = '#FF6B6B',
      backgroundColor = '#FFFFFF'
    } = req.query;

    if (!qrId) {
      return res.status(400).json({ 
        success: false, 
        message: 'QR ID обязателен' 
      });
    }

    // Находим QR-код
    const qrCode = await QrCode.findOne({ qr_id: qrId });
    
    if (!qrCode) {
      return res.status(404).json({ 
        success: false, 
        message: 'QR код не найден' 
      });
    }

    // Формируем URL для QR-кода
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const qrUrl = `yourapp://qr/${qrCode.is_permanent ? 'permanent' : 'transferable'}/${qrCode.qr_id}`;

    let qrImageBuffer;

    // Выбираем стиль генерации
    switch (style) {
      case 'center':
        qrImageBuffer = await generateHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
        break;
      
      case 'corners':
        qrImageBuffer = await generateMultiHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
        break;
      
      case 'gradient':
        qrImageBuffer = await generateGradientHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          gradientColors: [heartColor, '#FF8E8E', '#FF4757']
        });
        break;
      
      default:
        qrImageBuffer = await generateHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
    }

    // Отправляем изображение
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': qrImageBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Кэшируем на 1 час
    });
    res.end(qrImageBuffer);

  } catch (error) {
    console.error(`Ошибка при генерации QR кода с сердечком: ${error.message}`, error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера', 
      error: error.message 
    });
  }
};

/**
 * Генерирует QR-код с сердечком для пользователя
 */
exports.generateUserHeartQr = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      style = 'center',
      size = 300,
      heartColor = '#FF4757',
      foregroundColor = '#FF6B6B',
      backgroundColor = '#FFFFFF'
    } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID обязателен' 
      });
    }

    // Находим постоянный QR-код пользователя
    const qrCode = await QrCode.findOne({ 
      user_id: userId, 
      is_permanent: true 
    });

    if (!qrCode) {
      return res.status(404).json({ 
        success: false, 
        message: 'Постоянный QR код пользователя не найден' 
      });
    }

    // Формируем URL для QR-кода
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const qrUrl = `yourapp://qr/permanent/${qrCode.qr_id}`;

    let qrImageBuffer;

    // Выбираем стиль генерации
    switch (style) {
      case 'center':
        qrImageBuffer = await generateHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
        break;
      
      case 'corners':
        qrImageBuffer = await generateMultiHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
        break;
      
      case 'gradient':
        qrImageBuffer = await generateGradientHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          gradientColors: [heartColor, '#FF8E8E', '#FF4757']
        });
        break;
      
      default:
        qrImageBuffer = await generateHeartQRCode(qrUrl, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
    }

    // Отправляем изображение
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': qrImageBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(qrImageBuffer);

  } catch (error) {
    console.error(`Ошибка при генерации QR кода пользователя с сердечком: ${error.message}`, error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера', 
      error: error.message 
    });
  }
};

/**
 * Получает доступные стили QR-кодов с сердечками
 */
exports.getHeartQrStyles = async (req, res) => {
  try {
    const styles = [
      {
        id: 'center',
        name: 'Сердечко в центре',
        description: 'Одно красивое сердечко в центре QR-кода',
        preview: '❤️'
      },
      {
        id: 'corners',
        name: 'Сердечки в углах',
        description: 'Четыре маленьких сердечка в углах QR-кода',
        preview: '❤️❤️\n❤️❤️'
      },
      {
        id: 'gradient',
        name: 'Градиентное сердечко',
        description: 'Сердечко с красивым градиентом в центре',
        preview: '💖'
      }
    ];

    return res.status(200).json({
      success: true,
      data: styles
    });

  } catch (error) {
    console.error(`Ошибка при получении стилей QR кодов: ${error.message}`, error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера', 
      error: error.message 
    });
  }
};

/**
 * Тестирует генерацию QR-кода с сердечком
 */
exports.testHeartQrGeneration = async (req, res) => {
  try {
    const { 
      data = 'https://example.com',
      style = 'center',
      size = 300,
      heartColor = '#FF4757',
      foregroundColor = '#FF6B6B',
      backgroundColor = '#FFFFFF'
    } = req.body;

    let qrImageBuffer;

    // Выбираем стиль генерации
    switch (style) {
      case 'center':
        qrImageBuffer = await generateHeartQRCode(data, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
        break;
      
      case 'corners':
        qrImageBuffer = await generateMultiHeartQRCode(data, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
        break;
      
      case 'gradient':
        qrImageBuffer = await generateGradientHeartQRCode(data, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          gradientColors: [heartColor, '#FF8E8E', '#FF4757']
        });
        break;
      
      default:
        qrImageBuffer = await generateHeartQRCode(data, {
          size: parseInt(size),
          foregroundColor,
          backgroundColor,
          heartColor
        });
    }

    // Отправляем изображение
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': qrImageBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(qrImageBuffer);

  } catch (error) {
    console.error(`Ошибка при тестировании генерации QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера', 
      error: error.message 
    });
  }
}; 