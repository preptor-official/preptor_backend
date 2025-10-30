const { PrismaClient } = require('@prisma/client');

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit during hot reloads in development.

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;