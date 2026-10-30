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
            export const useRef = value => ({ current: value });
            export const useCallback = callback => callback;
            export const useEffect = effect => globalThis.__membershipSession.effects.push(effect);`,
          'react/jsx-runtime': `export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;`,
          './auth-context': `export const AuthContext = { Provider: 'Provider' };`,
          axios: `export default {
            get: async (url, options) => {
              const h = globalThis.__membershipSession;
              h.requests.push({ url, options });
              if (h.error) return h.reject(h.error);
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
const policyBuild = await build({
  entryPoints: [fileURLToPath(new URL('../src/utils/authSession.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { currentSessionUnauthorized } = await import(`data:text/javascript;base64,${Buffer.from(policyBuild.outputFiles[0].text).toString('base64')}`);
let harness, storage;
const flush = () => new Promise(setImmediate);
const signedToken = (exp = Math.floor(Date.now() / 1000) + 3600) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.fixture`;
let token;
const unauthorized = (overrides = {}) => ({ response: { status: 401 }, config: { url: 'https://backend.example.invalid/membership-billing/me/access', headers: { Authorization: `Bearer ${token}` }, ...overrides } });
const mount = () => {
  harness.view = AuthProvider({ children: 'fixture' });
  for (const effect of harness.effects) {
    const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup);
  }
};
beforeEach(() => {
  harness = { states: [], cursor: 0, effects: [], cleanups: [], requests: [], ejected: [], intervals: [], cleared: [], timers: [],
    access: { name: 'Server member', role: 'user', financiallyRestricted: false } };
  globalThis.__membershipSession = harness;
  token = signedToken();
  storage = new Map([['token', token], ['userInfo', JSON.stringify({ name: 'Cached member', email: 'member@example.invalid', role: 'admin', financiallyRestricted: false })]]);
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  globalThis.window = new EventTarget();
  window.location = { origin: 'https://front.example.invalid' };
  globalThis.document = new EventTarget();
  document.visibilityState = 'visible';
  window.setTimeout = (callback, delay) => { harness.timers.push({ callback, delay }); return harness.timers.length; };
  window.clearTimeout = () => {};
  window.setInterval = (callback, delay) => { harness.intervals.push({ callback, delay }); return 1; };
  window.clearInterval = id => harness.cleared.push(id);
});
afterEach(() => {
  harness.cleanups.forEach(cleanup => cleanup());
  delete globalThis.__membershipSession; delete globalThis.window; delete globalThis.localStorage; delete globalThis.document;
});
test('an authenticated session queries backend permissions without any membership env flag', async () => {
  harness.access.financiallyRestricted = true; mount(); await flush();
  assert.equal(harness.requests[0].url, 'https://backend.example.invalid/membership-billing/me/access');
  assert.equal(harness.requests[0].options.headers.Authorization, `Bearer ${token}`);
  assert.equal(harness.states[0].user.role, 'user');
  assert.equal(harness.states[0].user.financiallyRestricted, true);
});
test('the backend can restore ordinary access on the next refresh', async () => {
  harness.access.financiallyRestricted = true; mount(); await flush();
  harness.access = { ...harness.access, financiallyRestricted: false };
  window.dispatchEvent(new Event('focus')); await flush();
  assert.equal(harness.states[0].user.financiallyRestricted, false);
  assert.equal(harness.requests.length, 2);
});
test('backend PAYMENTS_ONLY denial updates the session without revoking login identity', async () => {
  mount(); await flush();
  const error = { response: { data: { code: 'PAYMENTS_ONLY' } } };
  await assert.rejects(() => harness.reject(error));
  assert.equal(harness.states[0].user.financiallyRestricted, true);
  assert.equal(harness.states[0].token, token);
});
test('a network outage does not erase the session or claim new permissions', async () => {
  harness.error = new Error('unavailable'); mount(); await flush();
  assert.equal(harness.states[0].token, token);
  assert.equal(harness.states[0].user.name, 'Cached member');
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

test('an expired cached token never authenticates or sends private requests', async () => {
  storage.set('token', signedToken(1)); mount(); await flush();
  assert.deepEqual(harness.states[0], { token: null, user: null, reason: 'expired' });
  assert.equal(storage.has('token'), false);
  assert.equal(harness.requests.length, 0);
});
for (const cached of ['not-a-jwt', signedToken(Infinity)]) {
  test(`malformed cached token is cleared: ${cached.slice(0, 12)}`, async () => {
    storage.set('token', cached); mount(); await flush();
    assert.equal(harness.states[0].reason, 'expired');
    assert.equal(storage.has('userInfo'), false);
  });
}
test('invalid cached user data redirects safely instead of crashing', async () => {
  storage.set('userInfo', '{bad'); mount(); await flush();
  assert.equal(harness.states[0].reason, 'expired');
});
test('401 on the initial permission request clears the session immediately', async () => {
  harness.error = unauthorized(); mount(); await flush();
  assert.equal(harness.states[0].reason, 'expired');
  assert.equal(storage.has('token'), false);
});
test('concurrent API denials close the session only once', async () => {
  mount(); await flush();
  await assert.rejects(() => harness.reject(unauthorized()));
  const ended = harness.states[0];
  await assert.rejects(() => harness.reject(unauthorized()));
  assert.equal(harness.states[0], ended);
  assert.equal(ended.reason, 'expired');
});
for (const status of [403, 429, 500, 503]) {
  test(`${status} never clears authentication`, async () => {
    mount(); await flush();
    await assert.rejects(() => harness.reject({ ...unauthorized(), response: { status } }));
    assert.equal(harness.states[0].token, token);
  });
}
for (const config of [
  { url: 'https://provider.example.invalid/checkout' },
  { url: 'https://backend.example.invalid/auth/login' },
  { headers: {} },
  { headers: { Authorization: 'Bearer previous-session' } },
]) {
  test(`unrelated 401 does not revoke the current session: ${JSON.stringify(config)}`, async () => {
    mount(); await flush();
    await assert.rejects(() => harness.reject(unauthorized(config)));
    assert.equal(harness.states[0].token, token);
  });
}
test('a late response from the previous login cannot clear a new login', async () => {
  mount(); await flush();
  const next = signedToken(Math.floor(Date.now() / 1000) + 7200);
  harness.view.props.value.login({ email: 'new@example.invalid' }, next);
  await assert.rejects(() => harness.reject(unauthorized()));
  assert.equal(harness.states[0].token, next);
});
for (const event of ['timer', 'focus', 'visibilitychange']) {
  test(`JWT expiry closes the session via ${event} without waiting for an API error`, async context => {
    mount(); await flush();
    const expiry = Date.now() + 7200000;
    context.mock.method(Date, 'now', () => expiry);
    if (event === 'timer') harness.timers.at(-1).callback();
    else if (event === 'focus') window.dispatchEvent(new Event('focus'));
    else document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    assert.equal(harness.states[0].reason, 'expired');
    assert.equal(harness.requests.length, 1);
  });
}
test('Axios baseURL paths and AxiosHeaders are matched only inside our API prefix', () => {
  const failure = unauthorized({ baseURL: 'https://backend.example.invalid/api', url: '/members', headers: { get: () => `Bearer ${token}` } });
  assert.equal(currentSessionUnauthorized(failure, token, 'https://backend.example.invalid/api'), true);
  assert.equal(currentSessionUnauthorized(unauthorized({ url: 'https://backend.example.invalid/api-other/members' }), token, 'https://backend.example.invalid/api'), false);
});
test('a session notice acknowledgement does not restore the expired token', async () => {
  mount(); await flush();
  await assert.rejects(() => harness.reject(unauthorized()));
  harness.view.props.value.acknowledgeSessionEnd();
  assert.deepEqual(harness.states[0], { token: null, user: null, reason: null });
  assert.equal(storage.has('token'), false);
});
