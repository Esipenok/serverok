const fetch = require('node-fetch');

class NotificationService {
  constructor() {
    this.firebaseUrl = 'https://willowe-139e2-default-rtdb.europe-west1.firebasedatabase.app';
  }

  /**
   * Отправляет уведомление о новом мэтче в Firebase Realtime Database
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @param {Object} matchedUserData - Данные сматченного пользователя
   * @param {string} matchedUserData.userId - ID сматченного пользователя
   * @param {string} matchedUserData.name - Имя сматченного пользователя
   * @param {string} matchedUserData.photoUrl - URL аватара сматченного пользователя
   */
  async sendMatchNotification(targetUserId, matchedUserData) {
    try {
      const notificationId = this.generateNotificationId();
      const timestamp = Date.now();
      
      const notificationData = {
        type: 'match',
        title: 'Новый мэтч!',
        body: `У вас новый мэтч с ${matchedUserData.name}`,
        data: {
          userId: matchedUserData.userId,
          name: matchedUserData.name,
          photoUrl: matchedUserData.photoUrl
        },
        timestamp: timestamp,
        read: false
      };

      // Используем POST вместо PUT для создания новых записей
      const url = `${this.firebaseUrl}/notifications/${targetUserId}.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`Уведомление о мэтче отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о мэтче:', error.message);
      return false;
    }
  }

  /**
   * Генерирует уникальный ID для уведомления
   * @returns {string} Уникальный ID
   */
  generateNotificationId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Отправляет уведомление о лайке (для будущего использования)
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @param {Object} likerData - Данные пользователя, который поставил лайк
   */
  async sendLikeNotification(targetUserId, likerData) {
    try {
      const timestamp = Date.now();
      
      const notificationData = {
        type: 'like',
        title: 'Новый лайк!',
        body: `${likerData.name} поставил вам лайк`,
        data: {
          userId: likerData.userId,
          name: likerData.name,
          photoUrl: likerData.photoUrl
        },
        timestamp: timestamp,
        read: false
      };

      const url = `${this.firebaseUrl}/notifications/${targetUserId}.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`Уведомление о лайке отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о лайке:', error.message);
      return false;
    }
  }

  /**
   * Отправляет уведомление о новом сообщении (для будущего использования)
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @param {Object} senderData - Данные отправителя сообщения
   * @param {string} messagePreview - Превью сообщения
   */
  async sendMessageNotification(targetUserId, senderData, messagePreview) {
    try {
      const timestamp = Date.now();
      
      const notificationData = {
        type: 'message',
        title: `Новое сообщение от ${senderData.name}`,
        body: messagePreview,
        data: {
          userId: senderData.userId,
          name: senderData.name,
          photoUrl: senderData.photoUrl,
          messagePreview: messagePreview
        },
        timestamp: timestamp,
        read: false
      };

      const url = `${this.firebaseUrl}/notifications/${targetUserId}.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`Уведомление о сообщении отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о сообщении:', error.message);
      return false;
    }
  }
}

module.exports = new NotificationService(); 