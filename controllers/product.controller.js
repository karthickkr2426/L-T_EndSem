const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @desc    Get products with search, category filter, price range, rating filter, pagination & sorting
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      rating,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Keyword search on name and description
    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Category filter
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    // Rating filter (ratingAvg >= threshold)
    if (rating !== undefined) {
      filter.ratingAvg = { $gte: Number(rating) };
    }

    // Sorting definition
    const sort = {};
    const sortDirection = order === 'asc' ? 1 : -1;
    sort[sortBy] = sortDirection;

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate('categoryId', 'name')
      .populate('sellerId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    return sendSuccess(res, 200, 'Products retrieved successfully', {
      products,
      pagination: {
        totalProducts,
        totalPages: Math.ceil(totalProducts / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('sellerId', 'name email');

    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Product retrieved successfully', { product });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Seller or Admin)
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, categoryId, stock, images } = req.body;

    // Verify category existence
    const category = await Category.findById(categoryId);
    if (!category) {
      return sendError(res, 404, 'Specified category does not exist', 'NOT_FOUND');
    }

    // Determine sellerId
    let sellerId = req.user.id;
    if (req.user.role === 'Admin' && req.body.sellerId) {
      const seller = await User.findById(req.body.sellerId);
      if (!seller) {
        return sendError(res, 404, 'Specified seller does not exist', 'NOT_FOUND');
      }
      sellerId = req.body.sellerId;
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      categoryId,
      sellerId,
      stock: Number(stock) || 0,
      images: images || []
    });

    const populatedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name')
      .populate('sellerId', 'name email');

    return sendSuccess(res, 201, 'Product created successfully', {
      product: populatedProduct
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private (Seller or Admin)
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    // Role check: Seller can only modify their own products
    if (
      req.user.role === 'Seller' &&
      product.sellerId.toString() !== req.user.id.toString()
    ) {
      return sendError(
        res,
        403,
        'You do not have permission to modify another seller’s product',
        'FORBIDDEN'
      );
    }

    // If categoryId is being changed, verify existence
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return sendError(res, 404, 'Specified category does not exist', 'NOT_FOUND');
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    )
      .populate('categoryId', 'name')
      .populate('sellerId', 'name email');

    return sendSuccess(res, 200, 'Product updated successfully', {
      product: updatedProduct
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private (Seller or Admin)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    // Role check: Seller can only delete their own products
    if (
      req.user.role === 'Seller' &&
      product.sellerId.toString() !== req.user.id.toString()
    ) {
      return sendError(
        res,
        403,
        'You do not have permission to delete another seller’s product',
        'FORBIDDEN'
      );
    }

    await Product.findByIdAndDelete(req.params.id);

    return sendSuccess(res, 200, 'Product deleted successfully', {
      id: req.params.id
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
