const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const channels = ['swiggy', 'zomato', 'uber_eats', 'deliveroo'];
const statuses = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const customers = [
  'Aarav Sharma',
  'Mira Iyer',
  'Kabir Mehta',
  'Nisha Rao',
  'Dev Malhotra',
  'Anika Sen',
  'Ishaan Kapoor',
  'Rhea Nair',
  'Vihaan Reddy',
  'Tara Bose'
];
const menuSeed = [
  { name: 'Truffle Paneer Bowl', category: 'Signature Bowls', priceAmount: 460, variants: ['Regular', 'Jain', 'Extra paneer'] },
  { name: 'Korean Millet Bowl', category: 'Signature Bowls', priceAmount: 760, variants: ['Regular', 'Vegan', 'Extra protein'] },
  { name: 'Nashville Chicken Stack', category: 'Burgers', priceAmount: 715, variants: ['Regular', 'Extra hot'] },
  { name: 'Smoked Butter Chicken Rice', category: 'Rice Bowls', priceAmount: 620, variants: ['Regular', 'Large'] },
  { name: 'Peri Peri Fries', category: 'Sides', priceAmount: 220, variants: ['Regular', 'Loaded'] },
  { name: 'Blueberry Kefir', category: 'Beverages', priceAmount: 260, variants: ['250ml', '500ml'] },
  { name: 'Cold Brew Tonic', category: 'Beverages', priceAmount: 240, variants: ['Classic', 'Orange'] },
  { name: 'Chocolate Millet Brownie', category: 'Desserts', priceAmount: 190, variants: ['Single', 'Box of 4'] }
];
const inventorySeed = [
  ['PNR-CUBE', 'Paneer cubes', 'kg', 18, 15],
  ['MLT-BASE', 'Millet base', 'kg', 42, 28],
  ['CHK-FIL', 'Chicken fillet', 'kg', 24, 18],
  ['KEF-BLU', 'Blueberry kefir', 'litre', 9, 12],
  ['FRY-POT', 'Potato fries', 'kg', 36, 20],
  ['SAU-PERI', 'Peri peri sauce', 'litre', 11, 8],
  ['RCE-BSM', 'Basmati rice', 'kg', 55, 35],
  ['BOX-MED', 'Medium delivery boxes', 'units', 320, 220]
];

function pick(items, index) {
  return items[index % items.length];
}

function daysAgo(days, hourOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + hourOffset, (hourOffset * 7) % 60, 0, 0);
  return date;
}

async function upsertUser({ email, fullName, role, restaurantId, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, restaurantId, passwordHash },
    create: { email, fullName, role, restaurantId, passwordHash }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: { name: 'Demo Restaurant', plan: 'enterprise' },
    create: { name: 'Demo Restaurant', slug: 'demo-restaurant', plan: 'enterprise' }
  });

  await prisma.refreshToken.deleteMany({ where: { user: { restaurantId: restaurant.id } } });
  await prisma.webhookEvent.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.payoutLedger.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.jobActivity.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.analyticsEvent.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.order.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.menuOutletScope.deleteMany({ where: { menuItem: { restaurantId: restaurant.id } } });
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.inventoryItem.deleteMany({ where: { outlet: { restaurantId: restaurant.id } } });
  await prisma.integration.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.outlet.deleteMany({ where: { restaurantId: restaurant.id } });

  await Promise.all([
    upsertUser({ email: 'owner@kitchenflow.dev', fullName: 'Demo Owner', role: 'owner', restaurantId: restaurant.id, passwordHash }),
    upsertUser({ email: 'manager@kitchenflow.dev', fullName: 'Demo Manager', role: 'manager', restaurantId: restaurant.id, passwordHash }),
    upsertUser({ email: 'kitchen@kitchenflow.dev', fullName: 'Kitchen Lead', role: 'kitchen', restaurantId: restaurant.id, passwordHash }),
    upsertUser({ email: 'support@kitchenflow.dev', fullName: 'Support Analyst', role: 'support', restaurantId: restaurant.id, passwordHash })
  ]);

  const outlets = await Promise.all(
    [
      ['Indiranagar', 'Bengaluru'],
      ['BKC', 'Mumbai'],
      ['CyberHub', 'Gurugram'],
      ['Park Street', 'Kolkata'],
      ['Jubilee Hills', 'Hyderabad']
    ].map(([name, city]) =>
      prisma.outlet.create({
        data: { restaurantId: restaurant.id, name, city, timezone: 'Asia/Kolkata' }
      })
    )
  );

  const menuItems = await Promise.all(
    menuSeed.map((item, index) =>
      prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          name: item.name,
          category: item.category,
          priceAmount: item.priceAmount,
          currency: 'INR',
          available: index !== 5,
          variants: item.variants,
          outletScopes: {
            create: outlets.map((outlet) => ({ outletId: outlet.id }))
          }
        }
      })
    )
  );

  await prisma.integration.createMany({
    data: [
      { restaurantId: restaurant.id, provider: 'swiggy', status: 'connected', credentials: { account: 'demo-swiggy' }, webhookSecret: 'whsec_swiggy', lastSyncAt: daysAgo(0, 2) },
      { restaurantId: restaurant.id, provider: 'zomato', status: 'syncing', credentials: { account: 'demo-zomato' }, webhookSecret: 'whsec_zomato', lastSyncAt: daysAgo(0, 1) },
      { restaurantId: restaurant.id, provider: 'uber_eats', status: 'connected', credentials: { account: 'demo-uber' }, webhookSecret: 'whsec_uber', lastSyncAt: daysAgo(0, 3) },
      { restaurantId: restaurant.id, provider: 'deliveroo', status: 'degraded', credentials: { account: 'demo-deliveroo' }, webhookSecret: 'whsec_deliveroo', lastSyncAt: daysAgo(0, 5) }
    ]
  });

  await prisma.inventoryItem.createMany({
    data: outlets.flatMap((outlet, outletIndex) =>
      inventorySeed.map(([sku, name, unit, quantity, reorderAt], itemIndex) => ({
        outletId: outlet.id,
        sku,
        name,
        unit,
        quantity: Math.max(4, Number(quantity) - outletIndex * 2 + (itemIndex % 3) * 3),
        reorderAt: Number(reorderAt)
      }))
    )
  });

  const orderData = Array.from({ length: 140 }).map((_, index) => {
    const outlet = pick(outlets, index);
    const channel = pick(channels, index + 1);
    const status = index < 18 ? pick(statuses.slice(0, 4), index) : index % 17 === 0 ? 'cancelled' : 'delivered';
    const firstItem = pick(menuItems, index);
    const secondItem = pick(menuItems, index + 3);
    const quantity = (index % 3) + 1;
    const total = firstItem.priceAmount * quantity + (index % 2 ? secondItem.priceAmount : 0);
    const createdAt = daysAgo(index % 7, index % 12);
    return {
      publicId: `#${outlet.city.slice(0, 3).toUpperCase()}-${String(10480 + index).padStart(5, '0')}`,
      restaurantId: restaurant.id,
      outletId: outlet.id,
      channel,
      status,
      customerName: pick(customers, index),
      totalAmount: total,
      currency: 'INR',
      etaMinutes: 12 + (index % 24),
      createdAt,
      updatedAt: createdAt,
      payload: {
        items: [
          { id: `${firstItem.id}-line`, name: firstItem.name, quantity, price: firstItem.priceAmount, modifiers: index % 2 ? ['Extra sauce'] : [] },
          ...(index % 2 ? [{ id: `${secondItem.id}-line`, name: secondItem.name, quantity: 1, price: secondItem.priceAmount }] : [])
        ],
        deliveryPartnerRef: `${channel}-${Date.now()}-${index}`
      }
    };
  });
  await prisma.order.createMany({ data: orderData });

  await prisma.analyticsEvent.createMany({
    data: Array.from({ length: 80 }).map((_, index) => ({
      restaurantId: restaurant.id,
      type: pick(['order_created', 'order_status_changed', 'inventory_warning', 'integration_sync'], index),
      occurredAt: daysAgo(index % 7, index % 10),
      dimensions: { channel: pick(channels, index), outlet: pick(outlets, index).name },
      metrics: { value: 100 + index * 7, latencyMs: 120 + index * 3 }
    }))
  });

  console.log('Seeded demo restaurant with users, outlets, 140 orders, menu, inventory, integrations, and analytics events.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
