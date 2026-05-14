const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function upsertUser({ email, fullName, role, restaurantId, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, restaurantId, passwordHash },
    create: { email, fullName, role, restaurantId, passwordHash }
  });
}

async function upsertOutlet({ restaurantId, name, city, timezone }) {
  const existing = await prisma.outlet.findFirst({ where: { restaurantId, name } });
  if (existing) {
    return prisma.outlet.update({
      where: { id: existing.id },
      data: { city, timezone }
    });
  }
  return prisma.outlet.create({
    data: { restaurantId, name, city, timezone }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {
      name: 'Demo Restaurant',
      plan: 'enterprise'
    },
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      plan: 'enterprise'
    }
  });

  await Promise.all([
    upsertUser({
      email: 'owner@kitchenflow.dev',
      fullName: 'Demo Owner',
      role: 'owner',
      restaurantId: restaurant.id,
      passwordHash
    }),
    upsertUser({
      email: 'admin@kitchenflow.dev',
      fullName: 'Demo Admin',
      role: 'admin',
      restaurantId: restaurant.id,
      passwordHash
    }),
    upsertOutlet({
      restaurantId: restaurant.id,
      name: 'Demo Outlet',
      city: 'Bengaluru',
      timezone: 'Asia/Kolkata'
    })
  ]);

  console.log('Seeded demo restaurant, owner/admin users, and sample outlet.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
