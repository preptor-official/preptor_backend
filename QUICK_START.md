# PreptorAI Backend - Quick Start Guide

## ⚠️ IMPORTANT: What Happens If You Run `npm run dev`?

```
D:\preptor_backend> npm run dev

❌ CRASH! Server will fail with:

PrismaClientInitializationError: Unable to require(
  D:\preptor_backend\node_modules\.prisma\client\query_engine-windows.dll.node
)

The Prisma engines do not seem to be compatible with your system.

Details: \\?\D:\preptor_backend\node_modules\.prisma\client\
query_engine-windows.dll.node is not a valid Win32 application.
```

### Why Does It Crash?
- Your PC: **Windows ARM64**
- Prisma needs: **Windows x64** (not available for ARM64)
- Solution: **Use Docker** (Linux ARM64 inside container)

---

## ✅ CORRECT Way to Run the Server

### Option 1: Use Docker (Recommended)

```bash
# Start the server (already running!)
npm run docker:up

# View logs in real-time
docker logs preptor_backend -f

# Check status
docker ps

# Restart after code changes
npm run docker:rebuild

# Stop server
npm run docker:down
```

### Current Status:
```
✅ Container: preptor_backend - Running on port 3000
✅ Database: preptor_postgres - Running on port 5433
✅ API: http://localhost:3000
```

---

## 🚀 Test with Postman NOW

### Step 1: Open Postman

### Step 2: Test Health Check
- Method: **GET**
- URL: `http://localhost:3000/health`
- Click **Send**

Expected Result:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T...",
  "uptime": 3497.28,
  "environment": "development"
}
```

### Step 3: Register a User
- Method: **POST**
- URL: `http://localhost:3000/api/v1/auth/register`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "yourname@example.com",
  "password": "YourPass@123",
  "userType": "STUDENT"
}
```
- Click **Send**

### Step 4: Login
- Method: **POST**
- URL: `http://localhost:3000/api/v1/auth/login`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "yourname@example.com",
  "password": "YourPass@123"
}
```
- Click **Send**
- **Copy the `accessToken`** from response

### Step 5: Get Your Profile
- Method: **GET**
- URL: `http://localhost:3000/api/v1/auth/me`
- Headers:
  - `Authorization: Bearer PASTE_YOUR_ACCESS_TOKEN_HERE`
- Click **Send**

---

## 📊 Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR WINDOWS PC (ARM64)                  │
│                                                             │
│  ❌ npm run dev                                             │
│     └─> CRASH (Prisma not compatible)                      │
│                                                             │
│  ✅ Docker Container (Linux ARM64)                          │
│     ├─> preptor_backend (Node.js app) ✅ Running           │
│     │   └─> Port 3000 → localhost:3000                     │
│     │                                                       │
│     └─> preptor_postgres (Database) ✅ Running              │
│         └─> Port 5432 → localhost:5433                     │
│                                                             │
│  ✅ Postman (Windows)                                       │
│     └─> http://localhost:3000 → Works! ✅                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
               ┌─────────────────────┐
               │   Neon PostgreSQL   │
               │  (Production DB)    │
               │  ✅ Connected       │
               └─────────────────────┘
```

---

## 📝 Summary

| Action | Result |
|--------|--------|
| `npm run dev` | ❌ CRASHES (Prisma incompatible) |
| `npm run docker:up` | ✅ Works (Linux ARM64 container) |
| Docker container status | ✅ Already running |
| Server URL | http://localhost:3000 |
| All endpoints | ✅ Working |
| Postman testing | ✅ Ready to use |

---

## 🔗 More Details

- **Full Postman Guide**: See `POSTMAN_GUIDE.md`
- **Deployment Info**: See `DEPLOYMENT.md`
- **Test Results**: See `TEST_RESULTS.md`

---

## 💡 Quick Commands

```bash
# View server logs
docker logs preptor_backend -f

# Restart server
docker restart preptor_backend

# Check all containers
docker ps -a

# Stop everything
npm run docker:down

# Start everything
npm run docker:up
```

Your server is ready! Open Postman and start testing 🚀
