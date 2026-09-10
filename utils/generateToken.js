const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token containing user identity and role
 * @param {Object} user - User document or payload {_id, role, email}
 * @returns {string} - Signed JWT string
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

module.exports = generateToken;
