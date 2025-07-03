const mongoose = require('mongoose');

const marketCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const MarketCounter = mongoose.model('MarketCounter', marketCounterSchema);

// Инициализация счетчика, если он не существует
const initMarketCounter = async () => {
  try {
    const counter = await MarketCounter.findById('marketCardId');
    if (!counter) {
      await new MarketCounter({ _id: 'marketCardId', seq: 0 }).save();
      console.log('Счетчик marketCardId инициализирован');
    }
  } catch (error) {
    console.error('Ошибка при инициализации счетчика marketCardId:', error);
  }
};

// Получить следующий marketCardId
const getNextMarketCardId = async () => {
  try {
    const counter = await MarketCounter.findByIdAndUpdate(
      'marketCardId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    if (!counter || typeof counter.seq !== 'number' || isNaN(counter.seq)) {
      throw new Error('Некорректное значение счетчика marketCardId');
    }
    
    const marketCardId = counter.seq.toString();
    console.log('Сгенерирован marketCardId:', marketCardId);
    return marketCardId;
  } catch (error) {
    console.error('Ошибка при генерации marketCardId:', error);
    throw new Error('Не удалось сгенерировать marketCardId');
  }
};

module.exports = {
  MarketCounter,
  initMarketCounter,
  getNextMarketCardId
}; 