const fetch = require('node-fetch');

class NotificationService {
  constructor() {
    this.firebaseUrl = 'https://willowe-139e2-default-rtdb.europe-west1.firebasedatabase.app';
  }

  /**
   * Отправляет простое уведомление о лайке (likeCount всегда 1)
   * Вся логика подсчета происходит в Firebase через Cloud Functions
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @returns {Promise<boolean>} - Успешность операции
   */
  async sendLikeNotification(targetUserId) {
    try {
      const timestamp = Date.now();
      
      // Проверяем, не отправляли ли мы уже уведомление в последние 5 секунд
      const recentNotifications = await this.getUserNotifications(targetUserId);
      const recentLikeNotification = recentNotifications.find(notification => 
        notification.type === 'like_counter' && 
        (timestamp - notification.timestamp) < 5000 // 5 секунд
      );
      
      if (recentLikeNotification) {
        console.log(`Недавнее уведомление о лайке уже существует для пользователя ${targetUserId}, пропускаем`);
        return true;
      }
      
      const notificationData = {
        type: 'like_counter',
        title: 'Новый лайк!',
        body: 'Кто-то поставил вам лайк',
        data: {
          likeCount: 1, // Всегда 1! Подсчет происходит в Firebase
          timestamp: timestamp
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
   * Отправляет уведомление о новом мэтче
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @param {Object} matchData - Данные о мэтче (userId, name, photoUrl)
   * @returns {Promise<boolean>} - Успешность операции
   */
  async sendMatchNotification(targetUserId, matchData) {
    try {
      const timestamp = Date.now();
      
      const notificationData = {
        type: 'match',
        title: 'Новый мэтч!',
        body: `${matchData.name} понравился вам!`,
        data: {
          userId: matchData.userId,
          name: matchData.name,
          photoUrl: matchData.photoUrl,
          timestamp: timestamp
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
      console.log(`Уведомление о мэтче отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о мэтче:', error.message);
      return false;
    }
  }

  /**
   * Отправляет общее уведомление
   * @param {string} targetUserId - ID пользователя
   * @param {string} type - Тип уведомления
   * @param {string} title - Заголовок
   * @param {string} body - Текст уведомления
   * @param {Object} data - Дополнительные данные
   * @returns {Promise<boolean>} - Успешность операции
   */
  async sendNotification(targetUserId, type, title, body, data = {}) {
    try {
      const timestamp = Date.now();
      
      const notificationData = {
        type: type,
        title: title,
        body: body,
        data: {
          ...data,
          timestamp: timestamp
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
      console.log(`Уведомление ${type} отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error.message);
      return false;
    }
  }

  /**
   * Получает все уведомления пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Array>} - Массив уведомлений
   */
  async getUserNotifications(userId) {
    try {
      const url = `${this.firebaseUrl}/notifications/${userId}.json`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data) return [];

      // Преобразуем объект в массив и сортируем по времени
      const notifications = Object.entries(data).map(([id, notification]) => ({
        id,
        ...notification
      })).sort((a, b) => b.timestamp - a.timestamp);

      return notifications;
      
    } catch (error) {
      console.error('Ошибка получения уведомлений:', error);
      return [];
    }
  }

  /**
   * Отмечает уведомление как прочитанное
   * @param {string} userId - ID пользователя
   * @param {string} notificationId - ID уведомления
   * @returns {Promise<boolean>} - Успешность операции
   */
  async markAsRead(userId, notificationId) {
    try {
      const url = `${this.firebaseUrl}/notifications/${userId}/${notificationId}.json`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          read: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`Уведомление ${notificationId} отмечено как прочитанное для пользователя ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отметки уведомления как прочитанного:', error);
      return false;
    }
  }

  /**
   * Удаляет уведомление
   * @param {string} userId - ID пользователя
   * @param {string} notificationId - ID уведомления
   * @returns {Promise<boolean>} - Успешность операции
   */
  async deleteNotification(userId, notificationId) {
    try {
      const url = `${this.firebaseUrl}/notifications/${userId}/${notificationId}.json`;
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`Уведомление ${notificationId} удалено для пользователя ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
      return false;
    }
  }

  /**
   * Уменьшает счетчик лайков в уведомлении like_counter
   * @param {string} userId - ID пользователя, у которого нужно уменьшить счетчик
   * @returns {Promise<boolean>} - Успешность операции
   */
  async decrementLikeCounter(userId) {
    try {
      console.log(`Уменьшаем счетчик лайков для пользователя ${userId}`);

      // Получаем все уведомления пользователя
      const url = `${this.firebaseUrl}/notifications/${userId}.json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Нет уведомлений для пользователя ${userId}`);
          return false;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data) {
        console.log(`Нет данных уведомлений для пользователя ${userId}`);
        return false;
      }

      // Ищем уведомление типа like_counter
      let likeCounterNotificationId = null;
      let likeCounterNotification = null;

      for (const [id, notification] of Object.entries(data)) {
        if (notification.type === 'like_counter' && 
            notification.data && 
            notification.data.likeCount != null) {
          likeCounterNotificationId = id;
          likeCounterNotification = notification;
          break;
        }
      }

      if (!likeCounterNotificationId || !likeCounterNotification) {
        console.log(`Не найдено уведомление типа like_counter для пользователя ${userId}`);
        return false;
      }

      // Уменьшаем счетчик на 1
      const currentCount = likeCounterNotification.data.likeCount;
      const newCount = currentCount - 1;

      console.log(`Текущий счетчик: ${currentCount}, новый счетчик: ${newCount}`);

      if (newCount <= 0) {
        // Если счетчик стал 0 или меньше, удаляем уведомление
        const deleteUrl = `${this.firebaseUrl}/notifications/${userId}/${likeCounterNotificationId}.json`;
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          throw new Error(`HTTP error! status: ${deleteResponse.status}`);
        }

        console.log(`Уведомление удалено (счетчик стал 0) для пользователя ${userId}`);
      } else {
        // Обновляем счетчик и текст уведомления
        const updateUrl = `${this.firebaseUrl}/notifications/${userId}/${likeCounterNotificationId}.json`;
        const updatedData = {
          data: {
            ...likeCounterNotification.data,
            likeCount: newCount
          },
          title: newCount === 1 ? 'Новый лайк!' : 'Новые лайки!',
          body: newCount === 1 ? 'Кто-то поставил вам лайк' : `${newCount} человек поставили вам лайк`,
          timestamp: Date.now()
        };

        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedData)
        });

        if (!updateResponse.ok) {
          throw new Error(`HTTP error! status: ${updateResponse.status}`);
        }

        console.log(`Счетчик обновлен до ${newCount} для пользователя ${userId}`);
      }

      return true;
    } catch (error) {
      console.error('Ошибка уменьшения счетчика лайков:', error.message);
      return false;
    }
  }
}

module.exports = new NotificationService(); 