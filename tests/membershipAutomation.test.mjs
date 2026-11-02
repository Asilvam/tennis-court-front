import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/MembershipAutomationSettings.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.ctq-fixture.invalid' }) },
  plugins: [{ name: 'automation-adapters', setup(builder) {
    const modules = {
      react: `export const useState=initial=>{const h=globalThis.__automation,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return [h.states[i],v=>{h.states[i]=typeof v==='function'?v(h.states[i]):v;}];};export const useRef=initial=>{const h=globalThis.__automation,i=h.refCursor++;return h.refs[i] ||= {current:initial};};export const useCallback=fn=>fn;export const useEffect=fn=>{const h=globalThis.__automation;if(!h.started)h.effects.push(fn);};`,
      'react/jsx-runtime': `export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`,
      axios: `export default {isCancel:e=>e?.cancelled,isAxiosError:e=>!!e?.response,get:async(url,options)=>{const h=globalThis.__automation;h.gets.push({url,options});if(h.getError)throw h.getError;return {data:{...h.server}};},post:async(url,payload,options)=>{const h=globalThis.__automation;h.posts.push({url,payload,options});if(!h.postError||h.commitOnError){h.server={...h.server,[payload.setting==='generation'?'generationEnabled':'autoBlockEnabled']:payload.enabled,revision:'b'.repeat(64)};}if(h.postError)throw h.postError;return {data:{...h.server}};}};`,
      sweetalert2: `export default {fire:async options=>{const h=globalThis.__automation;h.dialogs.push(options);return {isConfirmed:h.confirmed};}};`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faRotateRight=0;`,
      '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'fixture-token';`,
    };
    builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents: modules[args.path] }));
  } }],
});
const { MembershipAutomationSettings } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const render = () => { h.cursor = 0; h.refCursor = 0; h.tree = MembershipAutomationSettings(); };
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const control = setting => nodes(h.tree).find(node => node.type === 'input' && node.props['aria-label'] === (setting === 'generation' ? 'Generación recurrente de cuotas' : 'Bloqueo de reservas por mora'));
const flush = async () => { await new Promise(setImmediate); render(); };
const mount = async () => { for (const effect of h.effects) h.cleanups.push(effect()); h.started = true; await flush(); };
const change = async (setting, enabled) => { control(setting).props.onChange({ target: { checked: enabled } }); await flush(); };
beforeEach(() => {
  h = { states: [], refs: [], effects: [], cleanups: [], gets: [], posts: [], dialogs: [], confirmed: true,
    server: { generationEnabled: true, autoBlockEnabled: false, terminationEnabled: true, migrationReviewed: true, revision: 'a'.repeat(64) } };
  globalThis.__automation = h; render();
});
afterEach(() => { for (const cleanup of h.cleanups) cleanup?.(); delete globalThis.__automation; });

test('initial render disables controls until a read-only authenticated fetch completes', async () => {
  assert.equal(control('generation').props.disabled, true);
  await mount();
  assert.equal(h.gets.length, 1); assert.equal(h.posts.length, 0);
  assert.equal(h.gets[0].options.headers.Authorization, 'Bearer fixture-token');
  assert.equal(control('generation').props.checked, true);
  assert.equal(control('autoBlock').props.checked, false);
  assert.equal(control('autoBlock').props.disabled, false);
});
test('cancelling SweetAlert changes neither persisted settings nor the switch', async () => {
  await mount(); h.confirmed = false;
  await change('generation', false);
  assert.equal(h.posts.length, 0); assert.equal(control('generation').props.checked, true);
  assert.equal(h.dialogs[0].focusCancel, true);
  assert.match(h.dialogs[0].text, /bajo demanda/);
});
test('confirms a single explicit flag with server revision, never review or termination', async () => {
  await mount(); await change('autoBlock', true);
  assert.deepEqual(h.posts[0].payload, { setting: 'autoBlock', enabled: true, revision: 'a'.repeat(64) });
  assert.equal(control('autoBlock').props.checked, true);
  assert.equal(control('generation').props.checked, true);
  assert.equal(h.server.terminationEnabled, true);
  assert.match(h.dialogs[0].text, /Podrán iniciar sesión/);
  assert.equal(h.dialogs.at(-1).icon, 'success');
});
test('rapid repeated clicks do not create duplicate confirmation dialogs or writes', async () => {
  await mount(); const input = control('generation');
  input.props.onChange({ target: { checked: false } });
  input.props.onChange({ target: { checked: false } });
  await flush(); assert.equal(h.posts.length, 1);
  assert.equal(h.dialogs.filter(row => row.icon === 'warning').length, 1);
});
test('stale revision causes a re-read and error, without a silent retry', async () => {
  await mount(); h.postError = { response: { status: 409, data: { message: 'La configuracion cambio.' } } };
  h.server.generationEnabled = false;
  await change('autoBlock', true);
  assert.equal(h.posts.length, 1); assert.equal(h.gets.length, 2);
  assert.equal(control('generation').props.checked, false);
  assert.equal(control('autoBlock').props.checked, false);
  assert.equal(h.dialogs.at(-1).text, 'La configuracion cambio.');
});
test('a lost save response re-reads the actual committed state and never repeats the change', async () => {
  await mount(); h.postError = new Error('timeout'); h.commitOnError = true;
  await change('generation', false);
  assert.equal(control('generation').props.checked, false);
  assert.equal(h.posts.length, 1); assert.equal(h.gets.length, 2);
  assert.equal(h.dialogs.at(-1).icon, 'error');
});
test('unavailable settings remain disabled rather than assuming everything is off', async () => {
  h.getError = new Error('offline'); await mount();
  assert.equal(control('generation').props.disabled, true);
  assert.equal(control('autoBlock').props.disabled, true);
  assert.equal(h.posts.length, 0);
});
test('pending migration permits requesting activation and preserves server rejection', async () => {
  h.server.generationEnabled = false;
  h.server.migrationReviewed = false; await mount();
  assert.equal(control('generation').props.disabled, false);
  assert.equal(control('autoBlock').props.disabled, false);
  h.postError = { response: { status: 409, data: { message: 'Revisa la migracion antes de activar automatismos.' } } };
  await change('generation', true);
  assert.deepEqual(h.posts[0].payload, { setting: 'generation', enabled: true, revision: 'a'.repeat(64) });
  assert.equal(control('generation').props.checked, false);
  assert.equal(control('generation').props.disabled, false);
  assert.equal(control('autoBlock').props.checked, false);
  assert.equal(h.dialogs.at(-1).text, 'Revisa la migracion antes de activar automatismos.');
  assert.equal(h.gets.length, 2);
});
test('generation can be enabled independently of automatic blocking', async () => {
  h.server.generationEnabled = false; await mount();
  await change('generation', true);
  assert.equal(control('generation').props.checked, true);
  assert.equal(control('autoBlock').props.checked, false);
  assert.equal(h.posts.length, 1);
});
test('unmounting during confirmation prevents a global write', async () => {
  await mount(); control('generation').props.onChange({ target: { checked: false } });
  for (const cleanup of h.cleanups) cleanup?.();
  await flush(); assert.equal(h.posts.length, 0);
});
test('automation controls are scoped to the global admin, not a member or payment editor', async () => {
  const source = await readFile(new URL('../src/components/AdminMembershipPayments.tsx', import.meta.url), 'utf8');
  assert.match(source, /!memberId && !context && <MembershipAutomationSettings/);
});
