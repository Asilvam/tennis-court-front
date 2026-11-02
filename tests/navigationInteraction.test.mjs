import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/Navigation.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  plugins: [{ name: 'navigation-fixtures', setup(builder) {
    const modules = {
      react: `export default {};export const useRef=value=>{const h=globalThis.__nav,i=h.cursor++;return h.refs[i]||={current:value};};export const useCallback=fn=>fn;export const useEffect=fn=>globalThis.__nav.effects.push(fn);`,
      'react/jsx-runtime': `export const Fragment='Fragment';export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`,
      'react-router-dom': `export const Link='Link';export const useNavigate=()=>path=>globalThis.__nav.order.push('navigate:'+path);`,
      sweetalert2: `export default {fire:options=>{globalThis.__nav.order.push('alert');globalThis.__nav.alerts.push(options);return Promise.resolve({});}};`,
      './useAuth': `export const useAuth=()=>globalThis.__nav.auth;`,
      '../utils/tokenUtils': `export const removeTokenFromLocalStorage=()=>globalThis.__nav.order.push('remove-token');`,
      '../utils/userUtils.ts': `export const removeUserInfoFromLocalStorage=()=>globalThis.__nav.order.push('remove-user');`,
    };
    builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'style' }));
    builder.onLoad({ filter: /.*/, namespace: 'style' }, () => ({ contents: '', loader: 'js' }));
    builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: modules[args.path], loader: 'js' }));
  } }],
});
const { default: Navigation } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
let h;
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
const text = n => Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' ? text(n.props?.children) : typeof n === 'string' ? n : '';
const render = () => { h.cursor = 0; h.effects = []; h.tree = Navigation(); };
const dropdown = () => nodes(h.tree).find(n => n.props?.id === 'dropdown1');
const mount = () => { h.refs[0].current = h.sideElement; h.cleanup = h.effects[0](); h.effects[1](); };
beforeEach(() => {
  h = { refs: [], effects: [], order: [], alerts: [], options: [], listeners: new Map(), destroyed: [] };
  h.auth = { user: { name: 'Socio fixture', role: 'admin' }, isAuthenticated: true, logout: () => h.order.push('logout') };
  h.sideElement = { addEventListener: (type, fn) => h.listeners.set(type, fn), removeEventListener: type => h.listeners.delete(type) };
  globalThis.__nav = h;
  globalThis.document = { querySelectorAll: () => ['trigger'] };
  globalThis.M = {
    Dropdown: { init: (_elements, options) => { h.options.push(options); return [{ close: () => h.order.push('close'), destroy: () => h.destroyed.push('dropdown') }]; } },
    Sidenav: { init: el => ({ el, close: () => h.order.push('close-side'), destroy: () => h.destroyed.push('sidenav') }) },
  };
  render();
});
afterEach(() => { h.cleanup?.(); delete globalThis.__nav; delete globalThis.M; delete globalThis.document; });

test('Materialize never closes an inside item from touchend before React handles its click', () => {
  mount();
  assert.equal(h.options[0].closeOnClick, false);
  assert.equal(h.options[0].coverTrigger, false);
});
test('anonymous desktop has Login but no visible empty menu; mobile retains Login', () => {
  h.auth.isAuthenticated = false; h.auth.user = null; render(); mount();
  const trigger = nodes(h.tree).find(n => n.type === 'li' && nodes(n.props.children).some(c => c.props?.className === 'dropdown-trigger'));
  assert.equal(trigger.props.hidden, true);
  assert.equal(dropdown().props.hidden, true);
  assert.equal(nodes(h.tree).filter(n => n.type === 'Link' && n.props.to === '/login').length, 2);
  assert.equal(nodes(dropdown()).filter(n => n.type === 'Link').length, 0);
});
for (const role of ['user', 'profesor', 'admin']) {
  test(`keeps the existing ${role} menu permissions`, () => {
    h.auth.user.role = role; render();
    const paths = nodes(dropdown()).filter(n => n.type === 'Link').map(n => n.props.to);
    assert.equal(dropdown().props.hidden, false);
    assert.ok(paths.includes('/myhistory') && paths.includes('/monthlypayments'));
    assert.equal(paths.includes('/multibooking'), role !== 'user');
    for (const path of ['/adminregister', '/adminreserves', '/adminpayments', '/resetpassword'])
      assert.equal(paths.includes(path), role === 'admin');
  });
}
test('My history keeps its original route and explicitly closes after its own click', () => {
  mount();
  const link = nodes(dropdown()).find(n => n.type === 'Link' && n.props.to === '/myhistory');
  link.props.onClick();
  assert.deepEqual(h.order, ['close']);
});
for (const className of ['ctq-nav__dropdown-link', 'ctq-nav__sidenav-link']) {
  test(`logout prevents anchor navigation and clears only the session (${className})`, () => {
    mount();
    const link = nodes(h.tree).find(n => n.type === 'a' && n.props.className === className && text(n) === 'Logout');
    link.props.onClick({ preventDefault: () => h.order.push('prevent-default') });
    assert.deepEqual(h.order, ['prevent-default', 'close', 'remove-token', 'remove-user', 'logout', 'alert', 'navigate:/']);
    assert.equal(h.alerts[0].icon, 'success');
  });
}
test('session loss closes the dropdown without rebuilding native widgets or logging out twice', () => {
  mount(); h.order = [];
  h.auth.isAuthenticated = false; render(); h.effects[1]();
  assert.equal(dropdown().props.hidden, true);
  assert.deepEqual(h.order, ['close']);
  assert.equal(h.options.length, 1);
});
test('unmount destroys native instances and removes the sidebar listener', () => {
  mount(); h.cleanup(); h.cleanup = null;
  assert.deepEqual(h.destroyed, ['dropdown', 'sidenav']);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.refs[1].current, null);
});
