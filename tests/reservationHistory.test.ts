import assert from 'node:assert/strict';
import { test } from 'node:test';
import { historyPagination } from '../src/utils/reservationHistory.ts';

test('history defaults to 25 and restores its own page and supported size', () => {
  assert.deepEqual(historyPagination(new URLSearchParams()), { page: 1, pageSize: 25 });
  assert.deepEqual(historyPagination(new URLSearchParams('page=3&pageSize=50')), { page: 3, pageSize: 50 });
});

test('history rejects invalid URL pagination and ignores unrelated fields', () => {
  for (const page of ['0', '-1', '1.5', 'bad', '100001']) {
    assert.deepEqual(historyPagination(new URLSearchParams({ page, pageSize: '500', email: 'other' })), { page: 1, pageSize: 25 });
  }
});
