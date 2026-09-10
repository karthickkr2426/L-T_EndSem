const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { sendSuccess, getLowStockThreshold } = require('../utils/helpers');

/**
 * @desc    Get high-level platform overview metrics
 * @route   GET /api/admin/reports/overview
 * @access  Private (Admin)
 */
const getOverviewReport = async (req, res, next) => {
  try {
    const [totalUsers, totalProducts, totalCategories, orderStats] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Category.countDocuments(),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0]
              }
            },
            totalDiscounts: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Cancelled'] }, '$discountAmount', 0]
              }
            }
          }
        }
      ])
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, totalDiscounts: 0 };

    return sendSuccess(res, 200, 'Admin platform overview retrieved', {
      totalUsers,
      totalProducts,
      totalCategories,
      totalOrders: stats.totalOrders,
      totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
      totalDiscounts: Math.round(stats.totalDiscounts * 100) / 100
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get sales analytics and time-series trends
 * @route   GET /api/admin/reports/sales
 * @access  Private (Admin)
 */
const getSalesReport = async (req, res, next) => {
  try {
    // 1. Overall sales numbers
    const overallStats = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const summary = overallStats[0] || {
      totalRevenue: 0,
      totalDiscount: 0,
      orderCount: 0,
      avgOrderValue: 0
    };

    // 2. Sales grouped by day (last 30 days)
    const salesByDay = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Sales breakdown by payment mode
    const paymentModeBreakdown = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: '$paymentMode',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    return sendSuccess(res, 200, 'Sales report generated successfully', {
      summary: {
        totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
        totalDiscount: Math.round(summary.totalDiscount * 100) / 100,
        orderCount: summary.orderCount,
        avgOrderValue: Math.round(summary.avgOrderValue * 100) / 100
      },
      salesByDay,
      paymentModeBreakdown
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get product performance, top-sellers, and category breakdown
 * @route   GET /api/admin/reports/products
 * @access  Private (Admin)
 */
const getProductReport = async (req, res, next) => {
  try {
    const threshold = getLowStockThreshold();

    // 1. Stock health
    const [outOfStockCount, lowStockCount, totalProducts] = await Promise.all([
      Product.countDocuments({ stock: 0 }),
      Product.countDocuments({ stock: { $gt: 0, $lte: threshold } }),
      Product.countDocuments()
    ]);

    // 2. Top-selling products
    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 10 }
    ]);

    // 3. Products per category distribution
    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: '$categoryId',
          productCount: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 1,
          categoryName: '$category.name',
          productCount: 1,
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      },
      { $sort: { productCount: -1 } }
    ]);

    return sendSuccess(res, 200, 'Product report generated successfully', {
      stockOverview: {
        totalProducts,
        outOfStock: outOfStockCount,
        lowStock: lowStockCount,
        lowStockThreshold: threshold
      },
      topProducts,
      categoryDistribution
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get user demographics and registration growth
 * @route   GET /api/admin/reports/users
 * @access  Private (Admin)
 */
const getUserReport = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();

    // Breakdown by role
    const roleBreakdown = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Registration growth grouped by day
    const registrationTrend = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newUsers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return sendSuccess(res, 200, 'User report generated successfully', {
      totalUsers,
      roleBreakdown,
      registrationTrend
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get order status and payment status distribution
 * @route   GET /api/admin/reports/orders
 * @access  Private (Admin)
 */
const getOrderReport = async (req, res, next) => {
  try {
    // Distribution by Order Status
    const statusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Distribution by Payment Status
    const paymentStatusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    return sendSuccess(res, 200, 'Order report generated successfully', {
      statusDistribution,
      paymentStatusDistribution
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOverviewReport,
  getSalesReport,
  getProductReport,
  getUserReport,
  getOrderReport
};
