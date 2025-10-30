/**
 * JWT Token Utility
 * Handles generation and verification of JSON Web Tokens
 *
 * Token Strategy:
 * - Access Token: Short-lived (15 minutes), used for API authentication
 * - Refresh Token: Long-lived (30 days), used to generate new access tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_ACCESS_EXPIRES_IN = '15m'; // 15 minutes
const JWT_REFRESH_EXPIRES_IN = '30d'; // 30 days

// Validate JWT_SECRET
if (JWT_SECRET === 'default-secret-change-in-production' && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: JWT_SECRET is using default value in production!');
  throw new Error('JWT_SECRET environment variable must be set in production');
}

/**
 * Generate a JWT access token for a user
 * @param {Object} user - User object from database
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.userType - User role/type
 * @param {string|null} user.orgId - Organization ID (optional)
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    userType: user.userType,
    orgId: user.orgId || null,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
    issuer: 'preptor-api',
    audience: 'preptor-client',
  });
}

/**
 * Verify and decode a JWT access token
 * @param {string} token - JWT access token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'preptor-api',
      audience: 'preptor-client',
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired:', error.message);
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token:', error.message);
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
}

/**
 * Generate a cryptographically secure refresh token
 * @returns {string} Base64url-encoded refresh token
 */
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash a refresh token using SHA-256
 * Use this to store refresh tokens in database (never store plain tokens)
 * @param {string} token - Plain refresh token
 * @returns {string} SHA-256 hash of the token (hex format)
 */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure verification token
 * Used for email verification and password reset
 * @returns {string} Base64url-encoded verification token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Decode a JWT token without verifying (useful for debugging)
 * WARNING: Do not use for authentication - always use verifyAccessToken
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token or null if invalid format
 */
function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

/**
 * Get the expiration time from a JWT token
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    return null;
  }

  return new Date(decoded.payload.exp * 1000); // Convert Unix timestamp to Date
}

/**
 * Check if a JWT token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if expired, false otherwise
 */
function isTokenExpired(token) {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true; // Consider invalid tokens as expired
  }

  return expiration < new Date();
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateVerificationToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
};
