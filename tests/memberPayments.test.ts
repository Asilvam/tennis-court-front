import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberCheckoutIdentity, membershipReference, paymentLoginReturn, safeMembershipCheckoutUrl, selectableMemberDues } from '../src/utils/memberPayments.ts';

test('checkout accepts only the provider HTTPS host, never arbitrary browser URLs', () => {
  for (const url of ['https://www.mercadopago.cl/checkout/v1/redirect?pref_id=fixture', 'https://sandbox.mercadopago.cl/checkout/fixture']) assert.ok(safeMembershipCheckoutUrl(url));
  for (const url of ['javascript:alert(1)', 'http://www.mercadopago.cl/', 'https://mercadopago.cl.attacker.invalid/', 'https://user:password@www.mercadopago.cl/', '//www.mercadopago.cl/', '', undefined]) assert.equal(safeMembershipCheckoutUrl(url), null);
});
test('an identical selection retains idempotency across order changes and retry', () => {
  const first = memberCheckoutIdentity(['b', 'a'], undefined, () => 'one');
  assert.deepEqual(memberCheckoutIdentity(['a', 'b'], first, () => 'two'), first);
  assert.equal(memberCheckoutIdentity(['a'], first, () => 'two').key, 'two');
});
test('return URLs restore only the monthly reference, not claims of paid status or open redirects', () => {
  const reference = 'membership-11111111-1111-4111-8111-111111111111';
  assert.ok(membershipReference(reference));
  assert.equal(membershipReference('approved'), false);
  assert.equal(paymentLoginReturn(`/monthlypayments?reference=${reference}`), `/monthlypayments?reference=${reference}`);
  assert.equal(paymentLoginReturn(`/monthlypayments?reference=${reference}&status=approved&payment_id=123`), `/monthlypayments?reference=${reference}`);
  for (const value of ['https://attacker.invalid/', '//attacker.invalid', '/adminregister', '/monthlypayments?status=approved', null]) assert.equal(paymentLoginReturn(value), '/');
});
test('only active enrolled beneficiaries, open dues and the selected horizon are eligible', () => {
  const rows = [{ id: '1', beneficiaryId: 'own', period: '2026-10', status: 'OPEN' }, { id: '2', beneficiaryId: 'own', period: '2026-11', status: 'OPEN' }, { id: '3', beneficiaryId: 'own', period: '2026-10', status: 'PAID' }, { id: '4', beneficiaryId: 'other', period: '2026-10', status: 'OPEN' }];
  assert.deepEqual(selectableMemberDues(rows as never, ['own'], '2026-10').map(row => row.id), ['1']);
});
