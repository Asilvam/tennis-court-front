import assert from 'node:assert/strict';
import test from 'node:test';
import { DateTime } from 'luxon';
import { directoryParams, memberDirectoryDefaults, reserveRequestParams } from '../src/utils/adminDirectory.ts';

test('directory starts on page one with 25 records and does not inherit unrelated URL fields', () => {
  assert.deepEqual(directoryParams(new URLSearchParams('unrelated=secret'), memberDirectoryDefaults), {
    search: '', page: '1', pageSize: '25', state: '', memberType: '', access: '',
  });
});
test('directory restores combined filters and page from the return URL', () => {
  assert.deepEqual(directoryParams(new URLSearchParams('search=Jose&page=3&pageSize=50&state=active&memberType=Carga&access=blocked'), memberDirectoryDefaults), {
    search: 'Jose', page: '3', pageSize: '50', state: 'active', memberType: 'Carga', access: 'blocked',
  });
});
test('today and tomorrow use Chilean calendar dates, not UTC calendar dates', () => {
  const now = DateTime.fromISO('2026-11-06T01:00:00Z').setZone('America/Santiago');
  assert.deepEqual(reserveRequestParams({ date: 'today', from: '', to: '', page: '1' }, now), { page: '1', from: '2026-11-05', to: '2026-11-05' });
  assert.deepEqual(reserveRequestParams({ date: 'tomorrow', from: '', to: '', page: '1' }, now), { page: '1', from: '2026-11-06', to: '2026-11-06' });
});
test('upcoming ignores stale custom dates and range preserves the requested bounds', () => {
  assert.deepEqual(reserveRequestParams({ date: 'upcoming', from: '2026-01-01', to: '2026-01-02', court: 'Cancha 2' }), { court: 'Cancha 2' });
  assert.deepEqual(reserveRequestParams({ date: 'range', from: '2026-11-05', to: '2026-11-10', court: '' }), { from: '2026-11-05', to: '2026-11-10', court: '' });
});
