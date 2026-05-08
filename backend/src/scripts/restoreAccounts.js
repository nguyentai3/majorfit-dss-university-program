const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('../config/env');

const prisma = new PrismaClient();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const userPasswordHash = await bcrypt.hash(requiredEnv('DEFAULT_USER_PASSWORD'), 12);
  const adminPasswordHash = await bcrypt.hash(requiredEnv('ADMIN_PASSWORD'), 12);

  const user = await prisma.user.upsert({
    where: { email: 'test@gmail.com' },
    update: { password: userPasswordHash },
    create: {
      email: 'test@gmail.com',
      password: userPasswordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
    },
  });
  console.log('User:', user.email, user.id);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@majorfit.local' },
    update: { password: adminPasswordHash },
    create: {
      username: 'admin',
      email: 'admin@majorfit.local',
      password: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'MajorFit',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('Admin:', admin.email, admin.username, admin.id);

  const uCount = await prisma.user.count();
  const aCount = await prisma.admin.count();
  console.log('Total => Users:', uCount, 'Admins:', aCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
