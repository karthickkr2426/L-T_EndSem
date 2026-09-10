const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required().messages({
    'string.empty': 'Product name is required'
  }),
  description: Joi.string().min(5).max(2000).required().messages({
    'string.empty': 'Product description is required'
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a valid number',
    'number.min': 'Price cannot be negative'
  }),
  categoryId: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'categoryId must be a valid 24-character hexadecimal ObjectId',
    'any.required': 'categoryId is required'
  }),
  stock: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Stock must be an integer',
    'number.min': 'Stock cannot be negative'
  }),
  images: Joi.array().items(Joi.string().uri().allow('')).default([])
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().min(5).max(2000),
  price: Joi.number().min(0),
  categoryId: Joi.string().regex(objectIdPattern),
  stock: Joi.number().integer().min(0),
  images: Joi.array().items(Joi.string())
}).min(1);

const productQuerySchema = Joi.object({
  search: Joi.string().allow('').optional(),
  categoryId: Joi.string().regex(objectIdPattern).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('price', 'ratingAvg', 'createdAt', 'name').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productQuerySchema
};
