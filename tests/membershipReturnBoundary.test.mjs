import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const output = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/MembershipSessionBoundary.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  plugins: [{ name: 'boundary-test-adapters', setup(builder) {
    builder.onResolve({ filter: /^(react\/jsx-runtime|react-router-dom)$|^\.\/useAuth$/ }, args => ({ path: args.path, namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents: {
      'react/jsx-runtime': `export const Fragment = 'Fragment'; export const jsx = (type, props) => ({ type, props });`,
      'react-router-dom': `export const Navigate = 'Navigate'; export const useLocation = () => globalThis.__returnBoundary.location;`,
      './useAuth': `export const useAuth = () => globalThis.__returnBoundary.auth;`,
    }[args.path] }));
  } }],
});
const { MembershipSessionBoundary } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const reference = 'membership-11111111-1111-4111-8111-111111111111';
const render = (pathname, from, restricted = true, authenticated = true) => {
  globalThis.__returnBoundary = {
    location: { pathname, state: { from } },
    auth: { isAuthenticated: authenticated, user: { financiallyRestricted: restricted } },
  };
  return MembershipSessionBoundary({ children: 'page' });
};

test('restricted login preserves the dedicated return instead of redirecting to the generic portal', () => {
  const result = render('/login', `/monthlypayments/return?reference=${reference}&status=approved`);
  assert.equal(result.type, 'Navigate');
  assert.equal(result.props.to, `/monthlypayments/return?reference=${reference}`);
});
test('restricted login also migrates an old provider return without trusting its status', () => {
  assert.equal(render('/login', `/monthlypayments?reference=${reference}&payment_id=null`).props.to,
    `/monthlypayments/return?reference=${reference}`);
});
test('unsafe login destinations and unrelated restricted paths go only to the portal', () => {
  assert.equal(render('/login', 'https://attacker.invalid').props.to, '/monthlypayments');
  assert.equal(render('/adminregister', `/monthlypayments/return?reference=${reference}`).props.to, '/monthlypayments');
});
test('restricted sessions can render the result and portal, while anonymous login remains accessible', () => {
  for (const path of ['/monthlypayments', '/monthlypayments/return']) assert.equal(render(path).props.children, 'page');
  assert.equal(render('/login', undefined, false, false).props.children, 'page');
  assert.equal(render('/dashboard', undefined, false).props.children, 'page');
});
