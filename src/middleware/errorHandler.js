class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Оборачивает async-обработчики, чтобы ошибки попадали в errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (req, res, next) => {
  next(new AppError(404, `Маршрут ${req.method} ${req.originalUrl} не найден`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Некорректный JSON в теле запроса
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON' });
  }

  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Ошибки Prisma
  switch (err.code) {
    case 'P2002':
      return res.status(409).json({
        error: 'Запись с такими уникальными полями уже существует',
        fields: err.meta && err.meta.target,
      });
    case 'P2025':
      return res.status(404).json({ error: 'Запись не найдена' });
    case 'P2003':
      return res.status(400).json({ error: 'Нарушено ограничение внешнего ключа' });
    default:
      break;
  }

  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};

module.exports = { AppError, asyncHandler, notFound, errorHandler };
