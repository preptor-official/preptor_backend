# Deployment Guide

Platform-specific deployment information and production configuration.

## Platform Compatibility

### Windows ARM64

**Cannot run natively** due to Prisma limitations.

Running `npm run dev` on Windows ARM64 will fail with:
```
PrismaClientInitializationError: query_engine-windows.dll.node is not a valid Win32 application
```

**Reason**: Prisma has no query engine for Windows ARM64.

### Supported Methods

1. **Docker** (Recommended for local development)
   - Uses Linux ARM64 container
   - All dependencies work correctly
   - Hot reload enabled

2. **WSL2** (Alternative for local development)
   - Run Ubuntu/Debian on Windows
   - Full Linux compatibility

3. **Production** (Any Linux-based host)
   - AWS, GCP, Azure, DigitalOcean, etc.
   - Both x64 and ARM64 supported

## Local Development

### Docker Deployment

Current setup uses `docker-compose.yml` with:
- Node.js 22 Alpine (Linux ARM64)
- PostgreSQL 16
- Volume mounts for hot reload

```bash
# Start
npm run docker:up

# Logs
docker logs preptor_backend -f

# Restart
npm run docker:rebuild

# Stop
npm run docker:down
```

## Production Deployment

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
JWT_SECRET="<generate-secure-256-bit-key>"
JWT_REFRESH_SECRET="<generate-secure-256-bit-key>"
NODE_ENV="production"
PORT=3000
```

### Migration Steps

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Start server
npm start
```

### Database (Neon)

Configured for:
- Region: AWS Singapore (ap-southeast-1)
- Database: preptorai_db
- SSL: Required

To migrate to Neon:
1. Create Neon project
2. Copy DATABASE_URL to .env
3. Run `npx prisma migrate deploy`

### Security Checklist

- [ ] Change JWT_SECRET to strong random value (min 32 chars)
- [ ] Enable HTTPS (required for production)
- [ ] Configure CORS with strict origin whitelist
- [ ] Add rate limiting
- [ ] Set secure cookie flags
- [ ] Enable helmet.js headers
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Enable database backups

## Cloud Platforms

### AWS

- Use ECS/EKS for containers
- RDS for PostgreSQL (or keep Neon)
- ALB for load balancing
- CloudWatch for logging

### Google Cloud

- Use Cloud Run for containers
- Cloud SQL for PostgreSQL
- Cloud Load Balancing
- Cloud Logging

### Azure

- Use Container Instances
- Azure Database for PostgreSQL
- Application Gateway
- Application Insights

### DigitalOcean

- Use App Platform
- Managed PostgreSQL
- Built-in load balancing

## Container Configuration

### Dockerfile

Current configuration:
- Platform: `linux/arm64`
- Base: `node:22-alpine`
- Multi-stage build
- Prisma Client generated at build time

### docker-compose.yml

Services:
- `app`: Node.js backend
- `postgres`: PostgreSQL 16

Volumes:
- Source code mounted for hot reload
- Database persisted in named volume

## Troubleshooting

### Issue: Native Windows execution fails

**Solution**: Use Docker or WSL2. Never run directly on Windows ARM64.

### Issue: Prisma Client errors in container

```bash
# Rebuild with fresh Prisma Client
npm run docker:rebuild
```

### Issue: Database connection timeout

1. Check DATABASE_URL
2. Verify SSL mode for Neon (`?sslmode=require`)
3. Check firewall rules

### Issue: Port conflicts

```bash
# Check ports
netstat -ano | findstr :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

## Package Notes

### Password Hashing

Originally planned: `argon2` (incompatible with Windows ARM64)

Current: `bcrypt` with 12 salt rounds
- Works on all platforms
- Meets 2025 security standards
- Compatible with Windows ARM64 in Docker

## Current Status

- Docker containers: Running
- Database: Connected to Neon
- Platform: Windows 11 ARM64 host, Linux ARM64 containers
- All auth endpoints: Operational
- Security features: Verified

## Monitoring

Recommended tools:
- Application: Sentry, Datadog, New Relic
- Database: Neon dashboard, pganalyze
- Logs: CloudWatch, Loggly, Papertrail
- Uptime: UptimeRobot, Pingdom

## Performance

Recommended configuration:
- Container: 1 CPU, 2GB RAM minimum
- Database: Connection pooling enabled
- Caching: Redis for session management
- CDN: CloudFlare for static assets
