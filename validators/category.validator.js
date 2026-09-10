const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters long'
  }),
  parentCategoryId: Joi.string()
    .regex(objectIdPattern)
    .allow(null, '')
    .optional()
    .messages({
      'string.pattern.base': 'parentCategoryId must be a valid 24-character hexadecimal ObjectId'
    })
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  parentCategoryId: Joi.string()
    .regex(objectIdPattern)
    .allow(null, '')
    .optional()
    .messages({
      'string.pattern.base': 'parentCategoryId must be a valid 24-character hexadecimal ObjectId'
    })
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
