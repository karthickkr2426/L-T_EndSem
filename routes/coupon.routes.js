const express = require('express');
const router = express.Router();

const {
  applyCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/coupon.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createCouponSchema,
  applyCouponSchema
} = require('../validators/coupon.validator');

// All coupon routes require authentication
router.use(authenticate);

// Validate/apply coupon for order
router.post('/apply', validate(applyCouponSchema), applyCoupon);

// List coupons
router.get('/', getCoupons);

// Admin-only coupon management
router.post('/', authorize('Admin'), validate(createCouponSchema), createCoupon);
router.put('/:id', authorize('Admin'), updateCoupon);
router.delete('/:id', authorize('Admin'), deleteCoupon);

module.exports = router;
