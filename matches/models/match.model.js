const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const matchSchema = new Schema({
  user1: {
    type: String,
    ref: 'User',
    required: true
  },
  user2: {
    type: String,
    ref: 'User',
    required: true
  },
  user1Liked: {
    type: Boolean,
    default: false
  },
  user2Liked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'matched', 'disliked'],
    default: 'pending'
  },
  feature: {
    type: String,
    enum: ['finder', 'fast', 'anonim'],
    default: 'finder'
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Ensure we have a compound index for user1 and user2 for efficient queries
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Индекс для TTL (Time To Live)
matchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure user1 is always lexicographically smaller than user2
matchSchema.pre('save', function(next) {
  if (this.user1.toString() > this.user2.toString()) {
    const temp = this.user1;
    this.user1 = this.user2;
    this.user2 = temp;
    
    // Swap the liked statuses as well
    const tempLiked = this.user1Liked;
    this.user1Liked = this.user2Liked;
    this.user2Liked = tempLiked;
  }
  
  // Если статус "disliked", устанавливаем дату удаления через 10 дней
  // Для matched и pending статусов убираем дату удаления
  if (this.status === 'disliked') {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    this.expiresAt = tenDaysFromNow;
  } else {
    this.expiresAt = null;
  }
  
  next();
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match; 