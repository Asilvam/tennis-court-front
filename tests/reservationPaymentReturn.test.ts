import test from 'node:test';
import assert from 'node:assert/strict';
import { reservationReturnPath, reservationReturnReference, reservationReturnStatus } from '../src/utils/reservationPaymentReturn.ts';
import { paymentLoginReturn } from '../src/utils/memberPayments.ts';

test('new and historical provider returns use only a validated reservation reference', () => {
    for (const query of ['reservation=abc123', 'external_reference=abc123', 'reservation=abc123&external_reference=abc123&status=rejected'])
        assert.equal(reservationReturnReference(new URLSearchParams(query)), 'abc123');
    for (const query of ['status=approved&payment_id=123', 'reservation=../admin', 'reservation=null', 'reservation=undefined', 'reservation=abc&external_reference=def', 'reservation=abc&reservation=def', 'external_reference=a&external_reference=b'])
        assert.equal(reservationReturnReference(new URLSearchParams(query)), null);
});
test('success/failure/pending restore identity after login, not browser payment claims', () => {
    for (const route of ['success', 'failure', 'pending']) {
        assert.equal(paymentLoginReturn(`/payment/${route}?external_reference=abc123&status=approved&payment_id=123&next=https://attacker.invalid`), `/payment/${route}?reservation=abc123`);
        assert.equal(reservationReturnPath(`/payment/${route}`), true);
    }
    for (const url of ['//evil.invalid', '/payment/success?status=approved', '/payment/success/extra?reservation=abc', '/payment/../admin?reservation=abc'])
        assert.equal(paymentLoginReturn(url), '/');
});
test('only a response for the requested reservation and known authoritative states is accepted', () => {
    for (const status of ['CONFIRMED', 'REVIEW', 'WAITING'])
        assert.equal(reservationReturnStatus({ reservationId: 'abc', status }, 'abc'), status);
    for (const data of [null, {}, { reservationId: 'other', status: 'CONFIRMED' }, { reservationId: 'abc', status: 'approved' }])
        assert.throws(() => reservationReturnStatus(data, 'abc'));
});
