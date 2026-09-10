const express = require('express');
const router = express.Router();

const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema
} = require('../validators/category.validator');

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-only management routes
router.post(
  '/',
  authenticate,
  authorize('Admin'),
  validate(createCategorySchema),
  createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('Admin'),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('Admin'),
  deleteCategory
);

module.exports = router;
