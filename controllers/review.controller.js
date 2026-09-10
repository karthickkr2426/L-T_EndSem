const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @desc    Get all reviews for a product
 * @route   GET /api/products/:id/reviews
 * @access  Public
 */
const getProductReviews = async (req, res, next) => {
  try {
    const { id: productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    const reviews = await Review.find({ productId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Product reviews retrieved successfully', {
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      reviews
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Add a review for a delivered product
 * @route   POST /api/products/:id/reviews
 * @access  Private (Customer)
 */
const createReview = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const { rating, comment } = req.body;

    // 1. Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    // 2. Prevent duplicate review
    const alreadyReviewed = await Review.findOne({
      productId,
      userId: req.user.id
    });
    if (alreadyReviewed) {
      return sendError(
        res,
        400,
        'You have already reviewed this product. You can update your existing review instead.',
        'BUSINESS_RULE_ERROR'
      );
    }

    // 3. Verify Customer has a DELIVERED order containing this product
    const deliveredOrder = await Order.findOne({
      userId: req.user.id,
      status: 'Delivered',
      'items.productId': productId
    });

    if (!deliveredOrder) {
      return sendError(
        res,
        403,
        'Review rejected: You can only review products from orders that have been successfully delivered to you.',
        'BUSINESS_RULE_ERROR'
      );
    }

    // 4. Create review
    const review = await Review.create({
      productId,
      userId: req.user.id,
      rating: Number(rating),
      comment: comment.trim()
    });

    // Populate user name
    const populatedReview = await Review.findById(review._id).populate('userId', 'name');

    // Fetch updated product stats
    const updatedProduct = await Product.findById(productId).select('ratingAvg ratingCount');

    return sendSuccess(res, 201, 'Review submitted successfully', {
      review: populatedReview,
      productStats: {
        ratingAvg: updatedProduct.ratingAvg,
        ratingCount: updatedProduct.ratingCount
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (Customer author)
 */
const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 404, 'Review not found', 'NOT_FOUND');
    }

    // Ownership check
    if (review.userId.toString() !== req.user.id.toString()) {
      return sendError(res, 403, 'You can only edit your own reviews', 'FORBIDDEN');
    }

    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment.trim();

    await review.save();

    // Trigger average rating recalculation
    await Review.calcAverageRating(review.productId);

    const updatedProduct = await Product.findById(review.productId).select('ratingAvg ratingCount');

    return sendSuccess(res, 200, 'Review updated successfully', {
      review,
      productStats: {
        ratingAvg: updatedProduct.ratingAvg,
        ratingCount: updatedProduct.ratingCount
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Customer author or Admin)
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 404, 'Review not found', 'NOT_FOUND');
    }

    // Ownership or Admin check
    if (req.user.role !== 'Admin' && review.userId.toString() !== req.user.id.toString()) {
      return sendError(res, 403, 'You do not have permission to delete this review', 'FORBIDDEN');
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);

    // Recalculate average rating
    await Review.calcAverageRating(productId);

    const updatedProduct = await Product.findById(productId).select('ratingAvg ratingCount');

    return sendSuccess(res, 200, 'Review deleted successfully', {
      id,
      productStats: {
        ratingAvg: updatedProduct.ratingAvg,
        ratingCount: updatedProduct.ratingCount
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview
};
