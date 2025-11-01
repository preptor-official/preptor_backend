# PreptorAI Backend - Postman Testing Guide

## Quick Start

Your server is already running in Docker at: **http://localhost:3000**

---

## What Happens If You Run `npm run dev`?

### ❌ WILL CRASH with this error:
```
PrismaClientInitializationError: Unable to require(query_engine-windows.dll.node)
The Prisma engines do not seem to be compatible with your system.
Details: is not a valid Win32 application.
```

### Why?
- You're on **Windows ARM64**
- Prisma has **no query engine for Windows ARM64**
- The app **must run in Docker** (Linux ARM64 container)

### ✅ Correct way to run:
```bash
# Start Docker containers (already running)
npm run docker:up

# View logs
docker logs preptor_backend -f

# Restart after code changes
npm run docker:rebuild
```

---

## Postman Setup Instructions

### Step 1: Create a New Collection

1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: **"PreptorAI Auth API"**
4. Set Base URL as a collection variable:
   - Click on your collection
   - Go to **"Variables"** tab
   - Add variable:
     - **Variable**: `baseUrl`
     - **Initial Value**: `http://localhost:3000`
     - **Current Value**: `http://localhost:3000`

### Step 2: Create Environment Variables (Optional but Recommended)

1. Click **"Environments"** (left sidebar)
2. Create new environment: **"PreptorAI Local"**
3. Add these variables:
   - `baseUrl`: `http://localhost:3000`
   - `accessToken`: (leave empty - will be set after login)
   - `refreshToken`: (leave empty - will be set after login)
   - `userId`: (leave empty)

---

## API Endpoints for Postman

### 1. Health Check

**Method**: `GET`
**URL**: `{{baseUrl}}/health`
**Headers**: None
**Body**: None

**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T04:04:42.615Z",
  "uptime": 3497.285816227,
  "environment": "development"
}
```

---

### 2. Register New User

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/register`
**Headers**:
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "email": "student@example.com",
  "password": "Student@123456",
  "userType": "STUDENT"
}
```

**User Types Available**:
- `STUDENT`
- `MENTOR`
- `INSTITUTE`
- `ADMIN`
- `SUPER_ADMIN`

**Password Requirements**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Expected Response** (201 Created):
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "9a353c53-9a38-42a7-b7d0-8e6c1661a429",
    "email": "student@example.com",
    "userType": "STUDENT",
    "orgId": null,
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2025-11-01T04:05:13.632Z"
  },
  "verificationToken": "1KZoe7lgHvvnQ-zd_1_hdxYIeyqkj578pQ9tXnd3fvA",
  "verificationUrl": "http://localhost:3000/verify-email?token=..."
}
```

---

### 3. Login

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/login`
**Headers**:
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "email": "student@example.com",
  "password": "Student@123456"
}
```

**Expected Response** (200 OK):
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "0vlAXBFO_4b2N1GV72EmK-OBXCNmsLrp4PR3_9slIa0",
  "user": {
    "id": "9a353c53-9a38-42a7-b7d0-8e6c1661a429",
    "email": "student@example.com",
    "userType": "STUDENT",
    "orgId": null,
    "emailVerified": false
  }
}
```

**💡 Postman Tip - Auto-save Token**:
Add this to the **Tests** tab of the Login request:
```javascript
// Save access token to environment
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("accessToken", response.accessToken);
    pm.environment.set("refreshToken", response.refreshToken);
    pm.environment.set("userId", response.user.id);
    console.log("✅ Tokens saved to environment");
}
```

---

### 4. Get Current User Profile (Protected)

**Method**: `GET`
**URL**: `{{baseUrl}}/api/v1/auth/me`
**Headers**:
```
Authorization: Bearer {{accessToken}}
```
**Body**: None

**Expected Response** (200 OK):
```json
{
  "user": {
    "id": "9a353c53-9a38-42a7-b7d0-8e6c1661a429",
    "email": "student@example.com",
    "userType": "STUDENT",
    "orgId": null,
    "isActive": true,
    "emailVerified": false,
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "createdAt": "2025-11-01T04:05:13.632Z",
    "updatedAt": "2025-11-01T04:05:41.463Z",
    "lastLoginAt": "2025-11-01T04:05:41.461Z"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "No token provided"
}
```

---

### 5. Refresh Access Token

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/refresh`
**Headers**:
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

**💡 Postman Tip - Auto-update Token**:
Add to **Tests** tab:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("accessToken", response.accessToken);
    console.log("✅ Access token refreshed");
}
```

---

### 6. Get Active Sessions

**Method**: `GET`
**URL**: `{{baseUrl}}/api/v1/auth/sessions`
**Headers**:
```
Authorization: Bearer {{accessToken}}
```
**Body**: None

**Expected Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "abc-123",
      "deviceInfo": "PostmanRuntime/7.32.3",
      "ipAddress": "::ffff:172.18.0.1",
      "createdAt": "2025-11-01T04:05:41.472Z",
      "lastUsedAt": "2025-11-01T04:15:30.123Z",
      "expiresAt": "2025-12-01T04:05:41.472Z"
    }
  ]
}
```

---

### 7. Logout (Current Session)

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/logout`
**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```
**Body** (raw JSON):
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

### 8. Logout All Devices

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/logout-all`
**Headers**:
```
Authorization: Bearer {{accessToken}}
```
**Body**: None

**Expected Response** (200 OK):
```json
{
  "message": "Logged out from all devices successfully",
  "sessionsRevoked": 3
}
```

---

### 9. Verify Email

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/verify-email`
**Headers**:
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "token": "1KZoe7lgHvvnQ-zd_1_hdxYIeyqkj578pQ9tXnd3fvA"
}
```
*(Use the token from registration response)*

**Expected Response** (200 OK):
```json
{
  "message": "Email verified successfully. You can now access all features.",
  "user": {
    "id": "9a353c53-9a38-42a7-b7d0-8e6c1661a429",
    "email": "student@example.com",
    "emailVerified": true
  }
}
```

---

### 10. Resend Verification Email

**Method**: `POST`
**URL**: `{{baseUrl}}/api/v1/auth/resend-verification`
**Headers**:
```
Content-Type: application/json
```
**Body** (raw JSON):
```json
{
  "email": "student@example.com"
}
```

**Expected Response** (200 OK):
```json
{
  "message": "Verification email sent successfully",
  "verificationToken": "new-token-here"
}
```

---

## Testing Workflows

### Workflow 1: Complete User Registration Flow

1. **Register** → Save `verificationToken`
2. **Verify Email** → Use token from step 1
3. **Login** → Save `accessToken` and `refreshToken`
4. **Get Profile** → Use `accessToken`

### Workflow 2: Token Refresh Flow

1. **Login** → Get tokens (valid for 15 min)
2. Wait 15+ minutes (or test immediately)
3. **Refresh Token** → Get new `accessToken`
4. **Get Profile** → Use new token

### Workflow 3: Account Lockout Test

1. **Login** with wrong password (5 times)
2. On 5th attempt: Account locked for 15 minutes
3. **Login** with correct password → Error: "Account locked"
4. Wait 15 minutes or manually unlock in database

### Workflow 4: Multi-Device Session Management

1. **Login** from Postman → Token 1
2. **Login** from browser → Token 2
3. **Get Sessions** → See both sessions
4. **Logout** → Revoke current session only
5. **Logout All** → Revoke all sessions

---

## Common Errors & Solutions

### Error: "Cannot reach server"
**Solution**: Check if Docker container is running:
```bash
docker ps | grep preptor_backend
```
If not running:
```bash
npm run docker:up
```

### Error: "jwt expired"
**Solution**: Use refresh token endpoint or login again

### Error: "Account locked"
**Solution**: Wait 15 minutes or run SQL:
```sql
UPDATE users SET failed_login_attempts = 0, locked_until = NULL
WHERE email = 'your@email.com';
```

### Error: "Email already exists"
**Solution**: Use different email or delete existing user:
```sql
DELETE FROM users WHERE email = 'your@email.com';
```

---

## Import to Postman (Quick Method)

Create a file `PreptorAI.postman_collection.json` with the requests above, then:
1. Open Postman
2. Click **Import**
3. Select the JSON file
4. All requests will be added automatically

---

## Testing Tips

1. **Use Environment Variables** - Makes testing easier
2. **Add Tests Scripts** - Auto-save tokens after login
3. **Create Folders** - Organize by feature (Auth, Users, etc.)
4. **Use Pre-request Scripts** - Check token expiry
5. **Save Examples** - Document expected responses

---

## Current Server Status

**Docker Container**: Running ✅
**Port**: 3000
**Environment**: Development
**Database**: Neon PostgreSQL (Connected ✅)
**Uptime**: 1+ hour

To view live logs while testing:
```bash
docker logs preptor_backend -f
```

---

## Next Steps

1. Import collection to Postman
2. Create environment with `baseUrl` = `http://localhost:3000`
3. Test **Register → Login → Get Profile** workflow
4. Set up auto-token saving in Login request
5. Test all protected endpoints

Happy Testing! 🚀
