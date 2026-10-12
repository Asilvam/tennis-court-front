import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getReservationPaymentAmount } from '../src/utils/paymentRates.ts';

const rates = { currency: 'CLP', nightAmount: 5000, visitAmount: 8000, nightVisitAmount: 12000 };

test('night payment uses the backend rate, not a hardcoded amount', () => {
    assert.equal(getReservationPaymentAmount(rates, true, false), 5000);
});

test('visitor payment uses the backend rate', () => {
    assert.equal(getReservationPaymentAmount(rates, false, true), 8000);
});

test('combined payment uses the independently configured backend rate, not the sum', () => {
    assert.equal(getReservationPaymentAmount(rates, true, true), 12000);
});

test('a free reservation does not require rates', () => {
    assert.equal(getReservationPaymentAmount(null, false, false), 0);
});

for (const value of [null, undefined, {}, [], 'invalid', { ...rates, currency: 'USD' }]) {
    test(`rejects a missing or malformed rates response: ${JSON.stringify(value)}`, () => {
        assert.throws(() => getReservationPaymentAmount(value, true, false));
    });
}

for (const field of ['nightAmount', 'visitAmount', 'nightVisitAmount']) {
    for (const amount of [0, -1, 1.5, '5000', undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        test(`rejects an invalid backend rate ${field}=${String(amount)}`, () => {
            assert.throws(() => getReservationPaymentAmount({ ...rates, [field]: amount }, true, true));
        });
    }
}
