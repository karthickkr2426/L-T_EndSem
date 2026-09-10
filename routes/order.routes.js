const express = require('express');
const router = express.Router();

const {
  placeOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus
} = require('../controllers/order.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema
} = require('../validators/order.validator');

// All order routes require authentication
router.use(authenticate);

// Place order (Customer only)
router.post(
  '/',
  authorize('Customer'),
  validate(createOrderSchema),
  placeOrder
);

// View orders
router.get('/', getOrders);
router.get('/:id', getOrderById);

// Update status (Customer [cancel only], Seller, Admin)
router.put(
  '/:id/status',
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

// Update payment status (Mock payment tracking)
router.put(
  '/:id/payment',
  validate(updatePaymentStatusSchema),
  updatePaymentStatus
);

module.exports = router;
