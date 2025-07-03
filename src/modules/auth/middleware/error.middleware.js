const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Обработка ошибки дубликата (например, для email)
  if (err.code === 11000) {
    return res.status(409).json({
      status: 'fail',
      message: 'Email уже зарегистрирован'
    });
  }

  // Обработка ошибок валидации Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({
      status: 'fail',
      message: errors.join('. ')
    });
  }

  // Обработка остальных ошибок
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

module.exports = {
  errorHandler
}; 