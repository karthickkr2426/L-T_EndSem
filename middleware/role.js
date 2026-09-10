/**
 * Role-Based Access Control (RBAC) middleware
 * Restricts access to routes based on user role(s)
 * @param  {...string} roles - Permitted roles ('Customer', 'Seller', 'Admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking role authorization',
        errorCode: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to perform this action as a ${req.user.role}`,
        errorCode: 'FORBIDDEN'
      });
    }

    return next();
  };
};

module.exports = { authorize };
