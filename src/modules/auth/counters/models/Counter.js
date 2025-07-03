const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0, min: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Инициализация счетчика при первом запуске
const initCounter = async () => {
  try {
    const counter = await Counter.findById('userId');
    if (!counter) {
      await Counter.create({ _id: 'userId', seq: 0 });
      console.log('Counter initialized');
    }
  } catch (error) {
    console.error('Counter initialization error:', error);
  }
};

module.exports = { Counter, initCounter };