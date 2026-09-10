const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateProfile
} = require('../controllers/user.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Profile routes (Any authenticated user)
router.put('/profile', authenticate, updateProfile);

// Admin-only user management routes
router.get('/', authenticate, authorize('Admin'), getAllUsers);
router.get('/:id', authenticate, authorize('Admin'), getUserById);
router.put('/:id/role', authenticate, authorize('Admin'), updateUserRole);
router.delete('/:id', authenticate, authorize('Admin'), deleteUser);

module.exports = router;
