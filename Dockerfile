# Use Node.js 22 Alpine for ARM64 (smaller image size)
FROM --platform=linux/arm64 node:22-alpine

# Install OpenSSL for Prisma on Alpine
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# For development: use nodemon for hot reload
CMD ["npx", "nodemon", "src/server.js"]
