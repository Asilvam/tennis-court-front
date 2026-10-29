import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
    entryPoints: [fileURLToPath(new URL('../src/components/InactivityLogout.tsx', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    plugins: [{
        name: 'inactivity-test-adapters',
        setup(builder) {
            builder.onResolve({ filter: /^(react|react-router-dom|sweetalert2)$|^\.\/useAuth$/ },
                args => ({ path: args.path, namespace: 'test' }));
            builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({
                contents: {
                    react: `export default {};
                        export const useRef = value => ({ current: value });
                        export const useCallback = callback => callback;
                        export const useEffect = effect => {
                            const cleanup = effect();
                            if (cleanup) globalThis.__inactivityTest.cleanups.push(cleanup);
                        };`,
                    'react-router-dom': `export const useNavigate = () => path => globalThis.__inactivityTest.routes.push(path);`,
                    sweetalert2: `export default { fire: options => {
                        globalThis.__inactivityTest.dialogs.push(options);
                        return Promise.resolve({ isConfirmed: true });
                    } };`,
                    './useAuth': `export const useAuth = () => globalThis.__inactivityTest.auth;`,
                }[args.path],
                loader: 'js',
            }));
        },
    }],
});
const { default: InactivityLogout } = await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`,
);
const minute = 60 * 1000;
let harness;

beforeEach(context => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    harness = {
        cleanups: [], dialogs: [], routes: [], logoutCalls: 0,
        auth: { token: 'test-token', user: { role: 'admin' }, logout(reason) {
            harness.logoutCalls++; harness.reason = reason;
            harness.storage.delete('token'); harness.storage.delete('userInfo');
        } },
        storage: new Map([['token', 'test-token'], ['userInfo', '{}']]),
    };
    globalThis.__inactivityTest = harness;
    globalThis.window = new EventTarget();
    globalThis.localStorage = {
        getItem: key => harness.storage.get(key) ?? null,
        removeItem: key => harness.storage.delete(key),
    };
});

afterEach(() => {
    harness.cleanups.forEach(cleanup => cleanup());
    delete globalThis.__inactivityTest;
    delete globalThis.window;
    delete globalThis.localStorage;
});

test('admins remain signed in for 60 idle minutes without advance warnings', async context => {
    InactivityLogout();
    context.mock.timers.tick(60 * minute - 1);
    assert.equal(harness.dialogs.length, 0);
    assert.equal(harness.logoutCalls, 0);
    assert.equal(harness.storage.get('token'), 'test-token');
    context.mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(harness.logoutCalls, 1);
    assert.equal(harness.storage.has('token'), false);
    assert.equal(harness.storage.has('userInfo'), false);
    assert.equal(harness.reason, 'inactive');
    assert.equal(harness.dialogs.length, 0);
    assert.deepEqual(harness.routes, []);
});

for (const role of ['user', 'profesor', undefined]) {
    test(`non-admin role ${role} retains the three-minute timeout`, context => {
        harness.auth.user = role ? { role } : null;
        InactivityLogout();
        context.mock.timers.tick(3 * minute - 1);
        assert.equal(harness.logoutCalls, 0);
        context.mock.timers.tick(1);
        assert.equal(harness.logoutCalls, 1);
    });
}

for (const event of ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']) {
    test(`${event} restarts the full admin inactivity period`, context => {
        InactivityLogout();
        context.mock.timers.tick(59 * minute);
        window.dispatchEvent(new Event(event));
        context.mock.timers.tick(60 * minute - 1);
        assert.equal(harness.logoutCalls, 0);
        assert.equal(harness.dialogs.length, 0);
        context.mock.timers.tick(1);
        assert.equal(harness.logoutCalls, 1);
    });
}

test('no inactivity timer runs before login', context => {
    harness.auth.token = null;
    harness.storage.clear();
    InactivityLogout();
    context.mock.timers.tick(120 * minute);
    assert.equal(harness.logoutCalls, 0);
    assert.equal(harness.dialogs.length, 0);
});

test('login starts a fresh admin timer instead of retaining the anonymous timer', context => {
    harness.auth.token = null;
    harness.storage.clear();
    InactivityLogout();
    context.mock.timers.tick(2 * minute);
    harness.auth.token = 'test-token';
    harness.storage.set('token', 'test-token');
    InactivityLogout();
    context.mock.timers.tick(60 * minute - 1);
    assert.equal(harness.logoutCalls, 0);
    context.mock.timers.tick(1);
    assert.equal(harness.logoutCalls, 1);
});

test('cleanup removes the timer and all activity listeners', context => {
    InactivityLogout();
    harness.cleanups.forEach(cleanup => cleanup());
    harness.cleanups = [];
    window.dispatchEvent(new Event('touchstart'));
    context.mock.timers.tick(120 * minute);
    assert.equal(harness.logoutCalls, 0);
    assert.equal(harness.dialogs.length, 0);
});
