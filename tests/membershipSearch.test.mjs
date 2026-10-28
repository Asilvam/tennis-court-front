import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/AdminMembershipPayments.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://backend.example.invalid' }) },
  plugins: [{ name: 'monthly-search-test-adapters', setup(builder) {
    const modules = {
      react: `
        const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
        export const useState = initial => {
          const h = globalThis.__monthlySearch, i = h.stateIndex++;
          if (!(i in h.states)) h.states[i] = typeof initial === 'function' ? initial() : initial;
          return [h.states[i], value => {
            const next = typeof value === 'function' ? value(h.states[i]) : value;
            if (!Object.is(next, h.states[i])) { h.states[i] = next; h.dirty = true; }
          }];
        };
        export const useRef = initial => {
          const h = globalThis.__monthlySearch, i = h.refIndex++;
          return h.refs[i] ||= { current: initial };
        };
        export const useEffect = (effect, deps) => {
          const h = globalThis.__monthlySearch, i = h.effectIndex++;
          if (same(h.effects[i]?.deps, deps)) return;
          h.pending.push(() => {
            h.effects[i]?.cleanup?.();
            h.effects[i] = { deps, cleanup: effect() };
          });
        };
        export const useCallback = (fn, deps) => {
          const h = globalThis.__monthlySearch, i = h.memoIndex++;
          if (!same(h.memos[i]?.deps, deps)) h.memos[i] = { deps, fn };
          return h.memos[i].fn;
        };`,
      'react/jsx-runtime': `export const Fragment = 'Fragment'; export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;`,
      'react-router-dom': `export const useNavigate = () => () => {}; export const useLocation = () => ({ state: null }); export const useSearchParams = () => [globalThis.__monthlySearch.params];`,
      axios: `export default {
        get: (url, options) => new Promise((resolve, reject) => globalThis.__monthlySearch.requests.push({ url, options, resolve, reject })),
        isCancel: error => error?.code === 'ERR_CANCELED', isAxiosError: error => !!error?.response
      };`,
      sweetalert2: `export default { fire: options => { globalThis.__monthlySearch.dialogs.push(options); return Promise.resolve({ isConfirmed: false }); } };`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon = 'Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faArrowLeft=0, faChevronLeft=0, faChevronRight=0, faEye=0, faMoneyBillTransfer=0, faRotateLeft=0, faRotateRight=0, faSearch=0, faSave=0, faUserCheck=0;`,
      './LoadingSpinner': `export const LoadingSpinner = 'LoadingSpinner';`,
      './MembershipBillingSelect': `export const MembershipBillingSelect = 'BillingSelect';`,
      './AdminMembershipMember': `export const AdminMembershipMember = 'MemberDetail';`,
      './MembershipBatchEnrollment': `export const MembershipBatchEnrollment = 'BatchEnrollment';`,
      '../utils/tokenUtils': `export const getTokenFromLocalStorage = () => 'fixture';`,
      '../hooks/useUnsavedCategoryChanges': `export const useUnsavedEditorChanges = () => {};`,
      '../utils/categoryConfirmation': `export const confirmDiscardCategoryChanges = async () => false;`,
    };
    builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents: modules[args.path] }));
  } }],
});
const { default: AdminMembershipPayments } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
let h;
const render = () => {
  let count = 0;
  do {
    assert.ok(count++ < 20, 'render must settle');
    h.dirty = false;
    h.stateIndex = h.refIndex = h.effectIndex = h.memoIndex = 0;
    h.tree = AdminMembershipPayments();
    const pending = h.pending.splice(0);
    pending.forEach(run => run());
  } while (h.dirty);
};
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const find = predicate => nodes(h.tree).find(predicate);
const input = () => find(node => node.type === 'input' && node.props.type === 'search');
const type = value => { input().props.onChange({ target: { value } }); render(); };
const tick = (context, ms) => { context.mock.timers.tick(ms); render(); };
const flush = async () => { await new Promise(setImmediate); render(); };
const finish = async (request, items = [], total = items.length) => { request.resolve({ data: { items, total } }); await flush(); };
const cleanup = () => { h.effects.forEach(effect => effect?.cleanup?.()); h.effects = []; };
beforeEach(async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  h = { states: [], refs: [], effects: [], memos: [], pending: [], requests: [], dialogs: [], params: new URLSearchParams() };
  globalThis.__monthlySearch = h;
  globalThis.window = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: id => clearTimeout(id), scrollTo() {} };
  render();
  await finish(h.requests[0], [], 41);
});
afterEach(() => { cleanup(); delete globalThis.__monthlySearch; delete globalThis.window; });

test('typing searches automatically after 250ms without submitting the form', async context => {
  type('  Aldo  ');
  assert.equal(input().props.value, '  Aldo  ');
  tick(context, 249);
  assert.equal(h.requests.length, 1);
  tick(context, 1);
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].options.params.search, 'Aldo');
  assert.equal(h.requests[1].options.params.page, 1);
});
test('rapid typing cancels intermediate searches and sends only the latest value', context => {
  type('a'); tick(context, 100);
  type('al'); tick(context, 100);
  type('aldo'); tick(context, 249);
  assert.equal(h.requests.length, 1);
  tick(context, 1);
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].options.params.search, 'aldo');
});
test('clearing the search restores all results immediately', context => {
  type('test@example.invalid'); tick(context, 250);
  type('');
  assert.equal(h.requests.at(-1).options.params.search, '');
  assert.equal(h.requests.at(-1).options.params.page, 1);
});
test('a new search returns to page one and preserves the selected month', async context => {
  find(node => node.props?.['aria-label'] === 'Página siguiente').props.onClick(); render();
  assert.equal(h.requests.at(-1).options.params.page, 2);
  await finish(h.requests.at(-1), [], 41);
  find(node => node.type === 'input' && node.props.type === 'month').props.onChange({ target: { value: '2026-09' } }); render();
  await finish(h.requests.at(-1), [], 41);
  type('test'); tick(context, 250);
  assert.deepEqual(h.requests.at(-1).options.params, { search: 'test', period: '2026-09', page: 1 });
});
test('Enter or the search button submits immediately without a duplicate delayed request', context => {
  type('test');
  let prevented = false;
  find(node => node.type === 'form' && node.props.className === 'ap-search').props.onSubmit({ preventDefault() { prevented = true; } }); render();
  assert.equal(prevented, true);
  assert.equal(h.requests.at(-1).options.params.search, 'test');
  const count = h.requests.length;
  tick(context, 250);
  assert.equal(h.requests.length, count);
});
test('a slower obsolete response cannot overwrite the latest search results', async context => {
  type('al'); tick(context, 250);
  const older = h.requests.at(-1);
  type('aldo'); tick(context, 250);
  const latest = h.requests.at(-1);
  assert.equal(older.options.signal.aborted, true);
  const person = name => ({ id: name, name, email: 'fixture@example.invalid', memberType: 'Titular', active: true, enrolled: true, amount: 180, status: 'OPEN', pricingMode: 'TEST' });
  await finish(latest, [person('Current result')]);
  await finish(older, [person('Obsolete result')]);
  const texts = nodes(h.tree).flatMap(node => typeof node.props?.children === 'string' ? [node.props.children] : []);
  assert.ok(texts.includes('Current result'));
  assert.equal(texts.includes('Obsolete result'), false);
  assert.equal(h.dialogs.length, 0);
});
test('leaving dues cancels a pending search', context => {
  type('test');
  find(node => node.props?.role === 'tab' && node.props.children === 'Historial de pagos').props.onClick(); render();
  const count = h.requests.length;
  tick(context, 250);
  assert.equal(h.requests.length, count);
  assert.ok(h.requests.at(-1).url.endsWith('/payments'));
  cleanup();
  context.mock.timers.tick(250);
  assert.equal(h.requests.length, count);
});
test('unmounting before the delay cancels the pending search', context => {
  type('test');
  const count = h.requests.length;
  cleanup();
  context.mock.timers.tick(250);
  assert.equal(h.requests.length, count);
});
