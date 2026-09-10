const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendSuccess, sendError, getLowStockThreshold } = require('../utils/helpers');

/**
 * @desc    Get comprehensive seller dashboard analytics
 * @route   GET /api/seller/dashboard
 * @access  Private (Seller, Admin)
 */
const getSellerDashboard = async (req, res, next) => {
  try {
    const sellerId = req.user.role === 'Admin' && req.query.sellerId ? req.query.sellerId : req.user.id;
    const sellerObjId = new mongoose.Types.ObjectId(sellerId);

    // 1. Total products count
    const totalProducts = await Product.countDocuments({ sellerId: sellerObjId });

    // 2. Fetch all product IDs for this seller
    const sellerProducts = await Product.find({ sellerId: sellerObjId }).select('_id');
    const productIds = sellerProducts.map((p) => p._id);

    // 3. Low stock threshold and count
    const threshold = getLowStockThreshold();
    const lowStockCount = await Product.countDocuments({
      sellerId: sellerObjId,
      stock: { $lte: threshold }
    });

    // 4. Aggregate revenue and units sold
    const salesStats = await Order.aggregate([
      {
        $match: {
          'items.productId': { $in: productIds },
          status: { $ne: 'Cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': { $in: productIds }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.subtotal' },
          totalUnitsSold: { $sum: '$items.quantity' }
        }
      }
    ]);

    const totalRevenue = salesStats.length > 0 ? Math.round(salesStats[0].totalRevenue * 100) / 100 : 0;
    const totalUnitsSold = salesStats.length > 0 ? salesStats[0].totalUnitsSold : 0;

    // 5. Order counts by status for this seller
    const pendingOrdersCount = await Order.countDocuments({
      'items.productId': { $in: productIds },
      status: { $in: ['Placed', 'Confirmed'] }
    });

    const deliveredOrdersCount = await Order.countDocuments({
      'items.productId': { $in: productIds },
      status: 'Delivered'
    });

    // 6. Top-performing products (Top 5)
    const topProducts = await Order.aggregate([
      {
        $match: {
          'items.productId': { $in: productIds },
          status: { $ne: 'Cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 }
    ]);

    return sendSuccess(res, 200, 'Seller dashboard data retrieved successfully', {
      metrics: {
        totalProducts,
        totalUnitsSold,
        totalRevenue,
        pendingOrders: pendingOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        lowStockProducts: lowStockCount,
        lowStockThreshold: threshold
      },
      topProducts
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get detailed product performance metrics for seller
 * @route   GET /api/seller/products/performance
 * @access  Private (Seller, Admin)
 */
const getProductPerformance = async (req, res, next) => {
  try {
    const sellerId = req.user.role === 'Admin' && req.query.sellerId ? req.query.sellerId : req.user.id;
    const sellerObjId = new mongoose.Types.ObjectId(sellerId);

    const sellerProducts = await Product.find({ sellerId: sellerObjId });
    const productIds = sellerProducts.map((p) => p._id);

    const salesPerProduct = await Order.aggregate([
      {
        $match: {
          'items.productId': { $in: productIds },
          status: { $ne: 'Cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$items.productId',
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const salesMap = {};
    salesPerProduct.forEach((item) => {
      salesMap[item._id.toString()] = {
        unitsSold: item.unitsSold,
        revenue: Math.round(item.revenue * 100) / 100,
        orderCount: item.orderCount
      };
    });

    const performance = sellerProducts.map((product) => {
      const stats = salesMap[product._id.toString()] || { unitsSold: 0, revenue: 0, orderCount: 0 };
      return {
        id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        ratingAvg: product.ratingAvg,
        ratingCount: product.ratingCount,
        unitsSold: stats.unitsSold,
        revenue: stats.revenue,
        orderCount: stats.orderCount
      };
    });

    return sendSuccess(res, 200, 'Product performance retrieved successfully', { performance });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get pending orders containing seller's products
 * @route   GET /api/seller/orders/pending
 * @access  Private (Seller, Admin)
 */
const getPendingOrders = async (req, res, next) => {
  try {
    const sellerId = req.user.role === 'Admin' && req.query.sellerId ? req.query.sellerId : req.user.id;
    const sellerObjId = new mongoose.Types.ObjectId(sellerId);

    const sellerProducts = await Product.find({ sellerId: sellerObjId }).select('_id');
    const productIds = sellerProducts.map((p) => p._id);

    const pendingOrders = await Order.find({
      'items.productId': { $in: productIds },
      status: { $in: ['Placed', 'Confirmed'] }
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Pending orders retrieved successfully', {
      count: pendingOrders.length,
      orders: pendingOrders
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get low-stock products for seller
 * @route   GET /api/seller/products/low-stock
 * @access  Private (Seller, Admin)
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const sellerId = req.user.role === 'Admin' && req.query.sellerId ? req.query.sellerId : req.user.id;
    const threshold = getLowStockThreshold();

    const lowStockProducts = await Product.find({
      sellerId,
      stock: { $lte: threshold }
    }).sort({ stock: 1 });

    return sendSuccess(res, 200, 'Low-stock products retrieved successfully', {
      threshold,
      count: lowStockProducts.length,
      products: lowStockProducts
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSellerDashboard,
  getProductPerformance,
  getPendingOrders,
  getLowStockProducts
};
