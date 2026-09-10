const Joi = require('joi');

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required'
  }),
  comment: Joi.string().min(3).max(1000).required().messages({
    'string.empty': 'Review comment is required',
    'string.min': 'Review comment must be at least 3 characters long',
    'any.required': 'Review comment is required'
  })
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().min(3).max(1000)
}).min(1);

module.exports = {
  createReviewSchema,
  updateReviewSchema
};
