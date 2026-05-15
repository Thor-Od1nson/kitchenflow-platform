const test = require('node:test');
const assert = require('node:assert/strict');

const protectedRoutes = [
  '/dashboard',
  '/dashboard/orders',
  '/dashboard/inventory',
  '/dashboard/analytics',
  '/dashboard/notifications',
  '/dashboard/audit'
];

test('dashboard smoke route list includes audit and operational surfaces', () => {
  assert.equal(protectedRoutes.includes('/dashboard/audit'), true);
  assert.equal(protectedRoutes.includes('/dashboard/orders'), true);
  assert.equal(protectedRoutes.includes('/dashboard/inventory'), true);
});
