import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Compile the actual hook with a small effect-scheduling harness and mocked HTTP.
// No DOM, Vite environment files, backend, or Mercado Pago requests are used.
const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/hooks/usePaymentHold.ts', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://backend.test') },
    plugins: [{ name: 'isolated-hold-fixtures', setup(plugin) {
        plugin.onResolve({ filter: /^(react|axios)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
        plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'react'
            ? `export const useState = (...a) => globalThis.__holdFixture.useState(...a);
               export const useRef = (...a) => globalThis.__holdFixture.useRef(...a);
               export const useEffect = (...a) => globalThis.__holdFixture.useEffect(...a);`
            : `export default { post: (...a) => globalThis.__holdFixture.post(...a),
                delete: (...a) => globalThis.__holdFixture.remove(...a),
                isAxiosError: e => Boolean(e?.isAxiosError) };` }));
    } }],
});
const { usePaymentHold } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const slot = { court: 'Cancha 1', dateToPlay: '2030-10-12', turn: '20:15-22:00', isVisit: false };
const hold = id => ({ idCourtReserve: id, holdExpiresAt: new Date(Date.now() + 600000).toISOString(), serverNow: new Date().toISOString() });
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function fixture(t) {
    const previous = { window: globalThis.window, localStorage: globalThis.localStorage, hooks: globalThis.__holdFixture };
    globalThis.window = { setInterval: () => 1, clearInterval: () => {} };
    globalThis.localStorage = { getItem: () => 'local-test-session' };
    const values = [];
    const effects = new Map();
    let cursor = 0;
    let enabled = true;
    let selected = slot;
    const calls = [];
    const hooks = {
        post: async (...args) => { calls.push(['post', ...args]); return { data: hold(`h-${calls.filter(c => c[0] === 'post').length}`) }; },
        remove: async (...args) => { calls.push(['delete', ...args]); return { data: { released: true } }; },
        useState(initial) {
            const index = cursor++;
            if (!(index in values)) values[index] = initial;
            return [values[index], value => { values[index] = value; }];
        },
        useRef(initial) {
            const index = cursor++;
            if (!(index in values)) values[index] = { current: initial };
            return values[index];
        },
        useEffect(callback, deps) {
            const index = cursor++;
            const previousEffect = effects.get(index);
            if (!previousEffect || deps.some((value, i) => value !== previousEffect.deps[i])) {
                previousEffect?.cleanup?.();
                effects.set(index, { callback, deps, cleanup: callback() });
            }
        },
    };
    globalThis.__holdFixture = hooks;
    function render(nextEnabled = enabled, nextSlot = selected) {
        enabled = nextEnabled; selected = nextSlot; cursor = 0;
        return usePaymentHold(enabled, selected);
    }
    function cleanup() { for (const effect of effects.values()) effect.cleanup?.(); }
    t.after(async () => {
        cleanup(); await flush();
        Object.assign(globalThis, { window: previous.window, localStorage: previous.localStorage, __holdFixture: previous.hooks });
    });
    return { hooks, calls, render, cleanup, strictReplay() {
        cleanup();
        for (const effect of effects.values()) effect.cleanup = effect.callback();
    } };
}

test('acquires a hold with the session and without requesting a preference', async t => {
    const f = fixture(t);
    f.render(); await flush();
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0][1], 'http://backend.test/court-reserve/holds');
    assert.equal(f.calls[0][3].headers.Authorization, 'Bearer local-test-session');
    assert.equal(f.render().hold.idCourtReserve, 'h-1');
    assert.ok(f.render().remainingSeconds > 590);
});

test('a free slot does not acquire a hold', async t => {
    const f = fixture(t);
    f.render(false); await flush();
    assert.equal(f.calls.length, 0);
});

test('StrictMode setup-cleanup-setup does not create competing holds', async t => {
    const f = fixture(t);
    f.render(); f.strictReplay(); await flush();
    assert.equal(f.calls.filter(c => c[0] === 'post').length, 1);
    assert.equal(f.render().hold.idCourtReserve, 'h-1');
});

test('closing before the create response releases the acquired hold as soon as its ID is known', async t => {
    const f = fixture(t);
    const pending = deferred();
    f.hooks.post = (...args) => { f.calls.push(['post', ...args]); return pending.promise; };
    f.render(); await flush(); f.cleanup();
    pending.resolve({ data: hold('late-hold') }); await flush();
    assert.equal(f.calls.filter(c => c[0] === 'delete').length, 1);
    assert.equal(f.calls.at(-1)[1], 'http://backend.test/court-reserve/holds/late-hold');
});

test('switching slots waits for the old cancellation before acquiring the next hold', async t => {
    const f = fixture(t);
    f.render(); await flush();
    const cancel = deferred();
    f.hooks.remove = (...args) => { f.calls.push(['delete', ...args]); return cancel.promise; };
    f.render(true, { ...slot, court: 'Cancha 2' }); await flush();
    assert.equal(f.calls.filter(c => c[0] === 'post').length, 1);
    cancel.resolve({ data: { released: true } }); await flush();
    assert.deepEqual(f.calls.map(c => c[0]), ['post', 'delete', 'post']);
    assert.equal(f.calls.at(-1)[2].court, 'Cancha 2');
});

test('closing after checkout starts does not cancel the in-flight payment', async t => {
    const f = fixture(t);
    f.render(); await flush();
    f.render().checkoutStarted.current = true;
    f.cleanup(); await flush();
    assert.equal(f.calls.filter(c => c[0] === 'delete').length, 0);
});

test('explicit cancellation releases the same reservation', async t => {
    const f = fixture(t);
    f.render(); await flush();
    await f.render().release();
    assert.equal(f.calls.at(-1)[1], 'http://backend.test/court-reserve/holds/h-1');
    assert.equal(f.render().hold, null);
});

test('changing visitor participants in an already held night slot does not extend its deadline', async t => {
    const f = fixture(t);
    f.render(); await flush();
    const deadline = f.render().hold.holdExpiresAt;
    const updated = f.render(true, { ...slot, isVisit: true }); await flush();
    assert.equal(updated.hold.holdExpiresAt, deadline);
    assert.equal(f.calls.filter(c => c[0] === 'post').length, 1);
});

test('a failed hold request keeps payment unavailable and reports the backend message', async t => {
    const f = fixture(t);
    f.hooks.post = async () => { throw { isAxiosError: true, response: { data: { message: 'Horario ocupado' } } }; };
    f.render(); await flush();
    const state = f.render();
    assert.equal(state.hold, null);
    assert.equal(state.error, 'Horario ocupado');
    assert.equal(state.loading, false);
});
