import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/Navigation.tsx', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  loader: { '.css': 'empty' },
  plugins: [{
    name: 'navigation-test-adapters',
    setup(builder) {
      builder.onResolve({ filter: /^(react|react-router-dom|sweetalert2)$|^\.\/useAuth$/ },
        args => ({ path: args.path, namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({
        contents: {
          react: `export default {
            createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
            Fragment: 'Fragment'
          };
          export const useEffect = () => {};
          export const useRef = value => ({ current: value });`,
          'react-router-dom': `export const Link = 'Link'; export const useNavigate = () => () => {};`,
          sweetalert2: `export default { fire: () => Promise.resolve() };`,
          './useAuth': `export const useAuth = () => globalThis.__membershipNavAuth;`,
        }[args.path],
        loader: 'js',
      }));
    },
  }],
});
const { default: Navigation } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`,
);
const links = (node, path) => {
  if (Array.isArray(node)) return node.flatMap(child => links(child, path));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === 'Link' && node.props.to === path ? [node] : []),
    ...links(node.children, path)];
};
const render = (role, isAuthenticated = true, financiallyRestricted = false) => {
  globalThis.__membershipNavAuth = {
    user: role ? { role, name: 'Fixture', financiallyRestricted } : null,
    isAuthenticated, logout() {},
  };
  return Navigation();
};
afterEach(() => { delete globalThis.__membershipNavAuth; });

test('an authenticated admin sees monthly administration in desktop and mobile without an env flag', () => {
  assert.equal(links(render('admin'), '/adminpayments').length, 2);
});
for (const role of ['user', 'profesor', undefined]) {
  test(`monthly administration is hidden for role ${role}`, () => {
    assert.equal(links(render(role), '/adminpayments').length, 0);
  });
}
test('an unauthenticated session never gains admin links from a stored role', () => {
  assert.equal(links(render('admin', false), '/adminpayments').length, 0);
});
test('a current-session role change removes monthly administration immediately', () => {
  assert.equal(links(render('admin'), '/adminpayments').length, 2);
  assert.equal(links(render('user'), '/adminpayments').length, 0);
});
test('an authenticated member sees the monthly portal without environment feature flags', () => {
  assert.equal(links(render('user'), '/monthlypayments').length, 2);
});
test('the backend payments-only restriction hides booking links but keeps the portal accessible', () => {
  const tree = render('user', true, true);
  assert.equal(links(tree, '/monthlypayments').length, 2);
  assert.equal(links(tree, '/dashboard').length, 0);
  assert.equal(links(tree, '/profile').length, 0);
});
test('the monthly portal link is hidden before authentication', () => {
  assert.equal(links(render('user', false), '/monthlypayments').length, 0);
});
