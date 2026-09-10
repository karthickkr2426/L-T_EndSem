const Category = require('../models/Category');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * Helper to detect circular relationships in category hierarchies
 * Checks if targetCategoryId is an ancestor of potentialParentId
 */
const isDescendant = async (targetCategoryId, potentialParentId) => {
  let currentId = potentialParentId;
  while (currentId) {
    if (currentId.toString() === targetCategoryId.toString()) {
      return true;
    }
    const cat = await Category.findById(currentId).select('parentCategoryId');
    if (!cat || !cat.parentCategoryId) {
      break;
    }
    currentId = cat.parentCategoryId;
  }
  return false;
};

/**
 * @desc    Get all categories (as flat list with populated parent or as a tree)
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const { format } = req.query; // 'tree' or flat list

    const categories = await Category.find()
      .populate('parentCategoryId', 'name')
      .sort({ name: 1 });

    if (format === 'tree') {
      // Build hierarchical tree
      const categoryMap = {};
      categories.forEach((cat) => {
        categoryMap[cat._id.toString()] = {
          ...cat.toJSON(),
          subcategories: []
        };
      });

      const rootCategories = [];
      categories.forEach((cat) => {
        const catId = cat._id.toString();
        if (cat.parentCategoryId && categoryMap[cat.parentCategoryId._id.toString()]) {
          categoryMap[cat.parentCategoryId._id.toString()].subcategories.push(categoryMap[catId]);
        } else {
          rootCategories.push(categoryMap[catId]);
        }
      });

      return sendSuccess(res, 200, 'Categories retrieved as tree', { categories: rootCategories });
    }

    return sendSuccess(res, 200, 'Categories retrieved successfully', { categories });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get single category by ID with its subcategories
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).populate('parentCategoryId', 'name');
    if (!category) {
      return sendError(res, 404, 'Category not found', 'NOT_FOUND');
    }

    // Also fetch immediate subcategories
    const subcategories = await Category.find({ parentCategoryId: category._id }).sort({ name: 1 });

    return sendSuccess(res, 200, 'Category retrieved successfully', {
      category,
      subcategories
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create a new category or subcategory
 * @route   POST /api/categories
 * @access  Private (Admin)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, parentCategoryId } = req.body;

    // Check duplicate name under the same parent
    const duplicate = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      parentCategoryId: parentCategoryId || null
    });

    if (duplicate) {
      return sendError(
        res,
        409,
        `Category '${name}' already exists under this parent level`,
        'BUSINESS_RULE_ERROR'
      );
    }

    // Validate parent category if specified
    if (parentCategoryId) {
      const parent = await Category.findById(parentCategoryId);
      if (!parent) {
        return sendError(res, 404, 'Specified parent category does not exist', 'NOT_FOUND');
      }
    }

    const category = await Category.create({
      name: name.trim(),
      parentCategoryId: parentCategoryId || null
    });

    return sendSuccess(res, 201, 'Category created successfully', { category });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parentCategoryId } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return sendError(res, 404, 'Category not found', 'NOT_FOUND');
    }

    // Check self-parenting
    if (parentCategoryId && parentCategoryId.toString() === id.toString()) {
      return sendError(
        res,
        400,
        'A category cannot be its own parent category',
        'BUSINESS_RULE_ERROR'
      );
    }

    // Check circular relationship: new parent cannot be a descendant of this category
    if (parentCategoryId) {
      const parent = await Category.findById(parentCategoryId);
      if (!parent) {
        return sendError(res, 404, 'Specified parent category does not exist', 'NOT_FOUND');
      }

      const circular = await isDescendant(id, parentCategoryId);
      if (circular) {
        return sendError(
          res,
          400,
          'Circular relationship detected: Cannot set a descendant as the parent category',
          'BUSINESS_RULE_ERROR'
        );
      }
    }

    if (name) {
      // Check duplicate under same parent
      const targetParent = parentCategoryId !== undefined ? parentCategoryId : category.parentCategoryId;
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        parentCategoryId: targetParent || null
      });

      if (duplicate) {
        return sendError(
          res,
          409,
          `Category '${name}' already exists at this hierarchy level`,
          'BUSINESS_RULE_ERROR'
        );
      }

      category.name = name.trim();
    }

    if (parentCategoryId !== undefined) {
      category.parentCategoryId = parentCategoryId || null;
    }

    await category.save();

    return sendSuccess(res, 200, 'Category updated successfully', { category });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return sendError(res, 404, 'Category not found', 'NOT_FOUND');
    }

    // Check if category has subcategories
    const hasChildren = await Category.findOne({ parentCategoryId: id });
    if (hasChildren) {
      return sendError(
        res,
        400,
        'Cannot delete category that has active subcategories. Delete or reassign subcategories first.',
        'BUSINESS_RULE_ERROR'
      );
    }

    // Check if category is used by active products
    const productCount = await Product.countDocuments({ categoryId: id });
    if (productCount > 0) {
      return sendError(
        res,
        400,
        `Cannot delete category associated with ${productCount} existing product(s)`,
        'BUSINESS_RULE_ERROR'
      );
    }

    await Category.findByIdAndDelete(id);

    return sendSuccess(res, 200, 'Category deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
