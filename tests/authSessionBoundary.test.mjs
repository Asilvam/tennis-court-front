import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
    entryPoints: [fileURLToPath(new URL('../src/components/AuthSessionBoundary.tsx', import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
    plugins: [{ name: 'session-boundary-adapters', setup(builder) {
        builder.onResolve({ filter: /^(react|react\/jsx-runtime|react-router-dom|sweetalert2)$|^\.\/useAuth$/ }, args => ({ path: args.path, namespace: 'test' }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents: {
            react: 'export const useEffect = effect => { const cleanup = effect(); if (cleanup) globalThis.__sessionBoundary.cleanups.push(cleanup); };',
            'react/jsx-runtime': 'export const Fragment = "Fragment"; export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;',
            'react-router-dom': 'export const Navigate = "Navigate"; export const useLocation = () => globalThis.__sessionBoundary.location;',
            sweetalert2: 'export default { fire: options => { globalThis.__sessionBoundary.dialogs.push(options); return Promise.resolve(); } };',
            './useAuth': 'export const useAuth = () => globalThis.__sessionBoundary.auth;',
        }[args.path] }));
    } }],
});
const { AuthSessionBoundary } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let harness;
beforeEach(() => {
    harness = { cleanups: [], timers: new Map(), dialogs: [], auth: { isAuthenticated: false, sessionEndReason: 'expired' }, location: { pathname: '/admincategories', search: '?id=fixture' } };
    globalThis.__sessionBoundary = harness;
    harness.auth.acknowledgeSessionEnd = () => { harness.auth.sessionEndReason = null; };
    globalThis.window = {
        setTimeout: callback => { const id = harness.timers.size + 1; harness.timers.set(id, callback); return id; },
        clearTimeout: id => harness.timers.delete(id),
    };
});
afterEach(() => { harness.cleanups.forEach(cleanup => cleanup()); delete globalThis.__sessionBoundary; delete globalThis.window; });
test('forced login unmounts dirty editors before navigation and does not await a dialog', () => {
    const view = AuthSessionBoundary({ children: 'dirty-editor' });
    assert.equal(view.type, 'Navigate');
    assert.equal(view.props.to, '/login');
    assert.equal(view.props.replace, true);
    assert.equal(view.props.state.from, '/admincategories?id=fixture');
    assert.equal(harness.dialogs.length, 0);
    harness.timers.values().next().value();
    assert.equal(harness.dialogs[0].title, 'Tu sesión venció');
    assert.equal(harness.auth.sessionEndReason, null);
});
test('the login remains usable while the single expiry notice is shown', () => {
    harness.location.pathname = '/login';
    const view = AuthSessionBoundary({ children: 'login-form' });
    assert.equal(view.props.children, 'login-form');
    assert.equal(harness.timers.size, 1);
});
test('inactivity uses the same login flow and SweetAlert2 notice', () => {
    harness.auth.sessionEndReason = 'inactive';
    assert.equal(AuthSessionBoundary({ children: 'page' }).props.to, '/login');
    harness.timers.values().next().value();
    assert.equal(harness.dialogs[0].title, 'Sesión cerrada por inactividad');
});
test('a successful login cancels a scheduled expiry notice on effect cleanup', () => {
    AuthSessionBoundary({ children: 'page' });
    harness.cleanups.forEach(cleanup => cleanup()); harness.cleanups = [];
    harness.auth = { isAuthenticated: true, sessionEndReason: null };
    assert.equal(AuthSessionBoundary({ children: 'page' }).props.children, 'page');
    assert.equal(harness.timers.size, 0);
});
test('after the notice, public recovery pages are not trapped by the forced login', () => {
    AuthSessionBoundary({ children: 'page' });
    harness.timers.values().next().value();
    harness.location.pathname = '/recuperar-contrasena';
    assert.equal(AuthSessionBoundary({ children: 'recovery-form' }).props.children, 'recovery-form');
});
