const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview
} = require('../controllers/review.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createReviewSchema,
  updateReviewSchema
} = require('../validators/review.validator');

// When mounted on /api/products/:id/reviews
router.get('/', getProductReviews);
router.post(
  '/',
  authenticate,
  authorize('Customer'),
  validate(createReviewSchema),
  createReview
);

// When mounted on /api/reviews/:id
router.put('/:id', authenticate, validate(updateReviewSchema), updateReview);
router.delete('/:id', authenticate, deleteReview);

module.exports = router;
