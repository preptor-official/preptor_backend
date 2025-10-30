/**
 * Authentication Routes
 * Handles user registration, login, logout, and token management
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { hashPassword, verifyPassword, validatePasswordStrength } = require('../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateVerificationToken,
} = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// POST /auth/register - User Registration
// ============================================================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, userType = 'STUDENT', orgId = null } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password does not meet security requirements',
        details: passwordValidation.errors,
      });
    }

    // Validate userType
    const validUserTypes = ['STUDENT', 'MENTOR', 'INSTITUTE', 'ADMIN', 'SUPER_ADMIN'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({
        error: 'Invalid user type',
        message: `User type must be one of: ${validUserTypes.join(', ')}`,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        userType,
        orgId: orgId || null,
        isActive: true,
        emailVerified: false, // Will be verified via email
      },
      select: {
        id: true,
        email: true,
        userType: true,
        orgId: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

    await prisma.verificationToken.create({
      data: {
        tokenType: 'EMAIL_VERIFICATION',
        email: user.email,
        token: verificationToken,
        expiresAt,
      },
    });

    // TODO: Send verification email
    // sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user,
      // Only include in development for testing
      ...(process.env.NODE_ENV === 'development' && {
        verificationToken,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
      }),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.',
    });
  }
});

// ============================================================================
// POST /auth/login - User Login
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Generic error message to prevent user enumeration
    const invalidCredentialsError = {
      error: 'Invalid credentials',
      message: 'Email or password is incorrect',
    };

    if (!user || !user.isActive) {
      return res.status(401).json(invalidCredentialsError);
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: 'Account locked',
        message: 'Your account has been temporarily locked due to multiple failed login attempts',
        lockedUntil: user.lockedUntil,
        retryAfter: Math.ceil((user.lockedUntil - new Date()) / 1000), // seconds
      });
    }

    // Verify password
    const isValid = await verifyPassword(user.passwordHash, password);

    if (!isValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: failedAttempts };

      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
        updateData.lockedUntil = lockedUntil;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return res.status(401).json(invalidCredentialsError);
    }

    // Reset failed attempts and update last login on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate access token (15 minutes)
    const accessToken = generateAccessToken(user);

    // Generate refresh token (30 days)
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
        deviceInfo: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      },
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        orgId: user.orgId,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.',
    });
  }
});

// ============================================================================
// POST /auth/refresh - Refresh Access Token
// ============================================================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a valid refresh token',
      });
    }

    // Hash the provided token to compare with database
    const tokenHash = hashRefreshToken(refreshToken);

    // Find valid refresh token
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
            orgId: true,
            isActive: true,
          },
        },
      },
    });

    if (!storedToken) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Your refresh token is invalid or has expired. Please login again.',
      });
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(storedToken.user);

    // Update last used timestamp
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsedAt: new Date() },
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing your token. Please try again.',
    });
  }
});

// ============================================================================
// GET /auth/me - Get Current User (Protected Route)
// ============================================================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        userType: true,
        orgId: true,
        isActive: true,
        emailVerified: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The authenticated user could not be found',
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while fetching user data',
    });
  }
});

// ============================================================================
// POST /auth/logout - Logout (Revoke Refresh Token)
// ============================================================================
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);

      // Revoke the specific refresh token
      await prisma.refreshToken.updateMany({
        where: {
          userId: req.user.userId,
          tokenHash,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout',
    });
  }
});

// ============================================================================
// POST /auth/logout-all - Logout from All Devices
// ============================================================================
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Revoke all refresh tokens for the user
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId: req.user.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    res.json({
      message: 'Logged out from all devices successfully',
      devicesLoggedOut: result.count,
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout all failed',
      message: 'An error occurred while logging out from all devices',
    });
  }
});

// ============================================================================
// GET /auth/sessions - Get Active Sessions
// ============================================================================
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId: req.user.userId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    res.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        device: session.deviceInfo || 'Unknown device',
        ipAddress: session.ipAddress || 'Unknown IP',
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
      })),
      totalActiveSessions: sessions.length,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      message: 'An error occurred while fetching active sessions',
    });
  }
});

// ============================================================================
// POST /auth/verify-email - Verify Email Address
// ============================================================================
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: 'Please provide a verification token',
      });
    }

    // Find valid verification token
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        tokenType: 'EMAIL_VERIFICATION',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!tokenRecord) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The verification link is invalid or has expired',
      });
    }

    // Mark email as verified
    await prisma.user.update({
      where: { email: tokenRecord.email },
      data: { emailVerified: true },
    });

    // Mark token as used
    await prisma.verificationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    res.json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during email verification',
    });
  }
});

// ============================================================================
// POST /auth/resend-verification - Resend Email Verification
// ============================================================================
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide your email address',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, emailVerified: true },
    });

    // Generic success message to prevent user enumeration
    const successMessage = {
      message: 'If your email is registered, you will receive a verification link',
    };

    if (!user) {
      // Don't reveal that user doesn't exist
      return res.json(successMessage);
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'Your email address is already verified',
      });
    }

    // Check rate limiting (max 5 requests per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentAttempts = await prisma.verificationToken.count({
      where: {
        email: user.email,
        tokenType: 'EMAIL_VERIFICATION',
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentAttempts >= 5) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'You have requested too many verification emails. Please try again later.',
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.verificationToken.create({
      data: {
        tokenType: 'EMAIL_VERIFICATION',
        email: user.email,
        token: verificationToken,
        expiresAt,
      },
    });

    // TODO: Send verification email
    // sendVerificationEmail(user.email, verificationToken);

    res.json({
      ...successMessage,
      // Only include in development for testing
      ...(process.env.NODE_ENV === 'development' && {
        verificationToken,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
      }),
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Resend failed',
      message: 'An error occurred while resending verification email',
    });
  }
});

module.exports = router;
