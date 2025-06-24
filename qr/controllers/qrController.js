const QrCode = require('../models/QrCode');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

/**
 * Получить изображение QR-кода в формате URL, который можно отобразить в приложении
 */
exports.getQrImageUrl = (qrId, baseUrl = '') => {
  // Формируем URL для получения изображения QR-кода
  return `${baseUrl}/api/qr/image/${qrId}`;
};

/**
 * Добавляет поле image_url ко всем QR-кодам в ответе
 */
exports.addImageUrlToQrCodes = (qrCodes, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  return qrCodes.map(qr => ({
    ...qr,
    image_url: exports.getQrImageUrl(qr.qr_id, baseUrl)
  }));
};

/**
 * Получить все QR-коды пользователя
 */
exports.getUserQrCodes = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID обязателен' });
    }

    console.log(`Получение QR кодов для пользователя: ${userId}`);
    
    // Используем строку userId напрямую, без конвертации в ObjectId
    const qrCodes = await QrCode.find({ 
      user_id: userId, 
      is_active: true 
    });
    
    console.log(`Найдено ${qrCodes.length} QR кодов`);
    
    // Преобразуем QR-коды для соответствия клиентскому формату
    const formattedQrCodes = qrCodes.map(qr => {
      console.log(`Форматирование QR кода: ${qr.qr_id}, постоянный: ${qr.is_permanent}`);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return {
        ...qr.toObject(),
        description: qr.message || '',
        custom_message: qr.message || '',
        qr_url: `yourapp://qr/${qr.is_permanent ? 'permanent' : 'transferable'}/${qr.qr_id}`,
        image_url: exports.getQrImageUrl(qr.qr_id, baseUrl)
      };
    });
    
    // Разделяем QR-коды на постоянные и передаваемые
    const permanentCodes = formattedQrCodes.filter(qr => qr.is_permanent);
    const transferableCodes = formattedQrCodes.filter(qr => !qr.is_permanent);
    
    console.log(`Постоянных: ${permanentCodes.length}, Передаваемых: ${transferableCodes.length}`);
    
    return res.status(200).json({
      success: true,
      data: {
        qrCodes: formattedQrCodes,
        permanent: permanentCodes,
        transferable: transferableCodes
      }
    });
  } catch (error) {
    console.error(`Ошибка при получении QR кодов пользователя: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Создать постоянный QR-код для пользователя
 */
exports.createPermanentQr = async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    console.log(`Создание постоянного QR кода для пользователя: ${userId}, сообщение: ${message}`);
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID обязателен' });
    }

    // Проверяем, есть ли уже у пользователя постоянный QR-код
    const existingPermanentQr = await QrCode.findOne({ 
      user_id: userId, 
      is_permanent: true 
    });

    if (existingPermanentQr) {
      console.log(`У пользователя ${userId} уже есть постоянный QR код: ${existingPermanentQr.qr_id}`);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return res.status(400).json({ 
        success: false, 
        message: 'У пользователя уже есть постоянный QR код',
        data: {
          qrCode: {
            ...existingPermanentQr.toObject(),
            description: existingPermanentQr.message || '',
            custom_message: existingPermanentQr.message || '',
            qr_url: `yourapp://qr/permanent/${existingPermanentQr.qr_id}`,
            image_url: exports.getQrImageUrl(existingPermanentQr.qr_id, baseUrl)
          }
        }
      });
    }

    console.log(`Создание нового постоянного QR кода для ${userId}`);
    
    // Создаем новый постоянный QR-код
    const newQrCode = new QrCode({
      qr_id: uuidv4(),
      user_id: userId,
      is_permanent: true,
      is_active: true,
      message: message || '',
      created_at: new Date()
    });

    await newQrCode.save();
    console.log(`Создан новый постоянный QR код: ${newQrCode.qr_id}`);
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(201).json({
      success: true,
      message: 'Постоянный QR код успешно создан',
      data: {
        qrCode: {
          ...newQrCode.toObject(),
          description: newQrCode.message || '',
          custom_message: newQrCode.message || '',
          qr_url: `yourapp://qr/permanent/${newQrCode.qr_id}`,
          image_url: exports.getQrImageUrl(newQrCode.qr_id, baseUrl)
        }
      }
    });
  } catch (error) {
    console.error(`Ошибка при создании постоянного QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Создать передаваемый QR-код
 */
exports.createTransferableQr = async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID обязателен' });
    }

    // Создаем новый передаваемый QR-код
    const newQrCode = new QrCode({
      qr_id: uuidv4(),
      user_id: userId,
      is_permanent: false,
      is_active: true,
      message: message || '',
      created_at: new Date(),
      last_claimed_by: userId
    });

    await newQrCode.save();
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(201).json({
      success: true,
      message: 'Передаваемый QR код успешно создан',
      data: {
        qrCode: {
          ...newQrCode.toObject(),
          description: newQrCode.message || '',
          custom_message: newQrCode.message || '',
          qr_url: `yourapp://qr/transferable/${newQrCode.qr_id}`,
          image_url: exports.getQrImageUrl(newQrCode.qr_id, baseUrl)
        }
      }
    });
  } catch (error) {
    console.error(`Ошибка при создании передаваемого QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Привязать передаваемый QR-код к пользователю
 */
exports.claimTransferableQr = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { userId, message } = req.body;
    
    if (!qrId || !userId) {
      return res.status(400).json({ success: false, message: 'QR ID и User ID обязательны' });
    }

    // Находим QR-код
    const qrCode = await QrCode.findOne({ qr_id: qrId });
    
    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR код не найден' });
    }

    // Проверяем, активен ли QR-код
    if (!qrCode.is_active) {
      return res.status(400).json({ success: false, message: 'QR код неактивен' });
    }

    // Проверяем, что QR-код передаваемый
    if (qrCode.is_permanent) {
      return res.status(400).json({ success: false, message: 'Невозможно присвоить постоянный QR код' });
    }

    // Проверяем, что QR-код не принадлежит уже текущему пользователю
    if (qrCode.user_id && qrCode.user_id === userId) {
      return res.status(400).json({ success: false, message: 'QR код уже принадлежит вам' });
    }

    // Сохраняем предыдущего владельца
    const previousOwnerId = qrCode.user_id;
    
    // Обновляем владельца QR-кода
    qrCode.user_id = userId;
    qrCode.last_claimed_by = userId;
    qrCode.last_claimed_at = new Date();
    
    // Обновляем сообщение, если оно предоставлено
    if (message !== undefined) {
      qrCode.message = message;
    }
    
    // Увеличиваем счетчик сканирований
    qrCode.scan_count = (qrCode.scan_count || 0) + 1;
    
    await qrCode.save();
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Если у QR кода был предыдущий владелец, добавляем взаимное исключение
    if (previousOwnerId && previousOwnerId !== userId) {
      await addMutualExclusion(userId, previousOwnerId);
    }
    
    return res.status(200).json({
      success: true,
      message: 'QR код успешно присвоен',
      data: {
        qrCode: {
          ...qrCode.toObject(),
          description: qrCode.message || '',
          custom_message: qrCode.message || '',
          qr_url: `yourapp://qr/transferable/${qrCode.qr_id}`,
          image_url: exports.getQrImageUrl(qrCode.qr_id, baseUrl)
        },
        previousOwnerId
      }
    });
  } catch (error) {
    console.error(`Ошибка при присвоении QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Сканировать QR-код (получить информацию о QR-коде и его владельце)
 */
exports.scanQr = async (req, res) => {
  try {
    const { qrId, userId } = req.params;
    
    if (!qrId || !userId) {
      return res.status(400).json({ success: false, message: 'QR ID и User ID обязательны' });
    }

    // Находим QR-код
    const qrCode = await QrCode.findOne({ qr_id: qrId });
    
    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR код не найден' });
    }

    // Проверяем, активен ли QR-код
    if (!qrCode.is_active) {
      return res.status(400).json({ success: false, message: 'QR код неактивен' });
    }

    // Инкрементируем счетчик сканирований
    qrCode.scan_count = (qrCode.scan_count || 0) + 1;
    qrCode.last_scanned_at = new Date();
    await qrCode.save();
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Если у QR кода есть владелец, получаем его данные и добавляем взаимное исключение
    let userData = null;
    if (qrCode.user_id) {
      try {
        const User = require('../../auth/models/User');
        const user = await User.findOne({ userId: qrCode.user_id });
        if (user) {
          userData = {
            userId: user.userId,
            name: user.name || 'Пользователь',
            photos: user.photos || []
          };
          
          // Добавляем взаимное исключение пользователей в excludedUsers
          await addMutualExclusion(userId, qrCode.user_id);
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    }
    
    // Возвращаем информацию о QR-коде
    return res.status(200).json({
      success: true,
      data: {
        qr_id: qrCode.qr_id,
        qrCode: {
          ...qrCode.toObject(),
          description: qrCode.message || '',
          custom_message: qrCode.message || '',
          qr_url: `yourapp://qr/${qrCode.is_permanent ? 'permanent' : 'transferable'}/${qrCode.qr_id}`,
          image_url: exports.getQrImageUrl(qrCode.qr_id, baseUrl)
        },
        user_data: userData,
        isPermanent: qrCode.is_permanent,
        message: qrCode.message
      }
    });
  } catch (error) {
    console.error(`Ошибка при сканировании QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Добавляет взаимное исключение пользователей в поле excludedUsers
 * @param {string} user1Id - ID первого пользователя (сканирующего)
 * @param {string} user2Id - ID второго пользователя (владельца QR)
 */
async function addMutualExclusion(user1Id, user2Id) {
  try {
    const User = require('../../auth/models/User');
    
    // Проверяем, что пользователи не сканируют сами себя
    if (user1Id === user2Id) {
      console.log('Пользователь сканирует свой собственный QR код, исключение не требуется');
      return;
    }
    
    // Получаем обоих пользователей
    const [user1, user2] = await Promise.all([
      User.findOne({ userId: user1Id }),
      User.findOne({ userId: user2Id })
    ]);
    
    if (!user1 || !user2) {
      console.error('Один из пользователей не найден для взаимного исключения:', { user1Id, user2Id });
      return;
    }
    
    // Добавляем user2 в excludedUsers user1, если его там еще нет
    if (!user1.excludedUsers.includes(user2Id)) {
      user1.excludedUsers.push(user2Id);
      await user1.save();
      console.log(`Пользователь ${user2Id} добавлен в excludedUsers пользователя ${user1Id}`);
    }
    
    // Добавляем user1 в excludedUsers user2, если его там еще нет
    if (!user2.excludedUsers.includes(user1Id)) {
      user2.excludedUsers.push(user1Id);
      await user2.save();
      console.log(`Пользователь ${user1Id} добавлен в excludedUsers пользователя ${user2Id}`);
    }
    
    console.log(`Взаимное исключение успешно добавлено между пользователями ${user1Id} и ${user2Id}`);
  } catch (error) {
    console.error('Ошибка при добавлении взаимного исключения:', error);
  }
}

/**
 * Удалить QR-код
 */
exports.deleteQrCode = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { userId } = req.body;
    
    if (!qrId || !userId) {
      return res.status(400).json({ success: false, message: 'QR ID и User ID обязательны' });
    }

    // Находим QR-код
    const qrCode = await QrCode.findOne({ qr_id: qrId });
    
    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR код не найден' });
    }

    // Проверяем, принадлежит ли QR-код пользователю
    if (qrCode.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'У вас нет прав для удаления этого QR кода' });
    }

    // Мягкое удаление - просто деактивируем QR-код
    qrCode.is_active = false;
    await qrCode.save();
    
    return res.status(200).json({
      success: true,
      message: 'QR код успешно деактивирован'
    });
  } catch (error) {
    console.error(`Ошибка при удалении QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Административный метод для генерации партии передаваемых QR-кодов
 */
exports.generateTransferableBatch = async (req, res) => {
  try {
    const { count = 10, adminId, message } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ success: false, message: 'Admin ID is required' });
    }

    // Проверка прав администратора может быть добавлена здесь

    const batchQrCodes = [];
    
    for (let i = 0; i < count; i++) {
      const newQrCode = new QrCode({
        qr_id: uuidv4(),
        is_permanent: false,
        is_active: true,
        message: message || 'Transferable QR Code',
        created_at: new Date(),
        created_by_admin: adminId
      });

      await newQrCode.save();
      batchQrCodes.push(newQrCode);
    }
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${count} transferable QR codes`,
      data: batchQrCodes
    });
  } catch (error) {
    console.error(`Error generating batch of QR codes: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Генерирует один пустой передаваемый QR-код
 */
exports.generateEmptyQr = async (req, res) => {
  try {
    const { message = 'Empty QR Code' } = req.body;
    
    // Создаем новый пустой QR-код
    const newQrCode = new QrCode({
      qr_id: uuidv4(),
      is_permanent: false,
      is_active: true,
      message: message,
      created_at: new Date(),
      user_id: null // Пустой QR код не привязан к пользователю
    });

    await newQrCode.save();
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    return res.status(201).json({
      success: true,
      message: 'Empty QR code generated successfully',
      data: {
        qr_id: newQrCode.qr_id,
        qrCode: {
          ...newQrCode.toObject(),
          description: newQrCode.message || '',
          custom_message: newQrCode.message || '',
          qr_url: `yourapp://qr/transferable/${newQrCode.qr_id}`,
          image_url: exports.getQrImageUrl(newQrCode.qr_id, baseUrl)
        }
      }
    });
  } catch (error) {
    console.error(`Error generating empty QR code: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Генерирует изображение QR-кода (простая и надежная версия)
 */
exports.generateQrImage = async (req, res) => {
  try {
    const { qrId } = req.params;
    
    console.log(`Генерация QR изображения для ID: ${qrId}`);
    
    if (!qrId) {
      return res.status(400).json({ success: false, message: 'QR ID обязателен' });
    }
    
    // Находим QR-код
    const qrCode = await QrCode.findOne({ qr_id: qrId });
    if (!qrCode) {
      console.log(`QR код не найден: ${qrId}`);
      return res.status(404).json({ success: false, message: 'QR код не найден' });
    }
    
    // Формируем URL для QR-кода
    const qrUrl = `yourapp://qr/${qrCode.is_permanent ? 'permanent' : 'transferable'}/${qrCode.qr_id}`;
    console.log(`Генерируем QR для URL: ${qrUrl}`);
    
    // Генерируем QR-код как буфер
    const buffer = await QRCode.toBuffer(qrUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.9,
      margin: 1,
      width: 300
    });
    
    console.log(`Буфер сгенерирован, размер: ${buffer.length} байт`);
    
    // Проверяем, что буфер не пустой
    if (!buffer || buffer.length === 0) {
      console.error('Получен пустой буфер QR кода');
      return res.status(500).json({ success: false, message: 'Ошибка генерации QR кода' });
    }
    
    // Отправляем изображение
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=3600' // Кэшируем на 1 час
    });
    
    res.end(buffer);
    
    console.log('QR изображение успешно отправлено');
    
  } catch (error) {
    console.error(`Ошибка при генерации QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Отвязывает пользователя от передаваемого QR кода
 */
exports.unlinkTransferableQr = async (req, res) => {
  try {
    const { qrId } = req.params;
    
    if (!qrId) {
      return res.status(400).json({ success: false, message: 'QR ID обязателен' });
    }

    // Находим QR-код
    const qrCode = await QrCode.findOne({ qr_id: qrId });
    
    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR код не найден' });
    }

    // Проверяем, что это передаваемый QR-код
    if (qrCode.is_permanent) {
      return res.status(400).json({ success: false, message: 'Невозможно отвязать постоянный QR код' });
    }

    // Отвязываем пользователя
    qrCode.user_id = null;
    qrCode.message = '';
    qrCode.last_unlinked_at = new Date();
    
    await qrCode.save();
    
    return res.status(200).json({
      success: true,
      message: 'QR код успешно отвязан от пользователя'
    });
  } catch (error) {
    console.error(`Ошибка при отвязке QR кода: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
};

/**
 * Удаляет отсканированного пользователя из списка QR
 */
exports.removeScannedUser = async (req, res) => {
  try {
    const { userId, scannedUserId } = req.params;
    
    if (!userId || !scannedUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId и scannedUserId обязательны' 
      });
    }

    // Находим пользователя
    const User = require('../../auth/models/User');
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }

    // Удаляем отсканированного пользователя из поля qr
    const initialLength = user.qr.length;
    user.qr = user.qr.filter(id => id !== scannedUserId);
    
    if (user.qr.length === initialLength) {
      return res.status(404).json({ 
        success: false, 
        message: 'Отсканированный пользователь не найден в списке' 
      });
    }

    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Пользователь успешно удален из QR списка',
      data: {
        userId: user.userId,
        qrCount: user.qr.length
      }
    });
  } catch (error) {
    console.error(`Ошибка при удалении отсканированного пользователя: ${error.message}`, error.stack);
    return res.status(500).json({ success: false, message: 'Ошибка сервера', error: error.message });
  }
}; 