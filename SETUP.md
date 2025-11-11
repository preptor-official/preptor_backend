# Setup Guide

Complete setup instructions for Preptor backend.

## Prerequisites

- Docker Desktop with WSL2 backend
- Node.js 22 (optional, for local development)
- Git

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd preptor_backend
npm install
```

### 2. Environment Configuration

```bash
# Copy example env
copy .env.example .env

# Edit .env with your values
```

Required variables:
```env
DATABASE_URL="postgresql://user:pass@localhost:5433/preptorai_db"
JWT_SECRET="generate-a-secure-random-string-min-32-characters"
NODE_ENV="development"
PORT=3000
```

### 3. Database Setup

Enable required PostgreSQL extension:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Run migrations:

```bash
npm run prisma:migrate
```

This creates:
- `users` table
- `refresh_tokens` table
- `verification_tokens` table
- User role enums
- Indexes

### 4. Start Services

```bash
# Start Docker containers
npm run docker:up

# Verify containers are running
docker ps
```

Expected output:
```
CONTAINER          STATUS    PORTS
preptor_backend    Up        0.0.0.0:3000->3000/tcp
preptor_postgres   Up        0.0.0.0:5433->5432/tcp
```

### 5. Verify Setup

Test health endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-...",
  "environment": "development"
}
```

## Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Rebuild containers
npm run docker:rebuild

# Reset everything (removes volumes)
npm run docker:reset
```

## Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
npx prisma migrate deploy

# Open database GUI
npm run prisma:studio
```

## Troubleshooting

### Containers won't start

```bash
# Check status
docker ps -a

# View logs
docker-compose logs

# Reset everything
npm run docker:reset
```

### Port already in use

```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

### Database connection failed

1. Check DATABASE_URL in .env
2. Verify PostgreSQL container is running
3. For Neon: verify connection string and SSL mode

### Prisma Client errors

```bash
# Regenerate client
npm run prisma:generate

# If using Docker, rebuild
npm run docker:rebuild
```

## Testing the Setup

### 1. Register a user

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "userType": "STUDENT"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

Save the `accessToken` from response.

### 3. Get profile

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

## Next Steps

1. Test all auth endpoints
2. Set up Postman collection
3. Configure email service for verification
4. Add additional modules

See [API_GUIDE.md](./API_GUIDE.md) for endpoint documentation.
