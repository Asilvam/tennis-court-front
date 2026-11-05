import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/AdminDirectoryControls.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'pagination-fixture', setup(builder) {
    const modules = {
      react: 'export const useState=initial=>[initial,()=>{}];',
      'react/jsx-runtime': 'export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment="Fragment";',
      './MembershipBillingSelect': 'export const MembershipBillingSelect="Select";',
      './LoadingSpinner': 'export const LoadingSpinner="Spinner";',
      '@fortawesome/react-fontawesome': 'export const FontAwesomeIcon="Icon";',
      '@fortawesome/free-solid-svg-icons': 'export const faChevronLeft=0,faChevronRight=0,faFilter=0,faRotateRight=0,faXmark=0;',
    };
    builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: modules[args.path] }));
  } }],
});
const { AdminDirectoryPagination } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node ?? '';
const fixture = values => ({ page: 1, pages: 6, pageSize: 25, total: 148, fetching: false, setParam() {}, ...values });

test('pagination keeps count, labelled page size and navigation as three independent layout groups', () => {
  const tree = AdminDirectoryPagination({ list: fixture() });
  assert.equal(tree.props.children.length, 3);
  assert.equal(text(tree.props.children[0]), '1–25 de 148');
  const select = nodes(tree).find(node => node.type === 'Select');
  assert.equal(select.props.label, 'Por página');
  assert.deepEqual(select.props.options.map(option => option.value), ['25', '50', '100']);
  const actions = nodes(tree).find(node => node.props.className === 'ad-page-actions');
  assert.equal(actions.props.children[1].props.children.join(''), '1 / 6');
});

test('page size and previous/next preserve existing callbacks after the layout change', () => {
  const calls = [];
  const tree = AdminDirectoryPagination({ list: fixture({ page: 2, setParam: (...args) => calls.push(args) }) });
  nodes(tree).find(node => node.type === 'Select').props.onChange('50');
  for (const button of nodes(tree).filter(node => node.type === 'button')) button.props.onClick();
  assert.deepEqual(calls, [['pageSize', '50'], ['page', '1'], ['page', '3']]);
});

test('empty, last and busy pages keep accurate counts and disabled navigation', () => {
  for (const [values, count, disabled] of [
    [{ total: 0, pages: 1 }, '0–0 de 0', [true, true]],
    [{ total: 48, page: 2, pages: 2 }, '26–48 de 48', [false, true]],
    [{ fetching: true, page: 2 }, '26–50 de 148', [true, true]],
  ]) {
    const tree = AdminDirectoryPagination({ list: fixture(values) });
    assert.equal(text(tree.props.children[0]), count);
    assert.deepEqual(nodes(tree).filter(node => node.type === 'button').map(node => node.props.disabled), disabled);
  }
});
