const express = require('express');
const router = express.Router();

const {
  getOverviewReport,
  getSalesReport,
  getProductReport,
  getUserReport,
  getOrderReport
} = require('../controllers/admin.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// All admin report routes require Admin role
router.use(authenticate);
router.use(authorize('Admin'));

router.get('/reports/overview', getOverviewReport);
router.get('/reports/sales', getSalesReport);
router.get('/reports/products', getProductReport);
router.get('/reports/users', getUserReport);
router.get('/reports/orders', getOrderReport);

module.exports = router;
