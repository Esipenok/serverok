const mongoose = require('mongoose');

const marketCardSchema = new mongoose.Schema({
  marketCardId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['man', 'woman', 'other'],
    required: true
  },
  birthday: {
    type: Date,
    required: true
  },
  preference: {
    type: String,
    enum: ['man', 'woman', 'other', 'all'],
    required: true
  },
  about: {
    type: String,
    default: ''
  },
  photos: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String
  },
  real_loc: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  real_loc_country: { type: String }
}, {
  timestamps: true
});

const MarketCard = mongoose.model('MarketCard', marketCardSchema);

module.exports = MarketCard; 