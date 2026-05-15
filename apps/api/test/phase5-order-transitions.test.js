const test = require('node:test');
const assert = require('node:assert/strict');

const allowedTransitions = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['dispatched'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: []
};

test('terminal order states cannot transition again', () => {
  assert.deepEqual(allowedTransitions.delivered, []);
  assert.deepEqual(allowedTransitions.cancelled, []);
});

test('order lifecycle preserves kitchen workflow order', () => {
  assert.equal(allowedTransitions.pending.includes('accepted'), true);
  assert.equal(allowedTransitions.accepted.includes('preparing'), true);
  assert.equal(allowedTransitions.preparing.includes('delivered'), false);
});
