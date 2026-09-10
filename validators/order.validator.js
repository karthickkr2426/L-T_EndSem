const Joi = require('joi');

const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    street: Joi.string().required().messages({ 'string.empty': 'Street address is required' }),
    city: Joi.string().required().messages({ 'string.empty': 'City is required' }),
    state: Joi.string().required().messages({ 'string.empty': 'State is required' }),
    zipCode: Joi.string().required().messages({ 'string.empty': 'Zip code is required' }),
    country: Joi.string().required().messages({ 'string.empty': 'Country is required' })
  }).required(),
  paymentMode: Joi.string().valid('COD', 'CARD', 'UPI').default('COD'),
  couponCode: Joi.string().allow('', null).optional()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled')
    .required()
    .messages({
      'any.required': 'Order status is required',
      'any.only': 'Invalid status. Must be Placed, Confirmed, Shipped, Delivered, or Cancelled'
    })
});

const updatePaymentStatusSchema = Joi.object({
  paymentStatus: Joi.string()
    .valid('Pending', 'Paid', 'Failed', 'Refunded')
    .required()
    .messages({
      'any.required': 'Payment status is required',
      'any.only': 'Invalid payment status. Must be Pending, Paid, Failed, or Refunded'
    })
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema
};
