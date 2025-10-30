/**
 * Preptor Backend Server
 * Entry point for the Express application
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet()); // Security headers

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// RATE LIMITING
// ============================================================================

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints rate limiter (more strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'You have made too many authentication requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiter
app.use(globalLimiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version 1 routes
app.use('/api/v1/auth', authLimiter, authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Preptor API Server',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      error: 'Database error',
      message: 'An error occurred while processing your request',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Your token has expired. Please login again.',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\nReceived shutdown signal. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW');
  console.log('Q           Preptor Backend Server Started              Q');
  console.log('ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]');
  console.log('');
  console.log(`  ¡ Server:      http://localhost:${PORT}`);
  console.log(`  =Ê Health:      http://localhost:${PORT}/health`);
  console.log(`  = Auth API:    http://localhost:${PORT}/api/v1/auth`);
  console.log(`  < Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('  Available endpoints:');
  console.log('    POST   /api/v1/auth/register');
  console.log('    POST   /api/v1/auth/login');
  console.log('    POST   /api/v1/auth/refresh');
  console.log('    POST   /api/v1/auth/logout');
  console.log('    POST   /api/v1/auth/logout-all');
  console.log('    GET    /api/v1/auth/me');
  console.log('    GET    /api/v1/auth/sessions');
  console.log('    POST   /api/v1/auth/verify-email');
  console.log('    POST   /api/v1/auth/resend-verification');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

module.exports = app;
