import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const jsx = "export const jsx=(type,props)=>({type,props});export const jsxs=jsx;";
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';

async function footer(revision, dev = false) {
  const result = await build({
    entryPoints: ['src/components/Footer.tsx'], bundle: true, write: false, format: 'esm', jsx: 'automatic',
    define: { __CTQ_BUILD_INFO__: JSON.stringify({ version: '0.0.3', revision }), 'import.meta.env.DEV': String(dev) },
    plugins: [{ name: 'footer-fixture', setup(builder) {
      builder.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: 'jsx', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: jsx, loader: 'js' }));
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'empty' }));
    } }],
  });
  const module = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  return module.default();
}

test('global footer renders club, current year and compiled version without extra links', async () => {
  const tree = await footer('59754d7');
  assert.equal(tree.type, 'footer');
  assert.ok(text(tree).includes(`Club de Tenis Quintero · ${new Date().getFullYear()}`));
  assert.ok(text(tree).includes('v0.0.3'));
  assert.ok(text(tree).includes('Compilación 59754d7'));
  assert.equal(nodes(tree).filter(node => node.type === 'a').length, 0);
  assert.equal(text(tree).includes('Local'), false);
});

test('missing build revision is visible and local mode does not masquerade as a release', async () => {
  assert.ok(text(await footer(null)).includes('Compilación sin identificador'));
  assert.ok(text(await footer('59754d7', true)).includes('Local'));
});

test('footer is mounted once outside routing and protected content boundaries', async () => {
  const source = await readFile('src/App.tsx', 'utf8');
  assert.equal(source.match(/<Footer\s*\/>/g)?.length, 1);
  assert.ok(source.indexOf('<Footer />') > source.indexOf('</Suspense>'));
  assert.match(source, /className="app-shell"/);
});

test('navigation keeps its flow space, safe area and sits below existing overlays', async () => {
  const css = await readFile('src/styles/Navigation.css', 'utf8');
  const rule = css.match(/\.ctq-nav\s*\{([^}]+)\}/)?.[1];
  assert.match(rule, /position:\s*sticky/);
  assert.match(rule, /top:\s*0/);
  assert.match(rule, /z-index:\s*990/);
  assert.match(rule, /safe-area-inset-top/);
});

test('page content does not grow to push the footer to the viewport bottom', async () => {
  const css = await readFile('src/index.css', 'utf8');
  const rule = css.match(/\.app-content-wrapper\s*\{([^}]+)\}/)?.[1];
  assert.match(rule, /flex:\s*0\s+0\s+auto/);
  assert.doesNotMatch(rule, /min-height/);
  const home = await readFile('src/styles/Home.css', 'utf8');
  assert.doesNotMatch(home.match(/\.home-page\s*\{([^}]+)\}/)?.[1] ?? '', /min-height/);
  assert.doesNotMatch(home, /min-height:\s*calc\(88vh\s*-\s*64px\)/);
});

test('Home keeps a small fixed breathing space before the footer without stretching the page', async () => {
  const css = await readFile('src/styles/Home.css', 'utf8');
  const rule = css.match(/\.home-page\s*\{([^}]+)\}/)?.[1];
  assert.match(rule, /padding-bottom:\s*24px/);
  assert.doesNotMatch(rule, /min-height/);
});
