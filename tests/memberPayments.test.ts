import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyMembershipReturn, memberCheckoutIdentity, membershipReference, membershipSessionPath, paymentLoginReturn, safeMembershipCheckoutUrl, selectableMemberDues } from '../src/utils/memberPayments.ts';

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
  assert.equal(paymentLoginReturn(`/monthlypayments?reference=${reference}&status=approved&payment_id=123`), `/monthlypayments/return?reference=${reference}`);
  for (const value of ['https://attacker.invalid/', '//attacker.invalid', '/adminregister', '/monthlypayments?status=approved', null]) assert.equal(paymentLoginReturn(value), '/');
});
test('old checkout return links migrate to the dedicated result without trusting browser status', () => {
  const reference = 'membership-11111111-1111-4111-8111-111111111111';
  for (const query of ['payment_id=null&status=null', 'payment_id=123&status=approved', 'status=rejected'])
    assert.equal(legacyMembershipReturn(new URLSearchParams(`reference=${reference}&${query}`)), `/monthlypayments/return?reference=${reference}`);
  assert.equal(legacyMembershipReturn(new URLSearchParams(`reference=${reference}`)), null);
  assert.equal(legacyMembershipReturn(new URLSearchParams('reference=bad&payment_id=null')), null);
});
test('login preserves the result reference but strips all browser payment claims and redirect targets', () => {
  const reference = 'membership-11111111-1111-4111-8111-111111111111';
  assert.equal(paymentLoginReturn(`/monthlypayments/return?reference=${reference}&status=approved&next=https://attacker.invalid`), `/monthlypayments/return?reference=${reference}`);
  for (const path of ['/monthlypayments/return', '/monthlypayments/return?reference=bad', '/monthlypayments/return/extra?reference=' + reference])
    assert.equal(paymentLoginReturn(path), '/');
});
test('payment-only sessions can enter only the portal and dedicated return path', () => {
  assert.equal(membershipSessionPath('/monthlypayments'), true);
  assert.equal(membershipSessionPath('/monthlypayments/return'), true);
  for (const path of ['/adminpayments', '/dashboard', '/monthlypayments/other', '/monthlypayments/return/extra'])
    assert.equal(membershipSessionPath(path), false);
});
test('only active enrolled beneficiaries, open dues and periods through the current month are eligible', () => {
  const rows = [{ id: '1', beneficiaryId: 'own', period: '2026-10', status: 'OPEN' }, { id: '2', beneficiaryId: 'own', period: '2026-11', status: 'OPEN' }, { id: '3', beneficiaryId: 'own', period: '2026-10', status: 'PAID' }, { id: '4', beneficiaryId: 'other', period: '2026-10', status: 'OPEN' }];
  assert.deepEqual(selectableMemberDues(rows as never, ['own'], '2026-10').map(row => row.id), ['1']);
});
test('the member portal excludes archived history and void dues from checkout', () => {
  const rows = [
    { id: 'old', beneficiaryId: 'own', period: '2026-08', status: 'ARCHIVED' },
    { id: 'gap', beneficiaryId: 'own', period: '2026-09', status: 'VOID' },
    { id: 'current', beneficiaryId: 'own', period: '2026-10', status: 'OPEN' },
  ];
  assert.deepEqual(selectableMemberDues(rows as never, ['own'], '2026-10').map(row => row.id), ['current']);
});
test('members can select arrears and current dues for themselves and cargas, never future dues', () => {
  const rows = [
    { id: 'arrears', beneficiaryId: 'own', period: '2026-09', status: 'OPEN' },
    { id: 'current', beneficiaryId: 'own', period: '2026-10', status: 'OPEN' },
    { id: 'future', beneficiaryId: 'own', period: '2026-11', status: 'OPEN' },
    { id: 'carga-current', beneficiaryId: 'carga', period: '2026-10', status: 'OPEN' },
    { id: 'carga-future', beneficiaryId: 'carga', period: '2027-01', status: 'OPEN' },
    { id: 'paid', beneficiaryId: 'own', period: '2026-08', status: 'PAID' },
  ];
  assert.deepEqual(selectableMemberDues(rows as never, ['own', 'carga'], '2026-10').map(row => row.id), ['arrears', 'current', 'carga-current']);
  assert.deepEqual(selectableMemberDues(rows as never, ['own'], '2026-11').map(row => row.id), ['arrears', 'current', 'future']);
});
