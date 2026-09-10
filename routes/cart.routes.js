const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require('../controllers/cart.controller');

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  addToCartSchema,
  updateCartItemSchema
} = require('../validators/cart.validator');

// All cart routes require Customer authentication
router.use(authenticate);
router.use(authorize('Customer'));

router.get('/', getCart);
router.post('/', validate(addToCartSchema), addToCart);
router.put('/:productId', validate(updateCartItemSchema), updateCartItem);
router.delete('/:productId', removeCartItem);
router.delete('/', clearCart);

module.exports = router;
