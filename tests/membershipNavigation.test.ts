import assert from 'node:assert/strict';
import test from 'node:test';
import { memberPaymentsRoute, membershipUsersReturn } from '../src/utils/membershipNavigation.ts';

test('member payment links use the immutable ID, never a name or email', () => {
  assert.equal(
    memberPaymentsRoute('68ca0d7dbe61eb1818ed0256'),
    '/adminpayments?memberId=68ca0d7dbe61eb1818ed0256',
  );
  for (const value of ['', 'usuario test 1', 'test@example.invalid', '../adminregister'])
    assert.throws(() => memberPaymentsRoute(value));
});
test('return to users preserves the exact search URL and scroll position', () => {
  assert.deepEqual(
    membershipUsersReturn({
      returnTo: '/adminregister?search=usuario%20test&page=2',
      returnScrollY: 480,
    }),
    {
      returnTo: '/adminregister?search=usuario%20test&page=2',
      state: { adminUsersScrollY: 480 },
    },
  );
});
test('unsafe or unrelated return destinations cannot redirect outside users', () => {
  for (const value of [
    'https://example.invalid',
    '//example.invalid',
    '/adminregister/other',
    '/adminregister#x',
    '/adminpayments',
  ])
    assert.equal(membershipUsersReturn({ returnTo: value }).returnTo, '/adminregister');
});
test('direct entry and invalid scroll values have safe defaults', () => {
  for (const value of [
    undefined,
    null,
    '',
    { returnScrollY: NaN },
    { returnScrollY: Infinity },
    { returnScrollY: '20' },
  ])
    assert.deepEqual(membershipUsersReturn(value), {
      returnTo: '/adminregister',
      state: { adminUsersScrollY: 0 },
    });
  assert.equal(membershipUsersReturn({ returnScrollY: -20 }).state.adminUsersScrollY, 0);
});
