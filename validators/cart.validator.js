const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addToCartSchema = Joi.object({
  productId: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'productId must be a valid 24-character hexadecimal ObjectId',
    'any.required': 'productId is required'
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Quantity must be a number',
    'number.min': 'Quantity must be at least 1'
  })
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  })
});

module.exports = {
  addToCartSchema,
  updateCartItemSchema
};
