const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * Helper to compute populated cart with subtotal and grand total
 */
const formatCartResponse = async (cart) => {
  await cart.populate({
    path: 'items.productId',
    select: 'name price stock images categoryId'
  });

  let totalAmount = 0;
  const items = [];

  for (const item of cart.items) {
    if (item.productId) {
      const price = item.productId.price;
      const subtotal = Math.round(price * item.quantity * 100) / 100;
      totalAmount += subtotal;
      items.push({
        product: item.productId,
        quantity: item.quantity,
        subtotal
      });
    }
  }

  totalAmount = Math.round(totalAmount * 100) / 100;

  return {
    _id: cart._id,
    userId: cart.userId,
    items,
    totalItems: items.reduce((acc, curr) => acc + curr.quantity, 0),
    totalAmount
  };
};

/**
 * @desc    Get current customer's cart
 * @route   GET /api/cart
 * @access  Private (Customer)
 */
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }

    const formattedCart = await formatCartResponse(cart);
    return sendSuccess(res, 200, 'Cart retrieved successfully', { cart: formattedCart });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Add product to cart (or increase quantity if already exists)
 * @route   POST /api/cart
 * @access  Private (Customer)
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    if (product.stock <= 0) {
      return sendError(
        res,
        400,
        `Product '${product.name}' is currently out of stock`,
        'BUSINESS_RULE_ERROR'
      );
    }

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
    }

    // Check if product already exists in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    const existingQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
    const targetQty = existingQty + Number(quantity);

    if (targetQty > product.stock) {
      return sendError(
        res,
        400,
        `Cannot add ${quantity} item(s). Total requested (${targetQty}) exceeds available stock (${product.stock})`,
        'BUSINESS_RULE_ERROR'
      );
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = targetQty;
    } else {
      cart.items.push({ productId, quantity: targetQty });
    }

    await cart.save();

    const formattedCart = await formatCartResponse(cart);
    return sendSuccess(res, 200, 'Product added to cart successfully', { cart: formattedCart });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update quantity of a product in cart
 * @route   PUT /api/cart/:productId
 * @access  Private (Customer)
 */
const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, 'Product not found', 'NOT_FOUND');
    }

    if (quantity > product.stock) {
      return sendError(
        res,
        400,
        `Requested quantity (${quantity}) exceeds available stock (${product.stock})`,
        'BUSINESS_RULE_ERROR'
      );
    }

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return sendError(res, 404, 'Cart not found', 'NOT_FOUND');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return sendError(res, 404, 'Product is not in your cart', 'NOT_FOUND');
    }

    cart.items[itemIndex].quantity = Number(quantity);
    await cart.save();

    const formattedCart = await formatCartResponse(cart);
    return sendSuccess(res, 200, 'Cart item updated successfully', { cart: formattedCart });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Remove an item from cart
 * @route   DELETE /api/cart/:productId
 * @access  Private (Customer)
 */
const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return sendError(res, 404, 'Cart not found', 'NOT_FOUND');
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );

    if (cart.items.length === initialLength) {
      return sendError(res, 404, 'Product not found in cart', 'NOT_FOUND');
    }

    await cart.save();

    const formattedCart = await formatCartResponse(cart);
    return sendSuccess(res, 200, 'Item removed from cart successfully', { cart: formattedCart });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart
 * @access  Private (Customer)
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return sendSuccess(res, 200, 'Cart cleared successfully', {
      cart: { items: [], totalItems: 0, totalAmount: 0 }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
