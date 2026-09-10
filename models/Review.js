const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [3, 'Comment must be at least 3 characters long']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index to prevent duplicate reviews by the same user for the same product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1 });
reviewSchema.index({ userId: 1 });

/**
 * Static method to calculate and update average rating on Product
 */
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { productId: new mongoose.Types.ObjectId(productId) }
    },
    {
      $group: {
        _id: '$productId',
        ratingAvg: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  const Product = mongoose.model('Product');

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingAvg: Math.round(stats[0].ratingAvg * 10) / 10,
      ratingCount: stats[0].ratingCount
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingAvg: 0,
      ratingCount: 0
    });
  }
};

// Post hooks to recalculate ratings automatically
reviewSchema.post('save', async function () {
  await this.constructor.calcAverageRating(this.productId);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.productId);
  }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
