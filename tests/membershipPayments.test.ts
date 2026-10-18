import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advancePeriods,
  bankPaymentPayload,
  bankRequestIdentity,
  billingToday,
  paymentMethodLabel,
  selectedDuesTotal,
  toggleDueSelection,
  type BankDraft,
  type BillingContext,
} from '../src/utils/membershipPayments.ts';

const now = new Date('2026-10-17T15:00:00Z');
const context: BillingContext = {
  memberId: 'titular',
  members: [
    {
      id: 'titular',
      name: 'usuario test 1',
      email: 'test1@example.invalid',
      memberType: 'Titular',
      active: true,
      enrolled: true,
    },
    {
      id: 'carga',
      name: 'usuario test 2',
      email: 'test2@example.invalid',
      memberType: 'Carga',
      active: true,
      enrolled: true,
    },
  ],
  dues: [
    {
      id: 't-oct',
      beneficiaryId: 'titular',
      period: '2026-10',
      amount: 180,
      status: 'OPEN',
      pricingMode: 'TEST',
      dueAt: '2026-11-06T03:00:00Z',
    },
    {
      id: 't-nov',
      beneficiaryId: 'titular',
      period: '2026-11',
      amount: 180,
      status: 'OPEN',
      pricingMode: 'TEST',
      dueAt: '2026-12-06T03:00:00Z',
    },
    {
      id: 'c-oct',
      beneficiaryId: 'carga',
      period: '2026-10',
      amount: 50,
      status: 'OPEN',
      pricingMode: 'TEST',
      dueAt: '2026-11-06T03:00:00Z',
    },
  ],
};
const draft: BankDraft = {
  method: 'BANK_TRANSFER',
  payerId: 'titular',
  payerName: '',
  reference: '  BANK-123  ',
  receivedDate: '2026-10-16',
  amount: '230',
  notes: '  Verificado  ',
  verified: true,
};

test('uses Chile calendar and current plus three months across the new year', () => {
  assert.equal(billingToday(new Date('2026-11-01T02:00:00Z')), '2026-10-31');
  assert.deepEqual(advancePeriods(now), ['2026-10', '2026-11', '2026-12', '2027-01']);
});
test('selecting a later due includes earlier unpaid months for that beneficiary only', () => {
  assert.deepEqual(toggleDueSelection(context.dues, [], 't-nov'), ['t-oct', 't-nov']);
  assert.deepEqual(toggleDueSelection(context.dues, ['c-oct'], 't-nov'), [
    'c-oct',
    't-oct',
    't-nov',
  ]);
});
test('removing an older month removes later selected months without removing a carga', () => {
  assert.deepEqual(toggleDueSelection(context.dues, ['t-oct', 't-nov', 'c-oct'], 't-oct'), [
    'c-oct',
  ]);
});
test('settled and unknown dues cannot be selected', () => {
  assert.deepEqual(toggleDueSelection(context.dues, [], 'unknown'), []);
  assert.deepEqual(
    toggleDueSelection(
      context.dues.map((row) => ({ ...row, status: 'PAID' as const })),
      [],
      't-oct',
    ),
    [],
  );
});
test('builds a full bank payment with beneficiary IDs and verified payer identity', () => {
  assert.deepEqual(bankPaymentPayload(context, ['t-oct', 'c-oct'], draft, now), {
    dueIds: ['c-oct', 't-oct'],
    method: 'BANK_TRANSFER',
    payerName: 'usuario test 1',
    payerMemberId: 'titular',
    receivedDate: '2026-10-16',
    reference: 'BANK-123',
    amount: 230,
    notes: 'Verificado',
    verified: true,
  });
});
test('automatically totals full dues of the selected titular and carga only', () => {
  assert.equal(selectedDuesTotal(context.dues, ['t-oct', 'c-oct']), 230);
  assert.equal(selectedDuesTotal(context.dues, ['t-oct']), 180);
  assert.equal(selectedDuesTotal(context.dues, ['c-oct']), 50);
});
test('the automatic amount resets to zero when selection is cleared', () => {
  assert.equal(selectedDuesTotal(context.dues, []), 0);
});
test('the automatic amount follows consecutive-month selection and removal', () => {
  const selected = toggleDueSelection(context.dues, ['c-oct'], 't-nov');
  assert.equal(selectedDuesTotal(context.dues, selected), 410);
  assert.equal(selectedDuesTotal(context.dues, toggleDueSelection(context.dues, selected, 't-oct')), 50);
});
test('repeated IDs cannot double the displayed selected amount', () => {
  assert.equal(selectedDuesTotal(context.dues, ['t-oct', 't-oct']), 180);
  assert.throws(() => bankPaymentPayload(context, ['t-oct', 't-oct'], { ...draft, amount: '180' }, now), /duplicados/);
});
for (const amount of ['229', '231', '0', '-230', '230.5', '230e0', '', 'invalid'])
  test(`rejects incomplete, excess or invalid amount ${amount}`, () => {
    assert.throws(
      () => bankPaymentPayload(context, ['t-oct', 'c-oct'], { ...draft, amount }, now),
      /monto recibido/,
    );
  });
test('rejects unverified income, missing bank reference and invalid payer', () => {
  assert.throws(
    () => bankPaymentPayload(context, ['t-oct', 'c-oct'], { ...draft, verified: false }, now),
    /Verifica|verificaste/,
  );
  assert.throws(
    () => bankPaymentPayload(context, ['t-oct', 'c-oct'], { ...draft, reference: ' ' }, now),
    /referencia bancaria/,
  );
  assert.throws(
    () => bankPaymentPayload(context, ['t-oct', 'c-oct'], { ...draft, payerId: 'missing' }, now),
    /persona/,
  );
});
test('external payer does not invent a member ID and deposit has a different method', () => {
  const payload = bankPaymentPayload(
    context,
    ['t-oct', 'c-oct'],
    { ...draft, method: 'BANK_DEPOSIT', payerId: '', payerName: 'Persona externa' },
    now,
  );
  assert.equal(payload.method, 'BANK_DEPOSIT');
  assert.equal(payload.payerName, 'Persona externa');
  assert.equal('payerMemberId' in payload, false);
});
test('rejects future and nonexistent dates', () => {
  for (const receivedDate of ['2026-10-18', '2026-02-30', '16/10/2026', ''])
    assert.throws(
      () => bankPaymentPayload(context, ['t-oct', 'c-oct'], { ...draft, receivedDate }, now),
      /fecha/,
    );
});
test('does not skip unpaid months or exceed current plus three months', () => {
  assert.throws(
    () => bankPaymentPayload(context, ['t-nov'], { ...draft, amount: '180' }, now),
    /meses consecutivos/,
  );
  const future = {
    ...context,
    dues: [...context.dues, { ...context.dues[0], id: 't-feb', period: '2027-02' }],
  };
  assert.throws(
    () => bankPaymentPayload(future, ['t-oct', 't-nov', 't-feb'], { ...draft, amount: '540' }, now),
    /meses consecutivos/,
  );
});
test('rejects duplicate, missing, settled and mixed-pricing quotas', () => {
  assert.throws(() => bankPaymentPayload(context, ['t-oct', 't-oct'], draft, now), /duplicados/);
  assert.throws(() => bankPaymentPayload(context, ['missing'], draft, now), /disponible/);
  assert.throws(
    () =>
      bankPaymentPayload(
        { ...context, dues: context.dues.map((row) => ({ ...row, status: 'PAID' })) },
        ['t-oct'],
        draft,
        now,
      ),
    /disponible/,
  );
  assert.throws(
    () =>
      bankPaymentPayload(
        {
          ...context,
          dues: context.dues.map((row) => ({
            ...row,
            pricingMode: row.beneficiaryId === 'carga' ? 'STANDARD' : 'TEST',
          })),
        },
        ['t-oct', 'c-oct'],
        draft,
        now,
      ),
    /mezcles/,
  );
});
test('does not register an inactive or unenrolled member implicitly', () => {
  assert.throws(
    () =>
      bankPaymentPayload(
        { ...context, members: context.members.map((person) => ({ ...person, active: false })) },
        ['t-oct', 'c-oct'],
        draft,
        now,
      ),
    /revisión administrativa/,
  );
  assert.throws(
    () =>
      bankPaymentPayload(
        { ...context, members: context.members.map((person) => ({ ...person, enrolled: false })) },
        ['t-oct', 'c-oct'],
        draft,
        now,
      ),
    /revisión administrativa/,
  );
});
test('reuses the request key after an uncertain response; changes require a new identity', () => {
  const payload = bankPaymentPayload(context, ['t-oct', 'c-oct'], draft, now);
  const request = bankRequestIdentity(payload, undefined, () => 'request-one');
  assert.equal(bankRequestIdentity(payload, request, () => 'unused').key, 'request-one');
  assert.equal(
    bankRequestIdentity({ ...payload, reference: 'BANK-OTHER' }, request, () => 'request-two').key,
    'request-two',
  );
});
test('history labels distinguish banking from Mercado Pago', () => {
  assert.equal(paymentMethodLabel('BANK_TRANSFER'), 'Transferencia bancaria');
  assert.equal(paymentMethodLabel('BANK_DEPOSIT'), 'Depósito bancario');
  assert.equal(paymentMethodLabel('MERCADO_PAGO'), 'Mercado Pago');
});
