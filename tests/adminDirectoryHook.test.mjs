import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';

const modules = {
  react: `const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  export const useState=initial=>{const h=globalThis.__directory,i=h.si++;if(!(i in h.states))h.states[i]=typeof initial==='function'?initial():initial;return[h.states[i],v=>{const next=typeof v==='function'?v(h.states[i]):v;if(!Object.is(next,h.states[i])){h.states[i]=next;h.dirty=true;}}];};
  export const useRef=initial=>{const h=globalThis.__directory,i=h.ri++;return h.refs[i]||={current:initial};};
  export const useMemo=(fn,deps)=>{const h=globalThis.__directory,i=h.mi++;if(!same(h.memos[i]?.deps,deps))h.memos[i]={deps,value:fn()};return h.memos[i].value;};
  export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
  export const useEffect=(fn,deps)=>{const h=globalThis.__directory,i=h.ei++;if(!same(h.effects[i]?.deps,deps))h.pending.push(()=>{h.effects[i]?.cleanup?.();h.effects[i]={deps,cleanup:fn()};});};`,
  'react-router-dom': `export const useSearchParams=()=>[globalThis.__directory.params,globalThis.__directory.setParams];`,
  axios: `export default {get:(url,options)=>new Promise((resolve,reject)=>globalThis.__directory.requests.push({url,options,resolve,reject})),isCancel:e=>e?.code==='ERR_CANCELED',isAxiosError:e=>!!e?.response};`,
  sweetalert2: `export default {fire:async options=>globalThis.__directory.alerts.push(options)};`,
  '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'fixture';`,
};
const compiled = await build({ entryPoints: ['src/hooks/useAdminDirectory.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('https://fixture.invalid') }, plugins: [{ name: 'directory-fixture', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: modules[args.path] }));
  } }] });
const { useAdminDirectory } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const defaults = { state: '', memberType: '', access: '' };
let h, value;
function render() {
  let count = 0;
  do {
    assert(count++ < 25, 'Hook must settle'); h.dirty = false; h.si = h.ri = h.mi = h.ei = 0;
    value = useAdminDirectory('members', defaults);
    h.pending.splice(0).forEach(run => run());
  } while (h.dirty);
}
const flush = async () => { await new Promise(setImmediate); render(); };
const finish = async (request, items = [], page = 1) => { request.resolve({ data: { items, page, pages: 3, pageSize: 25, total: 60 } }); await flush(); };
beforeEach(() => {
  h = { states: [], refs: [], memos: [], effects: [], pending: [], requests: [], alerts: [], params: new URLSearchParams(), dirty: false };
  h.setParams = next => { h.params = typeof next === 'function' ? next(h.params) : new URLSearchParams(next); h.dirty = true; };
  globalThis.__directory = h;
  globalThis.window = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: timer => clearTimeout(timer) };
  render();
});
afterEach(() => { h.effects.forEach(effect => effect?.cleanup?.()); delete globalThis.__directory; delete globalThis.window; });

test('initial request is authenticated and limits page size rather than fetching the public roster', async () => {
  assert.equal(h.requests[0].url, 'https://fixture.invalid/admin-directory/members');
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer fixture');
  assert.deepEqual(h.requests[0].options.params, { page: '1', pageSize: '25' });
  await finish(h.requests[0], [{ namePlayer: 'Fixture' }]);
  assert.equal(value.loading, false); assert.equal(value.items[0].namePlayer, 'Fixture');
});
test('search waits 300ms, resets the page and preserves other filters', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  await finish(h.requests[0]); value.setParam('state', 'active'); render(); await finish(h.requests.at(-1));
  value.setParam('page', '2'); render(); await finish(h.requests.at(-1), [], 2);
  value.updateSearchTerm('  Jose  '); render(); const before = h.requests.length;
  context.mock.timers.tick(299); render(); assert.equal(h.requests.length, before);
  context.mock.timers.tick(1); render();
  assert.deepEqual(h.requests.at(-1).options.params, { page: '1', pageSize: '25', search: 'Jose', state: 'active' });
});
test('late responses and aborted requests cannot replace a newer filter result', async () => {
  const first = h.requests[0]; value.setParam('memberType', 'Carga'); render(); const latest = h.requests.at(-1);
  assert.equal(first.options.signal.aborted, true);
  await finish(latest, [{ namePlayer: 'Latest' }]); await finish(first, [{ namePlayer: 'Stale' }]);
  assert.equal(value.items[0].namePlayer, 'Latest'); assert.equal(h.alerts.length, 0);
});
test('server clamps an obsolete page and URL tracks the returned page', async () => {
  await finish(h.requests[0]); value.setParam('page', '3'); render();
  await finish(h.requests.at(-1), [], 1);
  assert.equal(h.params.get('page'), null);
  assert.equal(h.requests.at(-1).options.params.page, '1');
});
test('unmount invalidates a manual refresh and suppresses its late errors', async () => {
  await finish(h.requests[0]); const pending = value.refresh();
  h.effects.forEach(effect => effect?.cleanup?.());
  h.requests.at(-1).reject(new Error('Late fixture failure')); await pending;
  assert.equal(h.alerts.length, 0);
});
