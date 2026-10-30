import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/AdminReserves.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.fixture.invalid' }) },
  plugins: [{ name: 'active-reserves-fixture', setup(builder) {
    const modules = {
      react: `export default {}; export const useState=initial=>{const h=globalThis.__reserves,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return [h.states[i],next=>h.states[i]=typeof next==='function'?next(h.states[i]):next];};export const useRef=initial=>{const h=globalThis.__reserves,i=h.refCursor++;return h.refs[i]||={current:initial};};export const useCallback=fn=>fn;export const useEffect=effect=>{const h=globalThis.__reserves;if(!h.effect){h.effect=effect;h.pending.push(effect);}};`,
      'react/jsx-runtime': `export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`,
      axios: `export default {get:async url=>{const h=globalThis.__reserves;h.reads.push(url);return {data:h.rows};},delete:async(url,options)=>{const h=globalThis.__reserves;h.writes.push({url,options});if(h.defer)await h.defer;if(h.deleteError)throw h.deleteError;return {data:{}};}};`,
      sweetalert2: `export default {fire:async options=>{const h=globalThis.__reserves;h.dialogs.push(options);return {isConfirmed:h.confirmed};}};`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faTrash=0,faCalendarAlt=0;`,
      './AppLoader': `export default 'Loader';`,
      './LoadingSpinner': `export const LoadingSpinner='Spinner';`,
    };
    builder.onResolve({ filter: /.*/ }, args=>args.path in modules?{path:args.path,namespace:'fixture'}:undefined);
    builder.onLoad({ filter: /.*/, namespace:'fixture' }, args=>({loader:'js',contents:modules[args.path]}));
  }}],
});
const { default: AdminReserves } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const render=()=>{h.cursor=0;h.refCursor=0;h.tree=AdminReserves();};
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
const buttons=()=>nodes(h.tree).filter(n=>n.type==='button');
const flush=async()=>{await new Promise(setImmediate);render();};
const load=async()=>{h.pending.splice(0).forEach(run=>run());await flush();};
beforeEach(()=>{
  h={states:[],refs:[],pending:[],reads:[],writes:[],dialogs:[],confirmed:true,rows:[
    {idCourtReserve:'one',player1:'Socio Nombre Completo Apellido Compuesto',court:'Cancha 1',dateToPlay:'2026-10-29',turn:'08:15-10:00',state:true},
    {idCourtReserve:'two',player1:'Otro Socio Completo',court:'Cancha 2',dateToPlay:'2026-11-01',turn:'20:00-21:30',state:true},
  ]};globalThis.__reserves=h;globalThis.localStorage={getItem:()=> 'fixture-token'};render();
});
afterEach(()=>{delete globalThis.__reserves;delete globalThis.localStorage;});
test('table keeps full names, year, complete turn, labelled headers and unique actions',async()=>{
  await load();assert.equal(h.reads.length,1);assert.equal(h.writes.length,0);
  assert.ok(text(h.tree).includes(h.rows[0].player1));
  assert.ok(text(h.tree).includes('29-10-2026'));assert.ok(text(h.tree).includes('08:15-10:00'));
  assert.equal(nodes(h.tree).filter(n=>n.type==='th'&&n.props.scope==='col').length,5);
  assert.equal(new Set(buttons().map(n=>n.props['aria-label'])).size,2);
});
test('cancelling SweetAlert does not submit deletion or change rows',async()=>{
  await load();h.confirmed=false;await buttons()[0].props.onClick();await flush();
  assert.equal(h.writes.length,0);assert.equal(buttons().length,2);
  assert.equal(h.dialogs[0].focusCancel,true);
});
test('confirmed deletion preserves backend contract, removes only that row and inherits alert colors',async()=>{
  await load();await buttons()[0].props.onClick();await flush();
  assert.equal(h.writes[0].url,'https://api.fixture.invalid/court-reserve/one');
  assert.equal(h.writes[0].options.headers.Authorization,'Bearer fixture-token');
  assert.equal(buttons().length,1);assert.ok(text(h.tree).includes('Otro Socio Completo'));
  assert.ok(h.dialogs.every(dialog=>!('confirmButtonColor' in dialog)&&!('cancelButtonColor' in dialog)));
});
test('double clicks produce one delete and all actions stay disabled while sending',async()=>{
  await load();let resolve;h.defer=new Promise(done=>resolve=done);
  const first=buttons()[0].props.onClick();const second=buttons()[0].props.onClick();await flush();
  assert.equal(h.writes.length,1);assert.ok(buttons().every(n=>n.props.disabled));
  resolve();await first;await second;await flush();assert.equal(h.writes.length,1);
});
test('failed deletion keeps row and re-enables actions',async t=>{
  t.mock.method(console,'error',()=>{});await load();h.deleteError=new Error('Fixture failure');
  await buttons()[0].props.onClick();await flush();
  assert.equal(buttons().length,2);assert.ok(buttons().every(n=>!n.props.disabled));
  assert.equal(h.dialogs.at(-1).icon,'error');
});
test('empty reservations show an empty state rather than an empty table',async()=>{
  h.rows=[];await load();assert.ok(text(h.tree).includes('No hay reservas activas.'));
  assert.equal(nodes(h.tree).filter(n=>n.type==='table').length,0);assert.equal(h.writes.length,0);
});
