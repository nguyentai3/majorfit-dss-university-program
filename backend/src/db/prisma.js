const { PrismaClient } = require('@prisma/client');
const { env } = require('../config/env');
void env;
const prisma = global.__majorfitPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.__majorfitPrisma = prisma;
}

module.exports = { prisma };
