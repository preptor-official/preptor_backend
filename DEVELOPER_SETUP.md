# Developer Setup Guide

Complete setup instructions for new developers. **Zero to running in 5 minutes.**

## Prerequisites

Install these first (one-time only):

1. **Docker Desktop** - Download from https://www.docker.com/products/docker-desktop/
   - Windows: Enable WSL2 during installation
   - Mac/Linux: Just install normally

2. **Git** - Download from https://git-scm.com/downloads

That's it! No Node.js, no PostgreSQL, no other dependencies needed.

---

## Setup Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/preptor-official/preptor_backend.git
cd preptor_backend
```

### Step 2: Create Environment File

```bash
# Windows (PowerShell)
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

**You don't need to edit .env** - default values work for local development!

### Step 3: Start Everything

```bash
npm run docker:up
```

**Wait 15-20 seconds** for containers to start.

### Step 4: Verify It's Working

Open browser or use curl:

```bash
# Test 1: Health check
curl http://localhost:3000/health

# Test 2: Register a user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test@123456\",\"userType\":\"STUDENT\"}"
```

Expected output: JSON response with user data.

---

## That's It! 🎉

Your backend is now running at **http://localhost:3000**

---

## Common Commands

```bash
# View logs
npm run docker:logs

# Stop server
npm run docker:down

# Restart server
npm run docker:rebuild

# Check status
docker ps
```

---

## Troubleshooting

### Issue: "Docker is not running"

**Solution:** Start Docker Desktop application first, then try again.

### Issue: "Port 3000 already in use"

**Solution:** Something else is using port 3000. Either:
- Stop that application
- Or change port in `docker-compose.yml`

### Issue: "npm: command not found"

**Solution:** The `npm run docker:up` command just runs Docker Compose. You can run directly:

```bash
docker-compose up -d
```

---

## Development Workflow

1. **Edit code** in `src/` folder
2. **Server auto-restarts** (hot reload enabled)
3. **View logs** with `npm run docker:logs`
4. **Commit changes** with git
5. **Push** to GitHub

---

## Need Help?

- Check logs: `docker logs preptor_backend -f`
- Check containers: `docker ps`
- See README.md for more details
