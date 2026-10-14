import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

globalThis.window = new EventTarget();
const compiled = await build({
    stdin: {
        contents: `export { useUnsavedCategoryChanges } from './src/hooks/useUnsavedCategoryChanges';
            export { confirmDiscardCategoryChanges } from './src/utils/categoryConfirmation';`,
        resolveDir: fileURLToPath(new URL('../', import.meta.url)),
        loader: 'ts',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    plugins: [
        {
            name: 'navigation-test-adapters',
            setup(builder) {
                builder.onResolve(
                    { filter: /^(react|react-router-dom|sweetalert2)$/ },
                    (args) => ({ path: args.path, namespace: 'test' }),
                );
                builder.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({
                    contents: {
                        react: `export const useContext = () => ({ navigator: globalThis.__guardTest.navigator });
                    export const useRef = value => { const ref = { current: value }; globalThis.__guardTest.refs.push(ref); return ref; };
                    export const useEffect = effect => { const cleanup = effect(); if (cleanup) globalThis.__guardTest.cleanups.push(cleanup); };`,
                        'react-router-dom':
                            'export const UNSAFE_NavigationContext = {};',
                        sweetalert2: `export default { fire: options => globalThis.__guardTest.fire(options), close: () => globalThis.__guardTest.close() };`,
                    }[args.path],
                    loader: 'js',
                }));
            },
        },
    ],
});
const { useUnsavedCategoryChanges, confirmDiscardCategoryChanges } =
    await import(
        `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`
    );
const settle = () => new Promise((resolve) => setImmediate(resolve));
let harness;
let routerListener;
beforeEach(() => {
    harness = {
        calls: [],
        dialogs: [],
        refs: [],
        cleanups: [],
        routerPops: 0,
        navigator: {},
        fire(options) {
            this.dialogs.push(options);
            return new Promise((resolve) => {
                this.answer = resolve;
            });
        },
        close() {
            this.answer?.({ isConfirmed: false });
        },
    };
    for (const method of ['push', 'replace', 'go'])
        harness.navigator[method] = (...args) =>
            harness.calls.push({ method, args });
    globalThis.__guardTest = harness;
    window.history = {
        state: { idx: 2 },
        go: (delta) => harness.calls.push({ method: 'restore', args: [delta] }),
    };
    window.confirm = () => {
        throw new Error('Native confirmation must not be used');
    };
    routerListener = () => {
        harness.routerPops++;
    };
    window.addEventListener('popstate', routerListener);
});
afterEach(async () => {
    harness.cleanups.forEach((cleanup) => cleanup());
    harness.close();
    window.removeEventListener('popstate', routerListener);
    await settle();
});
function pop(index) {
    window.history.state = { idx: index };
    window.dispatchEvent(new Event('popstate'));
}

test('cancelling the SweetAlert keeps the draft and prevents navigation', async () => {
    useUnsavedCategoryChanges(true, false);
    harness.navigator.push('/adminregister');
    assert.equal(harness.calls.length, 0);
    assert.equal(harness.dialogs.length, 1);
    assert.equal(harness.dialogs[0].showCancelButton, true);
    assert.equal(harness.dialogs[0].focusCancel, true);
    assert.equal(harness.dialogs[0].cancelButtonText, 'Seguir editando');
    harness.answer({ isConfirmed: false });
    await settle();
    assert.equal(harness.calls.length, 0);
});
test('repeated navigation attempts share one decision and only the first proceeds', async () => {
    useUnsavedCategoryChanges(true, false);
    harness.navigator.replace('/adminregister');
    harness.navigator.push('/ranking');
    harness.navigator.go(-1);
    assert.equal(harness.dialogs.length, 1);
    harness.answer({ isConfirmed: true });
    await settle();
    assert.deepEqual(harness.calls, [
        { method: 'replace', args: ['/adminregister'] },
    ]);
});
test('programmatic Back proceeds only after confirmation without a second dialog', async () => {
    useUnsavedCategoryChanges(true, false);
    harness.navigator.go(-1);
    harness.answer({ isConfirmed: true });
    await settle();
    assert.deepEqual(harness.calls, [{ method: 'go', args: [-1] }]);
    pop(1);
    assert.equal(harness.routerPops, 1);
    assert.equal(harness.dialogs.length, 1);
});
test('browser Back restores the editor before prompting and cancellation stays there', async () => {
    useUnsavedCategoryChanges(true, false);
    pop(1);
    assert.equal(harness.routerPops, 0);
    assert.equal(harness.dialogs.length, 0);
    assert.deepEqual(harness.calls, [{ method: 'restore', args: [1] }]);
    pop(2);
    assert.equal(harness.dialogs.length, 1);
    harness.answer({ isConfirmed: false });
    await settle();
    assert.equal(harness.routerPops, 0);
    assert.equal(harness.calls.length, 1);
    assert.equal(window.history.state.idx, 2);
});
test('confirmed browser Back replays exactly the original history delta', async () => {
    useUnsavedCategoryChanges(true, false);
    pop(0);
    pop(2);
    harness.answer({ isConfirmed: true });
    await settle();
    assert.deepEqual(harness.calls, [
        { method: 'restore', args: [2] },
        { method: 'go', args: [-2] },
    ]);
    pop(0);
    assert.equal(harness.routerPops, 1);
    assert.equal(harness.dialogs.length, 1);
});
test('navigation remains blocked while a save is in flight without another dialog', () => {
    useUnsavedCategoryChanges(true, true);
    harness.navigator.push('/adminregister');
    pop(1);
    pop(2);
    assert.equal(harness.dialogs.length, 0);
    assert.equal(harness.routerPops, 0);
    assert.deepEqual(harness.calls, [{ method: 'restore', args: [1] }]);
});
test('unmounting during a pending dialog cannot execute stale navigation', async () => {
    useUnsavedCategoryChanges(true, false);
    harness.navigator.push('/adminregister');
    harness.cleanups.forEach((cleanup) => cleanup());
    harness.cleanups = [];
    harness.answer({ isConfirmed: true });
    await settle();
    assert.equal(harness.calls.length, 0);
});
test('native tab unload stays protected, but confirmed in-app reload does not prompt twice', async () => {
    useUnsavedCategoryChanges(true, false);
    const blocked = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(blocked);
    assert.equal(blocked.defaultPrevented, true);
    harness.navigator.go(0);
    harness.answer({ isConfirmed: true });
    await settle();
    const approved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(approved);
    assert.equal(approved.defaultPrevented, false);
    assert.deepEqual(harness.calls, [{ method: 'go', args: [0] }]);
});
test('reload confirmation is SweetAlert and simultaneous requests cannot open two dialogs', async () => {
    const first = confirmDiscardCategoryChanges('reload');
    assert.equal(await confirmDiscardCategoryChanges('leave'), false);
    assert.equal(harness.dialogs.length, 1);
    assert.equal(harness.dialogs[0].confirmButtonText, 'Descartar y recargar');
    harness.answer({ isConfirmed: true });
    assert.equal(await first, true);
});
