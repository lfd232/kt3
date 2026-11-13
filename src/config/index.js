require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  // mode: 'insensitive' поддерживается только в PostgreSQL
  isPostgres: databaseUrl.startsWith('postgres'),
  prisma: new PrismaClient(),
};
