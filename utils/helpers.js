/**
 * Custom Application Error class for domain & business rule violations
 */
class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized success response sender
 */
const sendSuccess = (res, statusCode = 200, message = 'Operation successful', data = null) => {
  const response = {
    success: true,
    message
  };
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

/**
 * Standardized error response sender
 */
const sendError = (res, statusCode = 400, message = 'An error occurred', errorCode = 'ERROR', details = null) => {
  const response = {
    success: false,
    message,
    errorCode
  };
  if (details) {
    response.details = details;
  }
  return res.status(statusCode).json(response);
};

/**
 * Get configured low-stock threshold from environment
 */
const getLowStockThreshold = () => {
  const parsed = parseInt(process.env.LOW_STOCK_THRESHOLD, 10);
  return Number.isNaN(parsed) ? 5 : parsed;
};

module.exports = {
  AppError,
  sendSuccess,
  sendError,
  getLowStockThreshold
};
