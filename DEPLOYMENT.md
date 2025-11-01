# PreptorAI Backend - Deployment Documentation

## Current System Status

### Environment Information
- **Host System**: Windows 11 ARM64
- **Development Mode**: Docker + WSL (Linux ARM64)
- **Database**: PostgreSQL 16 on Neon (Production) + Local Docker (Development)
- **Runtime**: Node.js 22

---

## IMPORTANT: Platform Compatibility

### ⚠️ Native Windows ARM64 Limitations

**DO NOT run `npm run dev` directly on Windows ARM64.** The following packages lack native ARM64 Windows support:

1. **Prisma** - No query engine for Windows ARM64
   - Error: `query_engine-windows.dll.node is not a valid Win32 application`

2. **Argon2** (originally planned) - No prebuilt binaries for Windows ARM64
   - Requires Visual Studio Build Tools + Windows SDK to compile
   - **Workaround Applied**: Switched to `bcrypt` (works on ARM64)

### ✅ Supported Deployment Methods

1. **Docker** (Recommended for local development)
   - Uses Linux ARM64 containers
   - All dependencies work correctly
   - Hot reload enabled via volume mounts

2. **WSL2** (Alternative for local development)
   - Run Ubuntu/Debian ARM64 on Windows
   - Install Node.js + dependencies natively in WSL

3. **Production** (Neon + Cloud hosting)
   - Deploy to Linux-based servers (AWS/GCP/Azure)
   - Prisma works on all standard Linux platforms

---

## Current Deployment Configuration

### Docker Containers (Running)
```
CONTAINER          STATUS              PORTS
preptor_backend    Up (1 hour)        0.0.0.0:3000->3000/tcp
preptor_postgres   Up (1 hour)        0.0.0.0:5433->5432/tcp
```

### Package Changes Made
- ✅ `bcrypt` installed (works on Windows ARM64)
- ⚠️ `argon2` installed but **incompatible** with Windows ARM64
  - Code updated to use `bcrypt` instead
  - Security: bcrypt with 12 salt rounds (2025 standard)

### Database Status
- ✅ Prisma schema created
- ✅ Migrations applied: `20251029123303_init_auth_schema`
- ✅ Tables created: `users`, `refresh_tokens`, `verification_tokens`
- ✅ Prisma Client generated (for Linux ARM64 in Docker)

---

## How to Run the Application

### Option 1: Docker (Recommended)

#### Start Services
```bash
npm run docker:up
# or
docker-compose up -d
```

#### View Logs
```bash
npm run docker:logs
# or
docker-compose logs -f app
```

#### Restart After Code Changes
```bash
npm run docker:rebuild
# or
docker-compose up -d --build
```

#### Stop Services
```bash
npm run docker:down
# or
docker-compose down
```

#### Reset Everything (Database + App)
```bash
npm run docker:reset
# or
docker-compose down -v && docker-compose up -d --build
```

### Option 2: WSL2

1. Open WSL terminal
2. Navigate to project directory
3. Run standard Node.js commands:
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### ❌ Option 3: Native Windows (NOT SUPPORTED on ARM64)
```bash
# DO NOT RUN THIS ON WINDOWS ARM64
npm run dev  # ❌ Will crash with Prisma error
```

---

## Testing the Deployment

### 1. Check Docker Status
```bash
docker ps
```
Expected: `preptor_backend` and `preptor_postgres` both showing "Up"

### 2. Test Health Endpoint
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### 3. Test Authentication Endpoints

**Register User**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "userType": "STUDENT"
  }'
```

**Login**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

**Get User Profile** (requires access token from login)
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

### Issue: Prisma Error on Windows
**Error**: `No native build was found for platform=win32 arch=arm64`

**Solution**: Use Docker or WSL2. Never run directly on Windows ARM64.

### Issue: argon2 Installation Fails
**Error**: `gyp ERR! find VS could not find any Visual Studio installation`

**Solution**: Already resolved - code uses `bcrypt` instead.

### Issue: Port 3000 Already in Use
```bash
# Find process using port
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Issue: Database Connection Failed
1. Check if Neon database is accessible
2. Verify `.env` file has correct `DATABASE_URL`
3. For local dev, ensure `preptor_postgres` container is running

---

## Production Deployment

### Environment Variables (Neon + Production)
```bash
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
JWT_SECRET="your-256-bit-secret"
JWT_REFRESH_SECRET="your-256-bit-refresh-secret"
NODE_ENV="production"
PORT=3000
```

### Migration Steps
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (production)
npx prisma migrate deploy

# Start server
npm start
```

---

## Summary

✅ **What Works**:
- Docker deployment (Linux ARM64 containers)
- WSL2 deployment
- Production deployment on Linux servers
- All authentication features fully implemented
- Database schema deployed to Neon

❌ **What Doesn't Work**:
- Native execution on Windows ARM64 (Prisma incompatibility)

🔧 **Fixes Applied**:
- Switched from argon2 to bcrypt for password hashing
- Documented deployment requirements
- Confirmed Docker containers are running correctly
