/**
 * Authentication Middleware
 * Handles JWT token verification and role-based access control
 */

const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');

/**
 * Middleware to authenticate requests using JWT tokens
 * Extracts token from Authorization header (Bearer token)
 * Attaches decoded user data to req.user if valid
 *
 * Usage:
 *   router.get('/protected', authenticateToken, handler);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticateToken(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid access token in the Authorization header',
    });
  }

  // Verify token
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(403).json({
      error: 'Invalid or expired token',
      message: 'Your access token is invalid or has expired. Please login again.',
    });
  }

  // Attach user data to request
  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    userType: decoded.userType,
    orgId: decoded.orgId,
  };

  next();
}

/**
 * Middleware to require specific user roles
 * Must be used after authenticateToken middleware
 *
 * Usage:
 *   router.get('/admin', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), handler);
 *
 * @param {...string} allowedRoles - User types allowed to access the route
 * @returns {Function} Express middleware function
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        yourRole: req.user.userType,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user's email is verified
 * Must be used after authenticateToken middleware
 *
 * Usage:
 *   router.post('/test', authenticateToken, requireEmailVerified, handler);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  try {
    // Fetch user from database to check verification status
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { emailVerified: true },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address before accessing this resource',
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({
      error: 'Failed to verify email status',
    });
  }
}

/**
 * Middleware to check if user is active
 * Must be used after authenticateToken middleware
 *
 * Usage:
 *   router.get('/data', authenticateToken, requireActiveAccount, handler);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function requireActiveAccount(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  try {
    // Fetch user from database to check active status
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isActive: true },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    next();
  } catch (error) {
    console.error('Active account check error:', error);
    return res.status(500).json({
      error: 'Failed to verify account status',
    });
  }
}

/**
 * Middleware to check if user belongs to an organization
 * Must be used after authenticateToken middleware
 *
 * Usage:
 *   router.get('/org-data', authenticateToken, requireOrganization, handler);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireOrganization(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  if (!req.user.orgId) {
    return res.status(403).json({
      error: 'Organization membership required',
      message: 'This resource is only available to users belonging to an organization',
    });
  }

  next();
}

/**
 * Optional authentication middleware
 * Attaches user data if token is present and valid, but doesn't fail if missing
 *
 * Usage:
 *   router.get('/public', optionalAuth, handler);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyAccessToken(token);

  if (decoded) {
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType,
      orgId: decoded.orgId,
    };
  } else {
    req.user = null;
  }

  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  requireEmailVerified,
  requireActiveAccount,
  requireOrganization,
  optionalAuth,
};
