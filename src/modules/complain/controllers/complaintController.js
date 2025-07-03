const Complaint = require('../models/complaint');
const { kafkaModuleService } = require('../../../infrastructure/kafka/service.js');

exports.createComplaint = async (req, res) => {
  try {
    const { senderId, senderEmail, reportedUserId, complaintText, complaintType, type } = req.body;

    const complaint = new Complaint({
      senderId,
      senderEmail,
      reportedUserId,
      complaintText,
      complaintType,
      type
    });

    await complaint.save();
    
    // Отправляем асинхронные операции в Kafka
    try {
      // Асинхронная аналитика создания жалобы
      await kafkaModuleService.sendComplainOperation('analytics', {
        senderId: senderId,
        reportedUserId: reportedUserId,
        complaintType: complaintType,
        action: 'create',
        timestamp: new Date().toISOString()
      });
      
      // Асинхронное обновление кэша
      await kafkaModuleService.sendComplainOperation('cache_update', {
        senderId: senderId,
        reportedUserId: reportedUserId,
        cacheKey: `complaint_${senderId}_${reportedUserId}`,
        cacheData: { type: complaintType, timestamp: Date.now() }
      });
      
    } catch (error) {
      console.error('Ошибка отправки асинхронных операций в Kafka:', error);
      // Не прерываем основной поток, так как жалоба уже создана
    }
    
    res.status(200).json({ message: 'Complaint submitted successfully' });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Error submitting complaint' });
  }
};

// Получить все жалобы (для административной панели)
exports.getAllComplaints = async (req, res) => {
  try {
    // Проверяем пароль администратора
    const adminPassword = req.headers['x-admin-password'] || req.query.password;
    if (adminPassword !== 'qwe') {
      return res.status(401).json({ error: 'Неверный пароль администратора' });
    }

    const complaints = await Complaint.find()
      .sort({ createdAt: -1 }) // Сортировка по дате создания (новые сначала)
      .limit(100); // Ограничиваем количество для производительности

    res.status(200).json(complaints);
  } catch (error) {
    console.error('Error getting all complaints:', error);
    res.status(500).json({ error: 'Ошибка получения жалоб' });
  }
};

// Получить статистику жалоб
exports.getComplaintsStats = async (req, res) => {
  try {
    // Проверяем пароль администратора
    const adminPassword = req.headers['x-admin-password'] || req.query.password;
    if (adminPassword !== 'qwe') {
      return res.status(401).json({ error: 'Неверный пароль администратора' });
    }

    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: '$complaintType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalComplaints = await Complaint.countDocuments();
    const todayComplaints = await Complaint.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    res.status(200).json({
      total: totalComplaints,
      today: todayComplaints,
      byType: stats
    });
  } catch (error) {
    console.error('Error getting complaints stats:', error);
    res.status(500).json({ error: 'Ошибка получения статистики жалоб' });
  }
}; 