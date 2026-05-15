const test = require('node:test');
const assert = require('node:assert/strict');

function canApplyDelta(quantity, delta) {
  return quantity + delta >= 0;
}

test('inventory deduction cannot make stock negative', () => {
  assert.equal(canApplyDelta(3, -2), true);
  assert.equal(canApplyDelta(3, -4), false);
});
