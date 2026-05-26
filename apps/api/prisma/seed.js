const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const channels = ['deliveroo', 'talabat', 'careem', 'noon_food', 'hungerstation', 'jahez', 'uber_eats'];
const statuses = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const customers = [
  'Hassan Karam',
  'Omar Haddad',
  'Layla Al Marri',
  'Fahad Al Qahtani',
  'Mariam Saleh',
  'Reem Al Suwaidi',
  'Khaled Al Shamsi',
  'Noura Al Mansoori',
  'Tariq Bin Zayed',
  'Sami Al Kuwari',
  'Jana Al Zaabi'
];
const menuSeed = [
  { name: 'Truffle Halloumi Bowl', category: 'Signature Bowls', priceAmount: 46, variants: ['Regular', 'Extra halloumi', 'Low carb'] },
  { name: 'Korean Rice Bowl', category: 'Signature Bowls', priceAmount: 76, variants: ['Regular', 'Vegan', 'Extra protein'] },
  { name: 'Nashville Chicken Stack', category: 'Burgers', priceAmount: 72, variants: ['Regular', 'Extra hot'] },
  { name: 'Smoked Chicken Mandi Bowl', category: 'Rice Bowls', priceAmount: 62, variants: ['Regular', 'Large'] },
  { name: 'Harissa Fries', category: 'Sides', priceAmount: 22, variants: ['Regular', 'Loaded'] },
  { name: 'Mint Labneh Cooler', category: 'Beverages', priceAmount: 26, variants: ['250ml', '500ml'] },
  { name: 'Cardamom Cold Brew', category: 'Beverages', priceAmount: 24, variants: ['Classic', 'Orange'] },
  { name: 'Date Chocolate Brownie', category: 'Desserts', priceAmount: 19, variants: ['Single', 'Box of 4'] }
];
const inventorySeed = [
  ['HLM-CUBE', 'Halloumi cubes', 'kg', 18, 15],
  ['RCE-BASE', 'Rice base', 'kg', 42, 28],
  ['CHK-FIL', 'Chicken fillet', 'kg', 24, 18],
  ['LBN-MNT', 'Mint labneh mix', 'litre', 9, 12],
  ['FRY-POT', 'Potato fries', 'kg', 36, 20],
  ['SAU-HAR', 'Harissa sauce', 'litre', 11, 8],
  ['RCE-MND', 'Mandi rice', 'kg', 55, 35],
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
    update: { name: 'KitchenFlow GCC Brands', plan: 'enterprise' },
    create: { name: 'KitchenFlow GCC Brands', slug: 'demo-restaurant', plan: 'enterprise' }
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
    upsertUser({ email: 'owner@kitchenflow.dev', fullName: 'Reem Al Suwaidi', role: 'owner', restaurantId: restaurant.id, passwordHash }),
    upsertUser({ email: 'manager@kitchenflow.dev', fullName: 'Omar Haddad', role: 'manager', restaurantId: restaurant.id, passwordHash }),
    upsertUser({ email: 'kitchen@kitchenflow.dev', fullName: 'Khaled Al Shamsi', role: 'kitchen', restaurantId: restaurant.id, passwordHash }),
    upsertUser({ email: 'support@kitchenflow.dev', fullName: 'Mariam Saleh', role: 'support', restaurantId: restaurant.id, passwordHash })
  ]);

  const outlets = await Promise.all(
    [
      ['Dubai Marina', 'Dubai'],
      ['JLT', 'Dubai'],
      ['Business Bay', 'Dubai'],
      ['Abu Dhabi Yas', 'Abu Dhabi'],
      ['Riyadh Olaya', 'Riyadh'],
      ['Jeddah Corniche', 'Jeddah'],
      ['Doha West Bay', 'Doha'],
      ['Manama Seef', 'Manama']
    ].map(([name, city]) =>
      prisma.outlet.create({
        data: { restaurantId: restaurant.id, name, city, timezone: 'Asia/Dubai' }
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
          currency: 'AED',
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
      { restaurantId: restaurant.id, provider: 'deliveroo', status: 'connected', credentials: { account: 'gcc-deliveroo' }, webhookSecret: 'whsec_deliveroo', lastSyncAt: daysAgo(0, 2) },
      { restaurantId: restaurant.id, provider: 'talabat', status: 'connected', credentials: { account: 'gcc-talabat' }, webhookSecret: 'whsec_talabat', lastSyncAt: daysAgo(0, 1) },
      { restaurantId: restaurant.id, provider: 'careem', status: 'syncing', credentials: { account: 'gcc-careem' }, webhookSecret: 'whsec_careem', lastSyncAt: daysAgo(0, 3) },
      { restaurantId: restaurant.id, provider: 'noon_food', status: 'connected', credentials: { account: 'gcc-noon-food' }, webhookSecret: 'whsec_noon', lastSyncAt: daysAgo(0, 4) },
      { restaurantId: restaurant.id, provider: 'business_central', status: 'degraded', credentials: { tenant: 'd365-bc-gcc' }, webhookSecret: 'whsec_bc', lastSyncAt: daysAgo(0, 5) }
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
      currency: 'AED',
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

  console.log('Seeded GCC enterprise operations workspace with users, outlets, 140 orders, menu, inventory, integrations, and analytics events.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
