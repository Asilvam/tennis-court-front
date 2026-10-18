import assert from 'node:assert/strict';
import test from 'node:test';
import { membershipReturnView, readMembershipReturn } from '../src/utils/membershipReturn.ts';

const reference = 'membership-11111111-1111-4111-8111-111111111111';
const state = (status = 'PENDING', providerPaymentId: string | null = null) => ({
  reference, status, providerPaymentId, amount: 50, initPoint: null, checkoutStatus: 'UNKNOWN', allocations: [],
});

test('return without a provider payment shows incomplete, never a confirmed cancellation', () => {
  const view = membershipReturnView(state());
  assert.equal(view.title, 'Pago no completado');
  assert.match(view.description, /sin un pago confirmado/);
  assert.notEqual(view.tone, 'success');
});
test('an actual pending provider payment is distinct from leaving checkout', () => {
  assert.equal(membershipReturnView(state('PENDING', '123')).title, 'Pago pendiente');
});
test('only confirmed backend status can display paid and only cancelled backend status displays cancelled', () => {
  assert.equal(membershipReturnView(state('CONFIRMED', '123')).title, 'Mensualidad pagada');
  assert.equal(membershipReturnView(state('CANCELLED')).title, 'Pago cancelado');
  assert.equal(membershipReturnView(state('REJECTED', '123')).title, 'Pago rechazado');
  assert.equal(membershipReturnView(state('REVIEW_REQUIRED', '123')).title, 'Pago en revisión');
  assert.equal(membershipReturnView(state('REVERSED', '123')).title, 'Pago revertido');
});
test('a completed payment does not trigger reconciliation or create another checkout', async () => {
  let reconciliations = 0;
  const result = await readMembershipReturn(reference, {
    state: async () => state('CONFIRMED', '123'),
    reconcile: async () => { reconciliations++; return state(); },
  }, true);
  assert.equal(result.status, 'CONFIRMED');
  assert.equal(reconciliations, 0);
});
test('the initial return reconciles the existing attempt and accepts only the server result', async () => {
  let reconciliations = 0;
  const result = await readMembershipReturn(reference, {
    state: async () => state(),
    reconcile: async () => { reconciliations++; return state('CONFIRMED', '123'); },
  }, true);
  assert.equal(result.status, 'CONFIRMED');
  assert.equal(reconciliations, 1);
});
test('background reads do not repeatedly reconcile the provider', async () => {
  let reconciliations = 0;
  await readMembershipReturn(reference, {
    state: async () => state(),
    reconcile: async () => { reconciliations++; return state(); },
  }, false);
  assert.equal(reconciliations, 0);
});
test('wrong references, invalid amounts and malformed status never claim a payment result', async () => {
  for (const invalid of [{ ...state(), reference: 'other' }, { ...state(), amount: -50 }, { ...state(), status: 'approved' }])
    await assert.rejects(readMembershipReturn(reference, {
      state: async () => invalid, reconcile: async () => state(),
    }, true), /verificar/);
  await assert.rejects(readMembershipReturn(reference, {
    state: async () => state(), reconcile: async () => ({ ...state(), reference: 'other' }),
  }, true), /verificar/);
});
test('a provider outage propagates as unverifiable, never as cancelled', async () => {
  await assert.rejects(readMembershipReturn(reference, {
    state: async () => state(), reconcile: async () => { throw new Error('unavailable'); },
  }, true), /unavailable/);
});
