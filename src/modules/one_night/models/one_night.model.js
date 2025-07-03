const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const oneNightSchema = new Schema({
    userId1: {
        type: String,
        required: true,
        ref: 'User'
    },
    user1status: {
        type: Boolean,
        default: false
    },
    userId2: {
        type: String,
        required: true,
        ref: 'User'
    },
    user2status: {
        type: Boolean,
        default: null
    },
    status: {
        type: String,
        enum: ['create', 'delete'],
        default: null
    }
}, { timestamps: true });

// Создаем составной индекс для быстрого поиска
oneNightSchema.index({ userId1: 1, userId2: 1 }, { unique: true });

const OneNight = mongoose.model('OneNight', oneNightSchema);

module.exports = OneNight; 