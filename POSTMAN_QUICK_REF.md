# Postman Quick Reference - PreptorAI Auth API

## Base URL
```
http://localhost:3000
```

---

## HTTP Methods Cheat Sheet

| Endpoint | Method | Auth Required | Body Required |
|----------|--------|---------------|---------------|
| `/health` | **GET** | ❌ No | ❌ No |
| `/api/v1/auth/register` | **POST** | ❌ No | ✅ Yes |
| `/api/v1/auth/login` | **POST** | ❌ No | ✅ Yes |
| `/api/v1/auth/refresh` | **POST** | ❌ No | ✅ Yes |
| `/api/v1/auth/logout` | **POST** | ✅ Yes | ✅ Yes |
| `/api/v1/auth/logout-all` | **POST** | ✅ Yes | ❌ No |
| `/api/v1/auth/me` | **GET** | ✅ Yes | ❌ No |
| `/api/v1/auth/sessions` | **GET** | ✅ Yes | ❌ No |
| `/api/v1/auth/verify-email` | **POST** | ❌ No | ✅ Yes |
| `/api/v1/auth/resend-verification` | **POST** | ❌ No | ✅ Yes |

---

## Common Error: Wrong HTTP Method

### ❌ WRONG - Using GET
```
GET http://localhost:3000/api/v1/auth/login
```
**Error**: `Cannot GET /api/v1/auth/login`

### ✅ CORRECT - Using POST
```
POST http://localhost:3000/api/v1/auth/login
Headers: Content-Type: application/json
Body: {"email":"test@example.com","password":"Test@123456"}
```
**Success**: Returns access token + refresh token

---

## Postman Setup - Step by Step

### 1. Health Check (No Auth)
- **Method**: `GET` ← Click dropdown, select GET
- **URL**: `http://localhost:3000/health`
- **Headers**: None needed
- **Body**: None
- Click **Send**

---

### 2. Register User (No Auth)
- **Method**: `POST` ← Important! Select POST
- **URL**: `http://localhost:3000/api/v1/auth/register`
- **Headers**:
  - Click "Headers" tab
  - Add: `Content-Type` = `application/json`
- **Body**:
  - Click "Body" tab
  - Select "raw" radio button
  - Select "JSON" from dropdown (right side)
  - Paste:
```json
{
  "email": "yourname@example.com",
  "password": "YourPass@123",
  "userType": "STUDENT"
}
```
- Click **Send**
- **Save the email/password** for next step

---

### 3. Login (No Auth)
- **Method**: `POST` ← Important! Select POST
- **URL**: `http://localhost:3000/api/v1/auth/login`
- **Headers**:
  - `Content-Type` = `application/json`
- **Body** (raw JSON):
```json
{
  "email": "yourname@example.com",
  "password": "YourPass@123"
}
```
- Click **Send**
- **Copy the `accessToken`** from response

**Auto-save token (Optional)**:
- Go to "Tests" tab
- Paste this:
```javascript
if (pm.response.code === 200) {
    const res = pm.response.json();
    pm.environment.set("accessToken", res.accessToken);
    pm.environment.set("refreshToken", res.refreshToken);
}
```

---

### 4. Get Profile (Requires Auth)
- **Method**: `GET` ← Select GET
- **URL**: `http://localhost:3000/api/v1/auth/me`
- **Headers**:
  - Click "Authorization" tab
  - Type: Select "Bearer Token"
  - Token: Paste your `accessToken`

  **OR manually add header**:
  - Go to "Headers" tab
  - Add: `Authorization` = `Bearer YOUR_ACCESS_TOKEN_HERE`
- **Body**: None
- Click **Send**

---

## Visual Guide: Postman Interface

```
┌─────────────────────────────────────────────────────────┐
│  [GET ▼]  http://localhost:3000/api/v1/auth/login       │ ← Change to POST!
│                                                 [Send]   │
├─────────────────────────────────────────────────────────┤
│  Params | Authorization | Headers | Body | Tests        │
│                                                          │
│  ○ none                                                  │
│  ○ form-data                                            │
│  ○ x-www-form-urlencoded                               │
│  ● raw    [JSON ▼]  ← Select this + JSON               │
│  ○ binary                                               │
│                                                          │
│  {                                                       │
│    "email": "test@example.com",                         │
│    "password": "Test@123456"                            │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Test Sequence

### Test 1: Health Check
```
GET http://localhost:3000/health
```
✅ Expected: `{"status":"healthy"...}`

### Test 2: Register
```
POST http://localhost:3000/api/v1/auth/register
Body: {"email":"test@example.com","password":"Test@123456","userType":"STUDENT"}
```
✅ Expected: User created with verification token

### Test 3: Login
```
POST http://localhost:3000/api/v1/auth/login
Body: {"email":"test@example.com","password":"Test@123456"}
```
✅ Expected: Access token returned

### Test 4: Get Profile
```
GET http://localhost:3000/api/v1/auth/me
Header: Authorization: Bearer YOUR_TOKEN
```
✅ Expected: User profile data

---

## Common Mistakes

| Mistake | Error | Solution |
|---------|-------|----------|
| Using GET for login | `Cannot GET /api/v1/auth/login` | Change to POST |
| No Content-Type header | `400 Bad Request` | Add `Content-Type: application/json` |
| No body on POST | `400 Bad Request` | Add JSON body |
| Missing Bearer prefix | `401 Unauthorized` | Add "Bearer " before token |
| Wrong JSON format | `400 Bad Request` | Check JSON syntax |
| No Authorization header | `401 No token provided` | Add Authorization header |

---

## HTTP Method Rules

### Use **GET** for:
- ✅ `/health`
- ✅ `/api/v1/auth/me`
- ✅ `/api/v1/auth/sessions`

### Use **POST** for:
- ✅ `/api/v1/auth/register`
- ✅ `/api/v1/auth/login`
- ✅ `/api/v1/auth/refresh`
- ✅ `/api/v1/auth/logout`
- ✅ `/api/v1/auth/logout-all`
- ✅ `/api/v1/auth/verify-email`
- ✅ `/api/v1/auth/resend-verification`

---

## Need Help?

**Server logs**:
```bash
docker logs preptor_backend -f
```

**Check if server is running**:
```bash
docker ps | grep preptor
```

**Restart server**:
```bash
docker restart preptor_backend
```

---

## Password Requirements Reminder

- ✅ Minimum 8 characters
- ✅ At least 1 uppercase (A-Z)
- ✅ At least 1 lowercase (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (!@#$%^&*)

Example valid passwords:
- `Test@123456` ✅
- `Student@2024` ✅
- `MyPass!123` ✅

Example invalid passwords:
- `test123` ❌ (no uppercase, no special char)
- `TEST123` ❌ (no lowercase, no special char)
- `Test123` ❌ (no special char)
- `Test@12` ❌ (too short, less than 8 chars)
