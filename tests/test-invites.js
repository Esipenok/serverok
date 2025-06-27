const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = '12345';
const TEST_TOKEN = 'test_token_here';

// Тестирование API инвайтов
async function testInvitesAPI() {
  console.log('🧪 Тестирование API инвайтов...\n');

  try {
    // 1. Тест получения количества инвайтов
    console.log('1. Тест получения количества инвайтов:');
    try {
      const countResponse = await axios.get(`${BASE_URL}/invites/count/${TEST_USER_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Успешно получено количество инвайтов:', countResponse.data);
    } catch (error) {
      console.log('❌ Ошибка при получении количества инвайтов:', error.response?.data || error.message);
    }

    // 2. Тест обработки инвайта
    console.log('\n2. Тест обработки инвайта:');
    try {
      const processResponse = await axios.post(`${BASE_URL}/invites/process`, {
        inviterUserId: TEST_USER_ID
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Успешно обработан инвайт:', processResponse.data);
    } catch (error) {
      console.log('❌ Ошибка при обработке инвайта:', error.response?.data || error.message);
    }

    // 3. Тест статистики (для админов)
    console.log('\n3. Тест получения статистики:');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/invites/stats/${TEST_USER_ID}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Успешно получена статистика:', statsResponse.data);
    } catch (error) {
      console.log('❌ Ошибка при получении статистики:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Общая ошибка тестирования:', error.message);
  }
}

// Тестирование регистрации с инвайтом
async function testRegistrationWithInvite() {
  console.log('\n🧪 Тестирование регистрации с инвайтом...\n');

  try {
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test_invite_${Date.now()}@example.com`,
      firebaseUid: `firebase_${Date.now()}`,
      inviterUserId: TEST_USER_ID
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Успешная регистрация с инвайтом:', {
      userId: registerResponse.data.data.userId,
      email: registerResponse.data.data.email
    });

    // Проверяем, увеличился ли счетчик
    const countResponse = await axios.get(`${BASE_URL}/invites/count/${TEST_USER_ID}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Счетчик инвайтов после регистрации:', countResponse.data);

  } catch (error) {
    console.log('❌ Ошибка при тестировании регистрации с инвайтом:', error.response?.data || error.message);
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Запуск тестов функциональности инвайтов\n');
  
  await testInvitesAPI();
  await testRegistrationWithInvite();
  
  console.log('\n✅ Тестирование завершено!');
}

// Запуск тестов, если файл выполняется напрямую
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testInvitesAPI,
  testRegistrationWithInvite,
  runTests
}; 