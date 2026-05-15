const test = require('node:test');
const assert = require('node:assert/strict');

const permissions = {
  ordersRead: ['owner', 'manager', 'kitchen', 'support'],
  ordersWrite: ['owner', 'manager', 'kitchen'],
  inventoryRead: ['owner', 'manager', 'support'],
  inventoryWrite: ['owner', 'manager'],
  settings: ['owner']
};

test('support remains read-only for operational data', () => {
  assert.equal(permissions.ordersRead.includes('support'), true);
  assert.equal(permissions.inventoryRead.includes('support'), true);
  assert.equal(permissions.ordersWrite.includes('support'), false);
  assert.equal(permissions.inventoryWrite.includes('support'), false);
});

test('kitchen can operate orders but not settings or inventory', () => {
  assert.equal(permissions.ordersWrite.includes('kitchen'), true);
  assert.equal(permissions.inventoryRead.includes('kitchen'), false);
  assert.equal(permissions.settings.includes('kitchen'), false);
});
