import assert from 'node:assert/strict';
import { test } from 'node:test';
import { billingPeriodRange, shiftBillingPeriod } from '../src/utils/membershipPeriods.ts';

test('October through January is four inclusive periods, independent of timezone', () => {
  assert.deepEqual(billingPeriodRange('2026-10', shiftBillingPeriod('2026-10', 3)), ['2026-10', '2026-11', '2026-12', '2027-01']);
});
test('single month, inverted range and malformed months are handled explicitly', () => {
  assert.deepEqual(billingPeriodRange('2026-10', '2026-10'), ['2026-10']);
  assert.deepEqual(billingPeriodRange('2026-11', '2026-10'), []);
  for (const period of ['2026-13', '2026-00', '26-10', 'invalid']) assert.throws(() => shiftBillingPeriod(period, 1));
  assert.throws(() => billingPeriodRange('2026-10', '9999-12'));
});
