# 🐳 Docker Setup Guide for Preptor Backend (Windows 11 ARM64)

## ✅ What's Been Configured

Your project is now fully configured with:
- **Dockerfile** optimized for Node.js 22 on ARM64 (Alpine-based)
- **docker-compose.yml** with PostgreSQL 16
- **Updated package.json** with Docker workflow scripts
- **Environment configuration** template

## 📋 Prerequisites

1. **WSL2** installed and configured ✅ (already verified)
2. **Docker Desktop** running with WSL2 backend ✅ (already verified)
3. **Node.js v22.14.0** ✅ (already installed)

## 🚀 Quick Start

### 1. Configure Environment Variables

```bash
# Copy the example env file
copy .env.example .env

# Edit .env with your preferred editor (VS Code, Notepad, etc.)
# The default DATABASE_URL is already set for local Docker
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and the app in detached mode
npm run docker:up

# View logs to verify everything started correctly
npm run docker:logs
```

### 3. Verify Setup

```bash
# Check if containers are running
docker ps

# You should see:
# - preptor_postgres (PostgreSQL database)
# - preptor_backend (Node.js app)
```

## 📝 Available NPM Scripts

### Docker Operations
```bash
npm run docker:up          # Start all services (detached mode)
npm run docker:down        # Stop all services
npm run docker:logs        # View app logs (follow mode)
npm run docker:rebuild     # Rebuild and restart containers
npm run docker:reset       # Complete reset: remove volumes & rebuild
```

### Prisma Operations
```bash
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open Prisma Studio (database GUI)
```

### Development
```bash
npm run dev                # Run locally with nodemon (not in Docker)
npm run start              # Run locally without hot reload
npm test                   # Run tests with Jest
```

## 🧪 Testing Your Setup

### Test 1: Database Connection
```bash
# Access the database directly
docker exec -it preptor_postgres psql -U preptor -d preptorai_db

# Inside psql, run:
\dt              # List tables
\q               # Quit
```

### Test 2: App Health Check
```bash
# Check if the app is responding
curl http://localhost:3000

# Or open in browser:
# http://localhost:3000
```

### Test 3: Prisma Studio
```bash
# Open Prisma Studio to view/edit data
npm run prisma:studio

# Opens at http://localhost:5555
```

## 🔧 Troubleshooting

### Issue: Containers won't start
```bash
# Check Docker status
docker ps -a

# View detailed logs
docker-compose logs

# Reset everything
npm run docker:reset
```

### Issue: Port 5432 already in use
```bash
# Check what's using the port
netstat -ano | findstr :5432

# Option 1: Stop the conflicting service
# Option 2: Change port in docker-compose.yml (e.g., "5433:5432")
```

### Issue: Prisma Client out of sync
```bash
# Regenerate Prisma Client
npm run prisma:generate

# If in Docker, rebuild
npm run docker:rebuild
```

### Issue: Database connection refused
```bash
# Check if PostgreSQL is healthy
docker inspect preptor_postgres | findstr "Status"

# Restart database
docker-compose restart postgres
```

## 🔄 Development Workflow

### Making Schema Changes
```bash
# 1. Edit prisma/schema.prisma
# 2. Create and apply migration
npm run prisma:migrate

# 3. If using Docker, rebuild
npm run docker:rebuild
```

### Viewing Database
```bash
# Option 1: Prisma Studio (GUI)
npm run prisma:studio

# Option 2: Direct psql access
docker exec -it preptor_postgres psql -U preptor -d preptorai_db
```

### Hot Reload in Docker
The docker-compose.yml has volumes mounted for:
- `./src` → `/app/src`
- `./prisma` → `/app/prisma`

Changes to these directories will reflect in the container!

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Windows 11 ARM64 (Host)            │
│  ┌───────────────────────────────┐  │
│  │  WSL2 (Ubuntu)                │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Docker Engine          │  │  │
│  │  │  ┌──────────────────┐   │  │  │
│  │  │  │ preptor_postgres │   │  │  │
│  │  │  │ PostgreSQL 16    │   │  │  │
│  │  │  │ Port: 5432       │   │  │  │
│  │  │  └──────────────────┘   │  │  │
│  │  │  ┌──────────────────┐   │  │  │
│  │  │  │ preptor_backend  │   │  │  │
│  │  │  │ Node.js 22       │   │  │  │
│  │  │  │ Port: 3000       │   │  │  │
│  │  │  └──────────────────┘   │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🌐 Using Neon (Cloud PostgreSQL) Instead

If you want to use Neon instead of local PostgreSQL:

1. Comment out the database service in `docker-compose.yml`
2. Update `.env` with your Neon connection string:
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/preptorai_db?sslmode=require"
   ```
3. Run migrations against Neon:
   ```bash
   npm run prisma:migrate
   ```

## 📚 Additional Resources

- [Docker Desktop for Windows ARM64](https://docs.docker.com/desktop/install/windows-install/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Need help?** Check the troubleshooting section above or open an issue.
