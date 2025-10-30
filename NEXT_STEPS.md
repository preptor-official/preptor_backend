# 🚀 Next Steps - Build Authentication System

**Migration Status:** ✅ COMPLETED (2025-10-29 12:33:03)

Your database now has:
- ✅ `users` table (13 fields)
- ✅ `refresh_tokens` table (9 fields)
- ✅ `verification_tokens` table (7 fields)
- ✅ `user_type` enum (5 roles)
- ✅ `token_type` enum (2 types)
- ✅ All indexes and foreign keys
- ✅ Prisma Client generated

---

## 🎯 Recommended Build Order

### Phase 1: Core Authentication (Days 1-3)

#### Step 1: Install Required Dependencies

```bash
npm install argon2 jsonwebtoken
npm install -D @types/jsonwebtoken
```

#### Step 2: Create Authentication Utilities

Create these files in order:

**a) Password Hashing Utility**
```bash
# Create: src/utils/password.js
```

```javascript
const argon2 = require('argon2');

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
  });
}

async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

module.exports = { hashPassword, verifyPassword };
```

**b) JWT Token Utility**
```bash
# Create: src/utils/jwt.js
```

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // 15 minutes for access token

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      orgId: user.orgId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateVerificationToken,
};
```

#### Step 3: Create Auth Middleware

```bash
# Create: src/middleware/auth.js
```

```javascript
const { verifyAccessToken } = require('../utils/jwt');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { authenticateToken, requireRole };
```

#### Step 4: Create Auth Routes

```bash
# Create: src/routes/auth.js
```

**Start with these 5 essential endpoints:**

1. **POST /auth/register** - User registration
2. **POST /auth/login** - User login
3. **POST /auth/refresh** - Refresh access token
4. **POST /auth/logout** - Logout (revoke token)
5. **GET /auth/me** - Get current user (protected)

**Basic structure:**

```javascript
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { hashPassword, verifyPassword } = require('../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, userType = 'STUDENT' } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        userType,
      },
      select: {
        id: true,
        email: true,
        userType: true,
        createdAt: true,
      },
    });

    // TODO: Generate email verification token and send email

    res.status(201).json({
      message: 'Registration successful',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: 'Account locked',
        lockedUntil: user.lockedUntil,
      });
    }

    // Verify password
    const isValid = await verifyPassword(user.passwordHash, password);

    if (!isValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: failedAttempts };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
        updateData.lockedUntil = lockedUntil;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
        deviceInfo: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        orgId: user.orgId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
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
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
```

#### Step 5: Register Auth Routes in Main App

```javascript
// In your main app file (index.js or app.js)
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);
```

#### Step 6: Update Environment Variables

Add to `.env`:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
NODE_ENV=development
```

---

### Phase 2: Email Verification (Days 4-5)

Add these endpoints:

1. **POST /auth/verify-email** - Verify email with token
2. **POST /auth/resend-verification** - Resend verification email

Requirements:
- Email service (Nodemailer, SendGrid, or AWS SES)
- Email templates
- Frontend verification page

---

### Phase 3: Password Reset (Days 6-7)

Add these endpoints:

1. **POST /auth/forgot-password** - Request password reset
2. **POST /auth/reset-password** - Reset password with token

---

### Phase 4: Token Refresh & Session Management (Day 8)

1. **POST /auth/refresh** - Refresh access token using refresh token
2. **POST /auth/logout-all** - Logout from all devices
3. **GET /auth/sessions** - List active sessions

---

### Phase 5: Testing (Days 9-10)

Create test files:
- `tests/auth.register.test.js`
- `tests/auth.login.test.js`
- `tests/auth.lockout.test.js`
- `tests/auth.tokens.test.js`

Use Jest or Mocha for testing.

---

## 📁 Recommended Folder Structure

```
src/
├── routes/
│   ├── auth.js           ← Start here
│   ├── users.js          (later)
│   └── admin.js          (later)
├── middleware/
│   ├── auth.js           ← Create this
│   ├── validate.js       (later)
│   └── rateLimit.js      (later)
├── utils/
│   ├── password.js       ← Create this
│   ├── jwt.js            ← Create this
│   └── email.js          (later)
├── lib/
│   └── prisma.js         ✅ Already exists
└── index.js              ← Register routes here
```

---

## 🧪 Testing Your Authentication

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "userType": "STUDENT"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Access Protected Route

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## ⚠️ Important Security Notes

1. **Change JWT_SECRET** in production to a strong random string (32+ characters)
2. **Enable HTTPS** in production (required for secure cookies)
3. **Add rate limiting** to auth endpoints (express-rate-limit)
4. **Validate input** thoroughly (use joi or zod)
5. **Add CORS** with strict origin whitelist
6. **Never log** passwords or tokens
7. **Set secure headers** (use helmet.js)

---

## 📚 Reference Documentation

- `AUTHENTICATION_SETUP.md` - Complete implementation examples
- `AUTHORIZATION_PATTERNS.md` - Multi-tenant authorization patterns
- `prisma/schema.prisma` - Database schema with inline docs

---

## 🎯 Your Immediate Next Task

**Create the basic auth routes** (Step 4 above):

1. Create `src/utils/password.js`
2. Create `src/utils/jwt.js`
3. Create `src/middleware/auth.js`
4. Create `src/routes/auth.js`
5. Register routes in your main app
6. Test with curl or Postman

Once you have `/register` and `/login` working, you can start building your frontend or other features!

---

**Need help with any of these steps? Just ask!**
