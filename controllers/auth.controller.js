const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @desc    Register a new user (Customer, Seller, Admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, address } = req.body;

    // Check for duplicate email (case-insensitive)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(
        res,
        409,
        'Email address is already registered. Please use another email or log in.',
        'BUSINESS_RULE_ERROR'
      );
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'Customer',
      address: address || {}
    });

    const token = generateToken(user);

    return sendSuccess(
      res,
      201,
      'User registered successfully',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address,
          createdAt: user.createdAt
        },
        token
      }
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Authenticate user & return JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password hash explicitly selected
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return sendError(
        res,
        401,
        'Invalid email or password',
        'UNAUTHORIZED'
      );
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(
        res,
        401,
        'Invalid email or password',
        'UNAUTHORIZED'
      );
    }

    const token = generateToken(user);

    return sendSuccess(
      res,
      200,
      'Login successful',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address
        },
        token
      }
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Authenticated)
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'User profile retrieved successfully', {
      user: req.user
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
