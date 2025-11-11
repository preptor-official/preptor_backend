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

router.post('/register', async (req, res) => {
  try {
    const { email, password, userType = 'STUDENT', orgId = null } = req.body;

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

    const passwordHash = await hashPassword(password);

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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required',
      });
    }

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

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: 'Account locked',
        message: 'Your account has been temporarily locked due to multiple failed login attempts',
        lockedUntil: user.lockedUntil,
        retryAfter: Math.ceil((user.lockedUntil - new Date()) / 1000),
      });
    }

    const isValid = await verifyPassword(user.passwordHash, password);

    if (!isValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: failedAttempts };

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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

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

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a valid refresh token',
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

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

    if (!storedToken.user.isActive) {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    const accessToken = generateAccessToken(storedToken.user);

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

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);

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

router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
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

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: 'Please provide a verification token',
      });
    }

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

    await prisma.user.update({
      where: { email: tokenRecord.email },
      data: { emailVerified: true },
    });

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

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide your email address',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, emailVerified: true },
    });

    // Generic success message to prevent user enumeration
    const successMessage = {
      message: 'If your email is registered, you will receive a verification link',
    };

    if (!user) {
      return res.json(successMessage);
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'Your email address is already verified',
      });
    }

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

    res.json({
      ...successMessage,
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
