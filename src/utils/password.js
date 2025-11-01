/**
 * Password Hashing Utility
 * Uses bcrypt algorithm for secure password hashing
 *
 * Security Parameters (2025 Standards):
 * - Algorithm: bcrypt
 * - Salt Rounds: 12 (provides strong security with acceptable performance)
 * - Note: Switched from argon2 due to Windows ARM64 compatibility
 */

const bcrypt = require('bcrypt');

/**
 * Hash a plain text password using bcrypt
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password string
 * @throws {Error} If hashing fails
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  try {
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a plain text password against a hashed password
 * @param {string} hash - The hashed password from database
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches, false otherwise
 * @throws {Error} If verification fails
 */
async function verifyPassword(hash, password) {
  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    console.error('Password verification error:', error);
    return false; // Return false instead of throwing to prevent timing attacks
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password must be a string'] };
  }

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length (prevent DoS attacks)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Require at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Require at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Require at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Require at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
};
