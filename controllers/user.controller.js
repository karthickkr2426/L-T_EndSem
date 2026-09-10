const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, 200, 'Users retrieved successfully', {
      users,
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get single user by ID (Admin only)
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return sendError(res, 404, 'User not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User retrieved successfully', { user });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update user role (Admin only)
 * @route   PUT /api/users/:id/role
 * @access  Private (Admin)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['Customer', 'Seller', 'Admin'].includes(role)) {
      return sendError(res, 400, 'Invalid role specified. Must be Customer, Seller, or Admin', 'VALIDATION_ERROR');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { returnDocument: 'after', runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return sendError(res, 404, 'User not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User role updated successfully', { user });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return sendError(res, 400, 'Admin cannot delete their own account', 'BUSINESS_RULE_ERROR');
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User deleted successfully', { id: user._id });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update own profile
 * @route   PUT /api/users/profile
 * @access  Private (Authenticated)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { returnDocument: 'after', runValidators: true }
    ).select('-passwordHash');

    return sendSuccess(res, 200, 'Profile updated successfully', { user });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateProfile
};
