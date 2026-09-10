const Joi = require('joi');

const createCouponSchema = Joi.object({
  code: Joi.string().min(3).max(30).uppercase().trim().required().messages({
    'string.empty': 'Coupon code is required',
    'string.min': 'Coupon code must be at least 3 characters long'
  }),
  discountType: Joi.string().valid('percentage', 'flat').required().messages({
    'any.required': 'Discount type is required',
    'any.only': 'Discount type must be percentage or flat'
  }),
  value: Joi.number().min(1).required().messages({
    'number.base': 'Discount value must be a number',
    'number.min': 'Discount value must be at least 1',
    'any.required': 'Discount value is required'
  }),
  validTill: Joi.date().iso().greater('now').required().messages({
    'date.greater': 'Expiration date must be in the future',
    'any.required': 'Expiration date is required'
  }),
  minOrderValue: Joi.number().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

const applyCouponSchema = Joi.object({
  code: Joi.string().trim().required().messages({
    'string.empty': 'Coupon code is required',
    'any.required': 'Coupon code is required'
  }),
  orderAmount: Joi.number().min(0).required().messages({
    'number.base': 'orderAmount must be a number',
    'number.min': 'orderAmount cannot be negative',
    'any.required': 'orderAmount is required'
  })
});

module.exports = {
  createCouponSchema,
  applyCouponSchema
};
