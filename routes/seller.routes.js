const express = require('express');
const router = express.Router();

const {
  getSellerDashboard,
  getProductPerformance,
  getPendingOrders,
  getLowStockProducts
} = require('../controllers/seller.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// All seller routes require Seller or Admin role
router.use(authenticate);
router.use(authorize('Seller', 'Admin'));

router.get('/dashboard', getSellerDashboard);
router.get('/products/performance', getProductPerformance);
router.get('/orders/pending', getPendingOrders);
router.get('/products/low-stock', getLowStockProducts);

module.exports = router;
