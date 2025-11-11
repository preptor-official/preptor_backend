# API Guide

Complete API reference for Preptor backend.

## Base URL

```
Development: http://localhost:3000
Production: https://api.preptor.com (example)
```

## Authentication

Most endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use refresh token to get a new one.

## Endpoints

### Health Check

Check server status.

```
GET /health
```

**Response 200**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-11T...",
  "uptime": 3497.28,
  "environment": "development"
}
```

### Register User

Create a new user account.

```
POST /api/v1/auth/register
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "userType": "STUDENT"
}
```

**User Types**: `STUDENT`, `MENTOR`, `INSTITUTE`, `ADMIN`, `SUPER_ADMIN`

**Password Requirements**:
- Min 8 characters
- 1 uppercase
- 1 lowercase
- 1 number
- 1 special character

**Response 201**:
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "userType": "STUDENT",
    "orgId": null,
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2025-..."
  },
  "verificationToken": "token",
  "verificationUrl": "http://..."
}
```

**Errors**:
- `400`: Invalid input
- `409`: Email already exists

### Login

Authenticate user and get tokens.

```
POST /api/v1/auth/login
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123"
}
```

**Response 200**:
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbG...",
  "refreshToken": "0vlAXB...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "userType": "STUDENT",
    "orgId": null,
    "emailVerified": false
  }
}
```

**Errors**:
- `401`: Invalid credentials
- `423`: Account locked (after 5 failed attempts)

### Get Current User

Get authenticated user profile.

```
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "userType": "STUDENT",
    "orgId": null,
    "isActive": true,
    "emailVerified": false,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-...",
    "updatedAt": "2025-...",
    "lastLoginAt": "2025-..."
  }
}
```

**Errors**:
- `401`: No token or invalid token
- `404`: User not found

### Refresh Token

Get a new access token using refresh token.

```
POST /api/v1/auth/refresh
Content-Type: application/json
```

**Body**:
```json
{
  "refreshToken": "0vlAXB..."
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbG...",
  "message": "Token refreshed successfully"
}
```

**Errors**:
- `401`: Invalid or expired refresh token

### Logout

Invalidate current session.

```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "refreshToken": "0vlAXB..."
}
```

**Response 200**:
```json
{
  "message": "Logged out successfully"
}
```

### Logout All Devices

Invalidate all sessions.

```
POST /api/v1/auth/logout-all
Authorization: Bearer <access_token>
```

**Response 200**:
```json
{
  "message": "Logged out from all devices successfully",
  "sessionsRevoked": 3
}
```

### Get Active Sessions

List all active sessions.

```
GET /api/v1/auth/sessions
Authorization: Bearer <access_token>
```

**Response 200**:
```json
{
  "sessions": [
    {
      "id": "uuid",
      "deviceInfo": "PostmanRuntime/7.32.3",
      "ipAddress": "::ffff:172.18.0.1",
      "createdAt": "2025-...",
      "lastUsedAt": "2025-...",
      "expiresAt": "2025-..."
    }
  ]
}
```

### Verify Email

Verify email address with token.

```
POST /api/v1/auth/verify-email
Content-Type: application/json
```

**Body**:
```json
{
  "token": "1KZoe7lg..."
}
```

**Response 200**:
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

**Errors**:
- `400`: Invalid or expired token

### Resend Verification Email

Request new verification email.

```
POST /api/v1/auth/resend-verification
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com"
}
```

**Response 200**:
```json
{
  "message": "Verification email sent successfully",
  "verificationToken": "new-token"
}
```

## Authorization Patterns

### Role-Based Access Control (RBAC)

User hierarchy:
```
SUPER_ADMIN (Level 5)
    ↓
ADMIN (Level 4)
    ↓
INSTITUTE (Level 3)
    ↓
MENTOR (Level 2)
    ↓
STUDENT (Level 1)
```

### Multi-Tenant Isolation

Users are isolated by `orgId`:
- `orgId = null`: Independent user
- `orgId = uuid`: Belongs to organization

**Access rules**:
- Students: Own data only (or org data if enrolled)
- Mentors: Students in same org
- Institutes: All users in their org
- Admins: All data

### Example Authorization Check

```javascript
const canAccess = (requester, targetOrgId) => {
  if (requester.userType === 'SUPER_ADMIN') return true;
  if (requester.userType === 'ADMIN') return true;
  if (requester.userType === 'INSTITUTE') {
    return targetOrgId === requester.userId;
  }
  if (requester.userType === 'MENTOR') {
    return targetOrgId === requester.orgId;
  }
  return false;
};
```

## Security Features

### Account Lockout

- Max 5 failed login attempts
- 15-minute lockout after 5 failures
- Counter resets on successful login

### Token Strategy

- Access tokens: 15-minute expiry (short-lived)
- Refresh tokens: 30-day expiry (long-lived)
- Refresh tokens stored as SHA-256 hashes
- Support for token rotation

### Password Requirements

Enforced at API level:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

Hashing: bcrypt with 12 salt rounds

### Audit Trail

Tracked fields:
- `lastLoginAt`: Last successful login
- `failedLoginAttempts`: Failed login counter
- `lockedUntil`: Account lockout timestamp
- `deviceInfo`: User-Agent string
- `ipAddress`: Client IP
- `lastUsedAt`: Last token usage

## Testing with Postman

### Setup Environment

Create environment with variables:
```
baseUrl: http://localhost:3000
accessToken: (empty, will be set by tests)
refreshToken: (empty, will be set by tests)
```

### Auto-save Tokens

Add to Login request Tests tab:
```javascript
if (pm.response.code === 200) {
    const res = pm.response.json();
    pm.environment.set("accessToken", res.accessToken);
    pm.environment.set("refreshToken", res.refreshToken);
}
```

### Common Test Flows

**Registration Flow**:
1. Register → Get verification token
2. Verify email → Email verified
3. Login → Get tokens
4. Get profile → View user data

**Token Refresh Flow**:
1. Login → Get tokens
2. Wait 15+ min (or test immediately)
3. Refresh → Get new access token
4. Use new token for requests

**Account Lockout Test**:
1. Login with wrong password (5 times)
2. Account locked after 5th attempt
3. Login with correct password → Error
4. Wait 15 min → Can login again

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate email) |
| 423 | Locked (account locked) |
| 500 | Internal Server Error |

## Rate Limiting

Recommended limits:
- Auth endpoints: 10 req/min per IP
- Password reset: 3 req/hour per email
- Email verification: 5 req/hour per email

## Best Practices

1. Always use HTTPS in production
2. Store refresh tokens securely (httpOnly cookies)
3. Never log passwords or tokens
4. Implement CSRF protection
5. Use strict CORS policy
6. Enable security headers (helmet.js)
7. Monitor failed login attempts
8. Regularly rotate JWT secrets
