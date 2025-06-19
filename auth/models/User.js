const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return typeof v === 'string' && v.length > 0;
      },
      message: 'userId должен быть непустой строкой'
    }
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);
      },
      message: 'Неверный формат email'
    }
  },
  one_night: { type: Boolean, default: false },
  // Массив userId пользователей, которых нужно исключить из поиска
  excludedUsers: {
    type: [String],
    default: function() {
      // По умолчанию включаем только ID текущего пользователя
      return this.userId ? [this.userId] : [];
    }
  },
  // Массив ID аудиосообщений, которые нужно исключить из поиска
  exclude_audio: {
    type: [String],
    default: []
  },
  // Массив userId пользователей, с которыми произошел мэтч
  matches: {
    type: [String],
    default: []
  },
  // Поля профиля (заполняются позже)
  isProfileCompleted: { type: Boolean, default: false },
  name: { type: String, maxlength: 100 },
  birthday: { type: String }, // Дата рождения в формате ISO
  gender: { 
    type: String, 
    enum: ['', 'man', 'woman', 'other'],
    required: false,
    sparse: true
  },
  lookingFor: { 
    type: String, 
    enum: ['', 'man', 'woman', 'other', 'all'],
    required: false,
    sparse: true
  },
  about: { type: String, maxlength: 300 },
  photos: { type: [String], default: [] },
  searchDistance: { type: Number, min: 1, max: 100 },
  fast_searchDistance: { type: Number, min: 1, max: 30, default: 30 },
  ageMin: { type: Number, min: 18, max: 100 },
  ageMax: { type: Number, min: 18, max: 100 },
  fast_match_active: { type: Boolean, default: false },
  // Поля для геолокации
  real_loc: {
    latitude: { 
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -90 && v <= 90;
        },
        message: 'Широта должна быть в диапазоне от -90 до 90'
      }
    },
    longitude: { 
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -180 && v <= 180;
        },
        message: 'Долгота должна быть в диапазоне от -180 до 180'
      }
    }
  },
  real_loc_country: { type: String, trim: true },
  change_loc: {
    latitude: { 
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -90 && v <= 90;
        },
        message: 'Широта должна быть в диапазоне от -90 до 90'
      }
    },
    longitude: { 
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -180 && v <= 180;
        },
        message: 'Долгота должна быть в диапазоне от -180 до 180'
      }
    }
  },
  change_loc_country: { type: String, trim: true },
  // Добавляем поля для настроек маркета
  market_ageMin: { type: Number, min: 18, max: 100, default: 18 },
  market_ageMax: { type: Number, min: 18, max: 100, default: 100 },
  market_lookingFor: { 
    type: String, 
    enum: ['man', 'woman', 'other', 'all'],
    default: 'all'
  },
  market_searchDistance: { type: Number, min: 1, max: 100, default: 100 },
  market_location: {
    latitude: { 
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -90 && v <= 90;
        },
        message: 'Широта должна быть в диапазоне от -90 до 90'
      }
    },
    longitude: { 
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -180 && v <= 180;
        },
        message: 'Долгота должна быть в диапазоне от -180 до 180'
      }
    }
  },
  market_location_country: { type: String, trim: true },
  // Добавляем массив ID маркетных карточек пользователя
  market_cards: { type: [String], default: [] },
  // Добавляем массив ID заблокированных пользователей
  blocked_users: [{
    type: String,
    ref: 'User'
  }],
  blocked_market_users: [{
    type: String,
    ref: 'User'
  }],
  // Добавляем массив ID исключенных маркетных карточек
  market_card_exclude: [{
    type: String,
    ref: 'User'
  }],
  // Поля для аутентификации
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  firebaseUid: {
    type: String,
    required: false,
    sparse: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
}, { 
  timestamps: true,
  strict: true // Запрещаем добавление полей, которых нет в схеме
});

// Добавляем индексы
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });

// Метод для обновления профиля
userSchema.methods.updateProfile = function(profileData) {
  console.log('Обновление профиля пользователя:', this.userId);
  console.log('Новые данные:', profileData);
  Object.assign(this, profileData);
  this.isProfileCompleted = true;
  return this.save();
};

// Middleware для логирования
userSchema.pre('save', function(next) {
  console.log('Сохранение пользователя:', {
    userId: this.userId,
    email: this.email,
    isProfileCompleted: this.isProfileCompleted
  });
  next();
});

// Хэширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);