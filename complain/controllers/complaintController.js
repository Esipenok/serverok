const Complaint = require('../models/complaint');
const { kafkaModuleService } = require('../../kafka/init');

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