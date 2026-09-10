const { AppError } = require('../utils/helpers');

/**
 * Centralized Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error]: ${err.name} - ${err.message}`);
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for resource identifier: ${err.value}`,
      errorCode: 'NOT_FOUND'
    });
  }

  // Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value entered for '${field}'. This resource already exists.`,
      errorCode: 'BUSINESS_RULE_ERROR'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ') || 'Validation failed',
      errorCode: 'VALIDATION_ERROR'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication required',
      errorCode: 'UNAUTHORIZED'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired. Please log in again',
      errorCode: 'UNAUTHORIZED'
    });
  }

  // Operational AppError instances
  if (err instanceof AppError) {
    const response = {
      success: false,
      message: err.message,
      errorCode: err.errorCode
    };
    if (err.details) {
      response.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Default unexpected server error
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    errorCode: 'SERVER_ERROR'
  });
};

module.exports = errorHandler;
