const fetch = require('node-fetch');

class NotificationService {
  constructor() {
    this.firebaseUrl = 'https://willowe-139e2-default-rtdb.europe-west1.firebasedatabase.app';
  }

  /**
   * Отправляет уведомление о лайке с увеличением счётчика
   * Если уведомление уже существует - увеличивает счётчик
   * Если нет - создаёт новое
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @returns {Promise<boolean>} - Успешность операции
   */
  async sendLikeNotification(targetUserId) {
    try {
      const timestamp = Date.now();
      
      // Получаем существующие уведомления пользователя
      const existingNotifications = await this.getUserNotifications(targetUserId);
      
      // Ищем существующее уведомление типа like_counter
      const existingLikeNotification = existingNotifications.find(notification => 
        notification.type === 'like_counter'
      );
      
      if (existingLikeNotification) {
        // Увеличиваем счётчик в существующем уведомлении
        const currentCount = existingLikeNotification.data?.likeCount || 1;
        const newCount = currentCount + 1;
        
        const updatedData = {
          data: {
            ...existingLikeNotification.data,
            likeCount: newCount,
            timestamp: timestamp
          },
          title: newCount === 1 ? 'Новый лайк!' : 'Новые лайки!',
          body: newCount === 1 ? 'Кто-то поставил вам лайк' : `${newCount} человек поставили вам лайк`,
          timestamp: timestamp
        };

        const updateUrl = `${this.firebaseUrl}/notifications/${targetUserId}/${existingLikeNotification.id}.json`;
        
        const response = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
          return false;
        }

        console.log(`Счётчик лайков увеличен до ${newCount} для пользователя ${targetUserId}`);
        return true;
        
      } else {
        // Создаём новое уведомление
        const notificationData = {
          type: 'like_counter',
          title: 'Новый лайк!',
          body: 'Кто-то поставил вам лайк',
          data: {
            likeCount: 1,
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
        console.log(`Новое уведомление о лайке создано для пользователя ${targetUserId}, ID: ${result.name}`);
        return true;
      }
      
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

  /**
   * Отправляет уведомление о приглашении на one night с увеличением счётчика
   * Если уведомление уже существует - увеличивает счётчик
   * Если нет - создаёт новое
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @returns {Promise<boolean>} - Успешность операции
   */
  async sendOneNightNotification(targetUserId) {
    try {
      const timestamp = Date.now();
      
      // Получаем существующие уведомления пользователя
      const existingNotifications = await this.getUserNotifications(targetUserId);
      
      // Ищем существующее уведомление типа one_night_counter
      const existingOneNightNotification = existingNotifications.find(notification => 
        notification.type === 'one_night_counter'
      );
      
      if (existingOneNightNotification) {
        // Увеличиваем счётчик в существующем уведомлении
        const currentCount = existingOneNightNotification.data?.oneNightCount || 1;
        const newCount = currentCount + 1;
        
        const updatedData = {
          data: {
            ...existingOneNightNotification.data,
            oneNightCount: newCount,
            timestamp: timestamp
          },
          title: newCount === 1 ? 'Новое приглашение!' : 'Новые приглашения!',
          body: newCount === 1 ? 'Кто-то пригласил вас на одну ночь' : `${newCount} человек пригласили вас на одну ночь`,
          timestamp: timestamp
        };

        const updateUrl = `${this.firebaseUrl}/notifications/${targetUserId}/${existingOneNightNotification.id}.json`;
        
        const response = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
          return false;
        }

        console.log(`Счётчик one night приглашений увеличен до ${newCount} для пользователя ${targetUserId}`);
        return true;
        
      } else {
        // Создаём новое уведомление
        const notificationData = {
          type: 'one_night_counter',
          title: 'Новое приглашение!',
          body: 'Кто-то пригласил вас на одну ночь',
          data: {
            oneNightCount: 1,
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
        console.log(`Новое уведомление о one night приглашении создано для пользователя ${targetUserId}, ID: ${result.name}`);
        return true;
      }
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о one night приглашении:', error.message);
      return false;
    }
  }

  /**
   * Уменьшает счетчик one night приглашений в уведомлении one_night_counter
   * @param {string} userId - ID пользователя, у которого нужно уменьшить счетчик
   * @returns {Promise<boolean>} - Успешность операции
   */
  async decrementOneNightCounter(userId) {
    try {
      console.log(`Уменьшаем счетчик one night приглашений для пользователя ${userId}`);

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

      // Ищем уведомление типа one_night_counter
      let oneNightCounterNotificationId = null;
      let oneNightCounterNotification = null;

      for (const [id, notification] of Object.entries(data)) {
        if (notification.type === 'one_night_counter' && 
            notification.data && 
            notification.data.oneNightCount != null) {
          oneNightCounterNotificationId = id;
          oneNightCounterNotification = notification;
          break;
        }
      }

      if (!oneNightCounterNotificationId || !oneNightCounterNotification) {
        console.log(`Не найдено уведомление типа one_night_counter для пользователя ${userId}`);
        return false;
      }

      // Уменьшаем счетчик на 1
      const currentCount = oneNightCounterNotification.data.oneNightCount;
      const newCount = currentCount - 1;

      console.log(`Текущий счетчик: ${currentCount}, новый счетчик: ${newCount}`);

      if (newCount <= 0) {
        // Если счетчик стал 0 или меньше, удаляем уведомление
        const deleteUrl = `${this.firebaseUrl}/notifications/${userId}/${oneNightCounterNotificationId}.json`;
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          throw new Error(`HTTP error! status: ${deleteResponse.status}`);
        }

        console.log(`Уведомление удалено (счетчик стал 0) для пользователя ${userId}`);
      } else {
        // Обновляем счетчик и текст уведомления
        const updateUrl = `${this.firebaseUrl}/notifications/${userId}/${oneNightCounterNotificationId}.json`;
        const updatedData = {
          data: {
            ...oneNightCounterNotification.data,
            oneNightCount: newCount
          },
          title: newCount === 1 ? 'Новое приглашение!' : 'Новые приглашения!',
          body: newCount === 1 ? 'Кто-то пригласил вас на одну ночь' : `${newCount} человек пригласили вас на одну ночь`,
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
      console.error('Ошибка уменьшения счетчика one night приглашений:', error.message);
      return false;
    }
  }

  /**
   * Отправляет уведомление о fast match приглашении
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @param {Object} senderData - Данные отправителя (userId, name, photoUrl)
   * @param {string} requestId - ID запроса fast match
   * @returns {Promise<boolean>} - Успешность операции
   */
  async sendFastMatchNotification(targetUserId, senderData, requestId) {
    try {
      const timestamp = Date.now();
      
      const notificationData = {
        type: 'fast_match',
        title: 'Новое приглашение на быструю встречу!',
        body: `${senderData.name} приглашает вас на быструю встречу`,
        data: {
          requestId: requestId,
          senderId: senderData.userId,
          senderName: senderData.name,
          senderPhotoUrl: senderData.photoUrl,
          timestamp: timestamp,
          expiresAt: timestamp + (10 * 60 * 1000) // 10 минут в миллисекундах
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
      console.log(`Уведомление о fast match отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      
      // Планируем автоматическое удаление через 10 минут
      this.scheduleFastMatchNotificationDeletion(targetUserId, result.name, 10 * 60 * 1000);
      
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о fast match:', error.message);
      return false;
    }
  }

  /**
   * Планирует автоматическое удаление fast match уведомления через указанное время
   * @param {string} userId - ID пользователя
   * @param {string} notificationId - ID уведомления
   * @param {number} delayMs - Задержка в миллисекундах (по умолчанию 10 минут)
   */
  scheduleFastMatchNotificationDeletion(userId, notificationId, delayMs = 10 * 60 * 1000) {
    console.log(`Планирование удаления fast match уведомления ${notificationId} для пользователя ${userId} через ${delayMs / 1000} секунд`);
    
    setTimeout(async () => {
      try {
        // Проверяем, существует ли еще уведомление перед удалением
        const url = `${this.firebaseUrl}/notifications/${userId}/${notificationId}.json`;
        const checkResponse = await fetch(url);
        
        if (checkResponse.ok) {
          // Уведомление все еще существует, удаляем его
          const deleteResponse = await fetch(url, {
            method: 'DELETE'
          });

          if (deleteResponse.ok) {
            console.log(`Fast match уведомление ${notificationId} автоматически удалено для пользователя ${userId}`);
          } else {
            console.error(`Ошибка при автоматическом удалении fast match уведомления ${notificationId}: ${deleteResponse.status}`);
          }
        } else {
          console.log(`Fast match уведомление ${notificationId} уже удалено для пользователя ${userId}`);
        }
      } catch (error) {
        console.error(`Ошибка при автоматическом удалении fast match уведомления ${notificationId}:`, error.message);
      }
    }, delayMs);
  }

  /**
   * Удаляет fast match уведомление по ID запроса
   * @param {string} userId - ID пользователя
   * @param {string} requestId - ID запроса fast match
   * @returns {Promise<boolean>} - Успешность операции
   */
  async deleteFastMatchNotificationByRequestId(userId, requestId) {
    try {
      console.log(`Удаляем fast match уведомление для пользователя ${userId} по requestId ${requestId}`);

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

      // Ищем уведомление типа fast_match с нужным requestId
      let fastMatchNotificationId = null;

      for (const [id, notification] of Object.entries(data)) {
        if (notification.type === 'fast_match' && 
            notification.data && 
            notification.data.requestId === requestId) {
          fastMatchNotificationId = id;
          break;
        }
      }

      if (!fastMatchNotificationId) {
        console.log(`Не найдено fast match уведомление с requestId ${requestId} для пользователя ${userId}`);
        return false;
      }

      // Удаляем уведомление
      const deleteUrl = `${this.firebaseUrl}/notifications/${userId}/${fastMatchNotificationId}.json`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        throw new Error(`HTTP error! status: ${deleteResponse.status}`);
      }

      console.log(`Fast match уведомление ${fastMatchNotificationId} удалено для пользователя ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка удаления fast match уведомления:', error.message);
      return false;
    }
  }
}

module.exports = new NotificationService(); 