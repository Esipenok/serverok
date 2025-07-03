const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fastMatchSchema = new Schema({
  user_first: {
    type: String,
    ref: 'User',
    required: true
  },
  user_second: {
    type: String,
    ref: 'User',
    required: true
  },
  user_first_status: {
    type: Boolean,
    default: false
  },
  user_second_status: {
    type: Boolean,
    default: false
  },
  start_timer: {
    type: Date,
    default: Date.now
  },
  feature: {
    type: String,
    default: 'fast'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Устанавливаем время жизни 10 минут с момента создания
      const expireDate = new Date();
      expireDate.setMinutes(expireDate.getMinutes() + 10);
      return expireDate;
    },
    index: { expires: 0 } // Добавляем индекс непосредственно к полю
  }
}, { timestamps: true });

// Ensure we have a compound index for user_first and user_second for efficient queries
fastMatchSchema.index({ user_first: 1, user_second: 1 }, { unique: true });

// TTL индекс для автоматического удаления записей - более явное определение
fastMatchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true, name: 'expiresAt_ttl_index' });

const FastMatch = mongoose.model('FastMatch', fastMatchSchema);

// Функция для принудительного обновления индексов
async function ensureIndexes() {
  try {
    console.log('Обновление TTL индексов для FastMatch...');
    await FastMatch.collection.dropIndex('expiresAt_1').catch(() => console.log('Индекс expiresAt_1 не существует, создаем новый'));
    await FastMatch.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true, name: 'expiresAt_ttl_index' });
    console.log('TTL индекс обновлен успешно!');
  } catch (error) {
    console.error('Ошибка при обновлении TTL индекса:', error);
  }
}

// Экспортируем и модель, и функцию обновления индексов
module.exports = FastMatch;
module.exports.ensureIndexes = ensureIndexes; 