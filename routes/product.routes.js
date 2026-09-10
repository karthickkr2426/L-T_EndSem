const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');

const reviewRoutes = require('./review.routes');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
  productQuerySchema
} = require('../validators/product.validator');

// Re-route into other resource routers
router.use('/:id/reviews', reviewRoutes);

// Public catalog routes
router.get('/', validate(productQuerySchema, 'query'), getProducts);
router.get('/:id', getProductById);

// Seller and Admin product management routes
router.post(
  '/',
  authenticate,
  authorize('Seller', 'Admin'),
  validate(createProductSchema),
  createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('Seller', 'Admin'),
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('Seller', 'Admin'),
  deleteProduct
);

module.exports = router;
