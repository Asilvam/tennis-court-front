import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/AuthContext.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://backend.example.invalid' }) },
  plugins: [{
    name: 'membership-session-adapters',
    setup(builder) {
      builder.onResolve({ filter: /^(react|react\/jsx-runtime|axios)$|^\.\/auth-context$/ },
        args => ({ path: args.path, namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({
        contents: {
          react: `export default {};
            export const useState = initial => {
              const h = globalThis.__membershipSession, index = h.cursor++;
              if (!(index in h.states)) h.states[index] = typeof initial === 'function' ? initial() : initial;
              return [h.states[index], value => {
                h.states[index] = typeof value === 'function' ? value(h.states[index]) : value;
              }];
            };
            export const useEffect = effect => globalThis.__membershipSession.effects.push(effect);`,
          'react/jsx-runtime': `export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;`,
          './auth-context': `export const AuthContext = { Provider: 'Provider' };`,
          axios: `export default {
            get: async (url, options) => {
              const h = globalThis.__membershipSession;
              h.requests.push({ url, options });
              if (h.error) throw h.error;
              return { data: h.access };
            },
            interceptors: { response: {
              use: (_success, failure) => { globalThis.__membershipSession.reject = failure; return 42; },
              eject: id => globalThis.__membershipSession.ejected.push(id)
            } }
          };`,
        }[args.path],
        loader: 'js',
      }));
    },
  }],
});
const { AuthProvider } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`,
);
let harness, storage;
const flush = () => new Promise(setImmediate);
const mount = () => {
  AuthProvider({ children: 'fixture' });
  for (const effect of harness.effects) {
    const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup);
  }
};
beforeEach(() => {
  harness = { states: [], cursor: 0, effects: [], cleanups: [], requests: [], ejected: [], intervals: [], cleared: [],
    access: { name: 'Server member', role: 'user', financiallyRestricted: false } };
  globalThis.__membershipSession = harness;
  storage = new Map([['token', 'signed-fixture'], ['userInfo', JSON.stringify({ name: 'Cached member', email: 'member@example.invalid', role: 'admin', financiallyRestricted: false })]]);
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  globalThis.window = new EventTarget();
  window.setInterval = (callback, delay) => { harness.intervals.push({ callback, delay }); return 1; };
  window.clearInterval = id => harness.cleared.push(id);
});
afterEach(() => {
  harness.cleanups.forEach(cleanup => cleanup());
  delete globalThis.__membershipSession; delete globalThis.window; delete globalThis.localStorage;
});
test('an authenticated session queries backend permissions without any membership env flag', async () => {
  harness.access.financiallyRestricted = true; mount(); await flush();
  assert.equal(harness.requests[0].url, 'https://backend.example.invalid/membership-billing/me/access');
  assert.equal(harness.requests[0].options.headers.Authorization, 'Bearer signed-fixture');
  assert.equal(harness.states[1].role, 'user');
  assert.equal(harness.states[1].financiallyRestricted, true);
});
test('the backend can restore ordinary access on the next refresh', async () => {
  harness.access.financiallyRestricted = true; mount(); await flush();
  harness.access = { ...harness.access, financiallyRestricted: false };
  window.dispatchEvent(new Event('focus')); await flush();
  assert.equal(harness.states[1].financiallyRestricted, false);
  assert.equal(harness.requests.length, 2);
});
test('backend PAYMENTS_ONLY denial updates the session without revoking login identity', async () => {
  mount(); await flush();
  const error = { response: { data: { code: 'PAYMENTS_ONLY' } } };
  await assert.rejects(() => harness.reject(error));
  assert.equal(harness.states[1].financiallyRestricted, true);
  assert.equal(harness.states[0], 'signed-fixture');
});
test('a network outage does not erase the session or claim new permissions', async () => {
  harness.error = new Error('unavailable'); mount(); await flush();
  assert.equal(harness.states[0], 'signed-fixture');
  assert.equal(harness.states[1].name, 'Cached member');
});
test('anonymous visitors do not query private membership permissions', async () => {
  storage.delete('token'); mount(); await flush();
  assert.equal(harness.requests.length, 0);
  assert.equal(harness.intervals.length, 0);
});
test('unmount removes permission refresh timers and the response interceptor', async () => {
  mount(); await flush(); harness.cleanups.forEach(cleanup => cleanup()); harness.cleanups = [];
  assert.deepEqual(harness.cleared, [1]); assert.deepEqual(harness.ejected, [42]);
  window.dispatchEvent(new Event('focus')); await flush(); assert.equal(harness.requests.length, 1);
});
