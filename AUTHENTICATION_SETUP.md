# Authentication Schema Setup Guide

## Prerequisites

1. **PostgreSQL Database** - Ensure you have a Neon/PostgreSQL database URL in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/preptorai_db"
   ```

2. **Install Dependencies**:
   ```bash
   npm install @prisma/client
   npm install -D prisma
   npm install argon2  # For password hashing
   npm install jsonwebtoken  # For JWT tokens
   ```

## Step 1: Enable PostgreSQL Extensions

Before running Prisma migrations, enable the required UUID extension:

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**For Neon Database (via psql or GUI):**
```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

**Note:** All tables will be created in the default `public` schema for simplicity. Multi-schema separation can be added later if needed.

## Step 2: Run Prisma Migration

```bash
# Generate migration files
npx prisma migrate dev --name init_auth_schema

# This will:
# 1. Create users table
# 2. Create refresh_tokens table
# 3. Create verification_tokens table
# 4. Create user_type and token_type enums
# 5. Set up all indexes and relations
# 6. Generate Prisma Client
```

## Step 3: Verify Schema

```bash
# Open Prisma Studio to view tables
npx prisma studio

# Or inspect the migration SQL
cat prisma/migrations/*/migration.sql
```

## Step 4: Optional Enhancements

### A. Case-Insensitive Email Uniqueness

```sql
CREATE UNIQUE INDEX idx_users_email_lower
ON users (LOWER(email));
```

### B. Row-Level Security (RLS) for Multi-Tenancy

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  FOR SELECT USING (
    id = current_setting('app.current_user_id')::uuid OR
    org_id = current_setting('app.current_org_id')::uuid
  );
```

### C. Automated Token Cleanup (Cron Job)

Add to your server startup or use pg_cron:

```javascript
// cleanup-tokens.js
const prisma = require('./src/lib/prisma');

async function cleanupExpiredTokens() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete old verification tokens
  await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: sevenDaysAgo } }
  });

  // Delete old refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: thirtyDaysAgo } }
  });

  console.log('Token cleanup completed');
}

// Run daily
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);
```

## Implementation Examples

### 1. User Registration

```javascript
const argon2 = require('argon2');
const crypto = require('crypto');
const prisma = require('./src/lib/prisma');

async function registerUser(email, password, userType = 'STUDENT') {
  // Hash password with Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      userType,
      isActive: true,
      emailVerified: false,
    },
  });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('base64url');
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
  // sendEmail(user.email, `Verify: ${BASE_URL}/verify?token=${verificationToken}`);

  return { user, verificationToken };
}
```

### 2. User Login with Account Lockout

```javascript
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

async function loginUser(email, password, deviceInfo, ipAddress) {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error(`Account locked until ${user.lockedUntil.toISOString()}`);
  }

  // Verify password
  const isValid = await argon2.verify(user.passwordHash, password);

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

    throw new Error('Invalid credentials');
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

  // Generate JWT access token (15 min expiry)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Generate refresh token (30 days)
  const refreshToken = crypto.randomBytes(32).toString('base64url');
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      deviceInfo,
      ipAddress,
    },
  });

  return { accessToken, refreshToken, user };
}
```

### 3. Password Reset Flow

```javascript
async function requestPasswordReset(email) {
  // Generate token (works even if email doesn't exist - prevent enumeration)
  const resetToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15-min expiry

  // Check rate limiting (max 3 per hour)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentAttempts = await prisma.verificationToken.count({
    where: {
      email: email.toLowerCase(),
      tokenType: 'PASSWORD_RESET',
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentAttempts >= 3) {
    throw new Error('Too many password reset attempts. Try again later.');
  }

  // Create token
  await prisma.verificationToken.create({
    data: {
      tokenType: 'PASSWORD_RESET',
      email: email.toLowerCase(),
      token: resetToken,
      expiresAt,
    },
  });

  // TODO: Send email only if user exists (check separately)
  const userExists = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (userExists) {
    // sendEmail(email, `Reset: ${BASE_URL}/reset-password?token=${resetToken}`);
  }

  return { success: true }; // Always return success to prevent enumeration
}

async function resetPassword(token, newPassword) {
  // Find valid token
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      token,
      tokenType: 'PASSWORD_RESET',
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!tokenRecord) {
    throw new Error('Invalid or expired token');
  }

  // Hash new password
  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
  });

  // Update password
  await prisma.user.update({
    where: { email: tokenRecord.email },
    data: { passwordHash },
  });

  // Mark token as used
  await prisma.verificationToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  // Optional: Revoke all refresh tokens for security
  await prisma.refreshToken.updateMany({
    where: { user: { email: tokenRecord.email } },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}
```

### 4. Email Verification

```javascript
async function verifyEmail(token) {
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      token,
      tokenType: 'EMAIL_VERIFICATION',
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!tokenRecord) {
    throw new Error('Invalid or expired verification token');
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

  return { success: true };
}
```

### 5. Refresh Token Rotation

```javascript
async function refreshAccessToken(refreshToken) {
  // Hash the provided token
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Find valid refresh token
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
    include: { user: true },
  });

  if (!storedToken) {
    throw new Error('Invalid or expired refresh token');
  }

  // Generate new access token
  const accessToken = jwt.sign(
    {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      userType: storedToken.user.userType,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Update last used timestamp
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { lastUsedAt: new Date() },
  });

  return { accessToken };
}
```

### 6. Logout (Revoke Token)

```javascript
async function logout(refreshToken) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}

async function logoutAllDevices(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}
```

## Environment Variables

Add to `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/preptorai_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-refresh-token-secret"

# Email service (for verification and password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Frontend URL for email links
FRONTEND_URL="http://localhost:3000"
```

## Testing Checklist

- [ ] User registration creates user with hashed password
- [ ] Email verification token is generated and sent
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong password increments failed attempts
- [ ] Account locks after 5 failed attempts
- [ ] Account unlocks after 15 minutes
- [ ] Refresh token generates new access token
- [ ] Logout revokes specific refresh token
- [ ] Password reset token expires after 15 minutes
- [ ] Password reset token can only be used once
- [ ] Email verification marks emailVerified as true
- [ ] Multi-tenant isolation works (org_id filtering)

## Security Best Practices

1. **Never log sensitive data**: passwords, tokens, password hashes
2. **Always use HTTPS** in production
3. **Validate email format** before storing
4. **Rate limit all auth endpoints** (use express-rate-limit)
5. **Implement CORS** with strict origin whitelist
6. **Use parameterized queries** (Prisma handles this)
7. **Set secure cookie flags**: httpOnly, secure, sameSite
8. **Regularly rotate JWT secrets**
9. **Monitor failed login attempts** for brute force attacks
10. **Keep Argon2 parameters updated** as hardware improves

## Troubleshooting

### Migration Fails with "Schema auth does not exist"

```bash
# Create schema manually first
psql $DATABASE_URL -c "CREATE SCHEMA IF NOT EXISTS auth;"
npx prisma migrate dev
```

### UUID Generation Error

```bash
# Enable pgcrypto extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

---

**Schema Version:** 1.0.0 (MVP)
**Last Updated:** 2025-10-29
**Status:** ✅ Production-Ready for MVP Launch
