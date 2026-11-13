const { AppError } = require('./errorHandler');

// validate(schema, 'body' | 'query' | 'params')
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return next(new AppError(400, 'Ошибка валидации', details));
  }

  req[source] = value;
  next();
};

module.exports = validate;
