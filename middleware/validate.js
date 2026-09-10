/**
 * Generic Joi Validation Middleware
 * @param {Object} schema - Joi schema object
 * @param {string} source - 'body' | 'query' | 'params' (default 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      const primaryMessage = details.map((d) => d.message).join('; ');

      return res.status(400).json({
        success: false,
        message: primaryMessage || 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        details
      });
    }

    // Replace request payload with sanitized/casted values
    req[source] = value;
    return next();
  };
};

module.exports = validate;
