const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { calculateDiscount } = require('./coupon.controller');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * Valid status transitions state machine
 */
const VALID_TRANSITIONS = {
  Placed: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: []
};

/**
 * @desc    Create/Place a new order from active shopping cart
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
const placeOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMode = 'COD', couponCode } = req.body;

    // 1. Fetch customer cart
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart || cart.items.length === 0) {
      return sendError(
        res,
        400,
        'Cannot place order with an empty cart. Please add items first.',
        'BUSINESS_RULE_ERROR'
      );
    }

    // 2. Validate products, check stock, and calculate totals
    const orderItems = [];
    let grossTotal = 0;
    const decrementedProducts = [];

    // First pass: verify product existence and current stock
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return sendError(
          res,
          404,
          `Product in cart with ID '${item.productId}' no longer exists`,
          'NOT_FOUND'
        );
      }

      if (product.stock < item.quantity) {
        return sendError(
          res,
          400,
          `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${item.quantity}`,
          'BUSINESS_RULE_ERROR'
        );
      }

      const itemSubtotal = Math.round(product.price * item.quantity * 100) / 100;
      grossTotal += itemSubtotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });
    }

    grossTotal = Math.round(grossTotal * 100) / 100;

    // 3. Process coupon if provided
    let discountAmount = 0;
    let finalAmount = grossTotal;
    let validCouponCode = null;

    if (couponCode && couponCode.trim() !== '') {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (!coupon) {
        return sendError(res, 404, `Coupon code '${couponCode}' is invalid`, 'NOT_FOUND');
      }

      try {
        const discountResult = calculateDiscount(coupon, grossTotal);
        discountAmount = discountResult.discountAmount;
        finalAmount = discountResult.finalAmount;
        validCouponCode = coupon.code;
      } catch (err) {
        return sendError(res, 400, err.message, 'BUSINESS_RULE_ERROR');
      }
    }

    // 4. Concurrency-safe atomic stock decrement
    for (const item of orderItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity }
        },
        {
          $inc: { stock: -item.quantity }
        },
        { returnDocument: 'after' }
      );

      if (!updatedProduct) {
        // Rollback already decremented products in case of concurrency race condition
        for (const dec of decrementedProducts) {
          await Product.findByIdAndUpdate(dec.productId, {
            $inc: { stock: dec.quantity }
          });
        }

        return sendError(
          res,
          400,
          `Concurrent purchase conflict: Stock for '${item.productName}' just became insufficient`,
          'BUSINESS_RULE_ERROR'
        );
      }

      decrementedProducts.push({
        productId: item.productId,
        quantity: item.quantity
      });
    }

    // 5. Create Order
    const order = await Order.create({
      userId: req.user.id,
      items: orderItems,
      totalAmount: finalAmount,
      discountAmount,
      couponCode: validCouponCode,
      shippingAddress,
      status: 'Placed',
      paymentMode,
      paymentStatus: paymentMode === 'COD' ? 'Pending' : 'Pending'
    });

    // 6. Clear customer cart
    cart.items = [];
    await cart.save();

    return sendSuccess(res, 201, 'Order placed successfully', { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get user's orders (Customer: own orders, Admin: all, Seller: orders containing seller's products)
 * @route   GET /api/orders
 * @access  Private (Authenticated)
 */
const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.user.role === 'Customer') {
      filter.userId = req.user.id;
    } else if (req.user.role === 'Seller') {
      // Find products belonging to this seller
      const sellerProducts = await Product.find({ sellerId: req.user.id }).select('_id');
      const productIds = sellerProducts.map((p) => p._id);
      filter['items.productId'] = { $in: productIds };
    }
    // Admin has no filter constraint

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const totalOrders = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, 200, 'Orders retrieved successfully', {
      orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get single order details by ID
 * @route   GET /api/orders/:id
 * @access  Private (Customer, Seller, Admin)
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) {
      return sendError(res, 404, 'Order not found', 'NOT_FOUND');
    }

    // Role authorization check
    if (req.user.role === 'Customer' && order.userId._id.toString() !== req.user.id.toString()) {
      return sendError(res, 403, 'You do not have permission to view another customer’s order', 'FORBIDDEN');
    }

    if (req.user.role === 'Seller') {
      const sellerProducts = await Product.find({ sellerId: req.user.id }).select('_id');
      const sellerProductIds = sellerProducts.map((p) => p._id.toString());
      const hasSellerProduct = order.items.some((item) =>
        sellerProductIds.includes(item.productId.toString())
      );

      if (!hasSellerProduct) {
        return sendError(
          res,
          403,
          'You do not have permission to view this order (does not contain your products)',
          'FORBIDDEN'
        );
      }
    }

    return sendSuccess(res, 200, 'Order retrieved successfully', { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update order status according to strict transition workflow
 * @route   PUT /api/orders/:id/status
 * @access  Private (Admin, Seller, or Customer for Placed cancellation)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 404, 'Order not found', 'NOT_FOUND');
    }

    const currentStatus = order.status;

    // Validate if current status has allowed transitions
    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowedTargets.join(', ')}]`,
        errorCode: 'INVALID_STATUS_TRANSITION'
      });
    }

    // Authorization checks
    if (req.user.role === 'Customer') {
      // Customer can ONLY cancel their own order if currently Placed
      if (order.userId.toString() !== req.user.id.toString()) {
        return sendError(res, 403, 'You can only manage your own orders', 'FORBIDDEN');
      }
      if (targetStatus !== 'Cancelled' || currentStatus !== 'Placed') {
        return sendError(
          res,
          403,
          'Customers can only cancel orders in "Placed" status',
          'FORBIDDEN'
        );
      }
    } else if (req.user.role === 'Seller') {
      // Seller must own at least one product in this order
      const sellerProducts = await Product.find({ sellerId: req.user.id }).select('_id');
      const sellerProductIds = sellerProducts.map((p) => p._id.toString());
      const hasSellerProduct = order.items.some((item) =>
        sellerProductIds.includes(item.productId.toString())
      );

      if (!hasSellerProduct) {
        return sendError(
          res,
          403,
          'You can only update status for orders containing your products',
          'FORBIDDEN'
        );
      }
    }

    // Apply transition
    order.status = targetStatus;

    // Replenish inventory if order is cancelled
    if (targetStatus === 'Cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    }

    await order.save();

    return sendSuccess(res, 200, `Order status updated to '${targetStatus}'`, { order });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update payment status (Mock payment gateway tracking)
 * @route   PUT /api/orders/:id/payment
 * @access  Private (Authenticated)
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 404, 'Order not found', 'NOT_FOUND');
    }

    // Customer can only simulate payment on their own order
    if (req.user.role === 'Customer' && order.userId.toString() !== req.user.id.toString()) {
      return sendError(res, 403, 'You can only update payment for your own order', 'FORBIDDEN');
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    return sendSuccess(res, 200, `Payment status updated to '${paymentStatus}'`, { order });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  placeOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus
};
