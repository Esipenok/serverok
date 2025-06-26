const fetch = require('node-fetch');

class LikeCounterService {
  constructor() {
    this.firebaseUrl = 'https://willowe-139e2-default-rtdb.europe-west1.firebasedatabase.app';
  }

  /**
   * Увеличивает счетчик лайков для пользователя в Firebase и отправляет уведомление
   * @param {string} targetUserId - ID пользователя, которому поставили лайк
   * @returns {Promise<boolean>} - Успешность операции
   */
  async incrementLikeCounter(targetUserId) {
    try {
      // Получаем текущий счетчик из Firebase
      const currentCount = await this.getLikeCount(targetUserId);
      const newCount = currentCount + 1;
      
      // Обновляем счетчик в Firebase
      const url = `${this.firebaseUrl}/like_counters/${targetUserId}.json`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: newCount,
          lastUpdated: Date.now()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        return false;
      }

      // Отправляем уведомление с обновленным счетчиком
      await this.sendLikeNotification(targetUserId, newCount);
      
      console.log(`Счетчик лайков для пользователя ${targetUserId} увеличен до ${newCount}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка при увеличении счетчика лайков:', error);
      return false;
    }
  }

  /**
   * Получает текущий счетчик лайков из Firebase
   * @param {string} targetUserId - ID пользователя
   * @returns {Promise<number>} - Количество лайков
   */
  async getLikeCount(targetUserId) {
    try {
      const url = `${this.firebaseUrl}/like_counters/${targetUserId}.json`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return 0; // Если записи нет, возвращаем 0
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data ? data.count || 0 : 0;
      
    } catch (error) {
      console.error('Ошибка при получении счетчика лайков:', error);
      return 0;
    }
  }

  /**
   * Сбрасывает счетчик лайков для пользователя
   * @param {string} targetUserId - ID пользователя
   * @returns {Promise<boolean>} - Успешность операции
   */
  async resetLikeCounter(targetUserId) {
    try {
      const url = `${this.firebaseUrl}/like_counters/${targetUserId}.json`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: 0,
          lastUpdated: Date.now()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        return false;
      }
      
      console.log(`Счетчик лайков для пользователя ${targetUserId} сброшен`);
      return true;
      
    } catch (error) {
      console.error('Ошибка при сбросе счетчика лайков:', error);
      return false;
    }
  }

  /**
   * Удаляет счетчик лайков для пользователя
   * @param {string} targetUserId - ID пользователя
   * @returns {Promise<boolean>} - Успешность операции
   */
  async deleteLikeCounter(targetUserId) {
    try {
      const url = `${this.firebaseUrl}/like_counters/${targetUserId}.json`;
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        return false;
      }
      
      console.log(`Счетчик лайков для пользователя ${targetUserId} удален`);
      return true;
      
    } catch (error) {
      console.error('Ошибка при удалении счетчика лайков:', error);
      return false;
    }
  }

  /**
   * Отправляет уведомление о лайках с счетчиком
   * @param {string} targetUserId - ID пользователя, которому отправляется уведомление
   * @param {number} likeCount - Количество лайков
   */
  async sendLikeNotification(targetUserId, likeCount) {
    try {
      const timestamp = Date.now();
      
      let title, body;
      if (likeCount === 1) {
        title = 'Новый лайк!';
        body = 'Кто-то поставил вам лайк';
      } else {
        title = 'Новые лайки!';
        body = `${likeCount} человек поставили вам лайк`;
      }
      
      const notificationData = {
        type: 'like_counter',
        title: title,
        body: body,
        data: {
          likeCount: likeCount,
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
      console.log(`Уведомление о лайках (${likeCount}) отправлено пользователю ${targetUserId}, ID: ${result.name}`);
      return true;
      
    } catch (error) {
      console.error('Ошибка отправки уведомления о лайках:', error.message);
      return false;
    }
  }
}

module.exports = new LikeCounterService(); 