const Coupon = require('../models/Coupon');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * Helper to compute discount for a given orderAmount and coupon document
 */
const calculateDiscount = (coupon, orderAmount) => {
  if (!coupon.isActive) {
    throw new Error('This coupon is currently inactive');
  }

  const now = new Date();
  if (new Date(coupon.validTill) < now) {
    throw new Error('This coupon has expired');
  }

  if (orderAmount < coupon.minOrderValue) {
    throw new Error(
      `Minimum order amount of ₹${coupon.minOrderValue} is required to apply this coupon`
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((orderAmount * (coupon.value / 100)) * 100) / 100;
  } else if (coupon.discountType === 'flat') {
    discountAmount = Math.min(coupon.value, orderAmount);
  }

  const finalAmount = Math.max(0, Math.round((orderAmount - discountAmount) * 100) / 100);

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    discountAmount,
    finalAmount
  };
};

/**
 * @desc    Apply and validate a coupon for an order amount
 * @route   POST /api/coupons/apply
 * @access  Private (Authenticated)
 */
const applyCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return sendError(res, 404, 'Invalid coupon code', 'NOT_FOUND');
    }

    try {
      const result = calculateDiscount(coupon, Number(orderAmount));
      return sendSuccess(res, 200, 'Coupon applied successfully', result);
    } catch (err) {
      return sendError(res, 400, err.message, 'BUSINESS_RULE_ERROR');
    }
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get all coupons (Admin can view all; others see only active & unexpired)
 * @route   GET /api/coupons
 * @access  Private (Authenticated)
 */
const getCoupons = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== 'Admin') {
      filter.isActive = true;
      filter.validTill = { $gte: new Date() };
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Coupons retrieved successfully', { coupons });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create a new coupon
 * @route   POST /api/coupons
 * @access  Private (Admin)
 */
const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, value, validTill, minOrderValue, isActive } = req.body;

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existingCoupon) {
      return sendError(res, 409, `Coupon with code '${code}' already exists`, 'BUSINESS_RULE_ERROR');
    }

    if (discountType === 'percentage' && value > 100) {
      return sendError(res, 400, 'Percentage discount cannot exceed 100%', 'VALIDATION_ERROR');
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      value: Number(value),
      validTill: new Date(validTill),
      minOrderValue: Number(minOrderValue) || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    return sendSuccess(res, 201, 'Coupon created successfully', { coupon });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update a coupon
 * @route   PUT /api/coupons/:id
 * @access  Private (Admin)
 */
const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return sendError(res, 404, 'Coupon not found', 'NOT_FOUND');
    }

    if (req.body.code) {
      const duplicate = await Coupon.findOne({
        _id: { $ne: id },
        code: req.body.code.toUpperCase().trim()
      });
      if (duplicate) {
        return sendError(res, 409, `Coupon code '${req.body.code}' already exists`, 'BUSINESS_RULE_ERROR');
      }
      req.body.code = req.body.code.toUpperCase().trim();
    }

    const updated = await Coupon.findByIdAndUpdate(id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    return sendSuccess(res, 200, 'Coupon updated successfully', { coupon: updated });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete a coupon
 * @route   DELETE /api/coupons/:id
 * @access  Private (Admin)
 */
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return sendError(res, 404, 'Coupon not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Coupon deleted successfully', { id: req.params.id });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  calculateDiscount,
  applyCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
