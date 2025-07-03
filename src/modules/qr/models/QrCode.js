const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Схема для QR-кодов
 * Поддерживает как постоянные, так и передаваемые QR-коды
 */
const QrCodeSchema = new Schema({
  qr_id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  user_id: { 
    type: String,
    index: true 
  },
  is_permanent: { 
    type: Boolean, 
    default: false 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  message: { 
    type: String, 
    default: '' 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  last_claimed_by: { 
    type: String
  },
  last_claimed_at: Date,
  last_scanned_at: Date,
  scan_count: { 
    type: Number, 
    default: 0 
  },
  created_by_admin: { 
    type: String
  }
});

// Индексы для оптимизации запросов
QrCodeSchema.index({ user_id: 1, is_permanent: 1 });
QrCodeSchema.index({ is_active: 1 });

// Метод для обновления последнего использования QR-кода
QrCodeSchema.methods.updateLastUsed = function() {
  this.last_scanned_at = new Date();
  return this.save();
};

// Метод для передачи QR-кода новому пользователю
QrCodeSchema.methods.transferToUser = function(newUserId, message) {
  if (this.is_permanent) {
    throw new Error('Только передаваемые QR коды могут быть переданы');
  }
  
  // Сохраняем предыдущего владельца
  this.last_claimed_by = this.user_id;
  // Устанавливаем нового владельца
  this.user_id = newUserId;
  // Обновляем сообщение
  if (message) {
    this.message = message;
  }
  // Увеличиваем счетчик сканирований
  this.scan_count = (this.scan_count || 0) + 1;
  // Обновляем время последнего использования
  this.last_claimed_at = new Date();
  
  return this.save();
};

module.exports = mongoose.model('QrCode', QrCodeSchema); 