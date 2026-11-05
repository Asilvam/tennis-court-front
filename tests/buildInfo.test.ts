import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBuildInfo } from '../scripts/buildInfo.ts';

test('build uses the platform source revision without requiring Git', () => {
  const info = resolveBuildInfo('0.0.3', ` ABCDEF1${'0'.repeat(33)} `, () => {
    throw new Error('Git must not be required');
  });
  assert.deepEqual(info, { version: '0.0.3', revision: 'abcdef1' });
});

test('local build reads the current Git revision', () => {
  assert.deepEqual(resolveBuildInfo('1.2.3', undefined, () => '59754d7\n'), {
    version: '1.2.3', revision: '59754d7',
  });
});

test('invalid platform data falls back to Git instead of exposing arbitrary values', () => {
  assert.deepEqual(resolveBuildInfo('1.2.3', '<invalid source data>', () => '1234567'), {
    version: '1.2.3', revision: '1234567',
  });
});

test('build without Git or source metadata remains explicit about missing revision', () => {
  assert.deepEqual(resolveBuildInfo('1.2.3', undefined, () => { throw new Error('No Git'); }), {
    version: '1.2.3', revision: null,
  });
});

test('malformed Git output is not presented as a compilation identifier', () => {
  for (const value of ['', 'main', 'abc', 'a'.repeat(41), '1234567/path']) {
    assert.deepEqual(resolveBuildInfo('1.2.3', undefined, () => value), { version: '1.2.3', revision: null });
  }
});
