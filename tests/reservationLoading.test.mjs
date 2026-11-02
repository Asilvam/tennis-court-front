import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/Modal.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://fixture.example.invalid' }) },
  plugins: [{ name: 'reservation-loading-fixture', setup(builder) {
    const modules = {
      react: `export default {};export const useState=initial=>{const h=globalThis.__reserveLoading,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return[h.states[i],v=>h.states[i]=typeof v==='function'?v(h.states[i]):v];};export const useRef=initial=>{const h=globalThis.__reserveLoading,i=h.refCursor++;return h.refs[i]||={current:initial};};export const useEffect=()=>{};`,
      'react/jsx-runtime': `export const Fragment='Fragment';export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`,
      'react-router-dom': `export const useNavigate=()=>()=>{};`,
      axios: `export default {isAxiosError:()=>false};`,
      sweetalert2: `export default {fire:async o=>{globalThis.__reserveLoading.dialogs.push(o);return {};}};`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faCalendarCheck=0,faClock=0,faUser=0,faUsers=0,faMapMarkerAlt=0,faTimes=0,faTrophy=0;`,
      './AdaptiveSelect': `export const AdaptiveSelect='Select';`,
      './OptionPicker': `export const OptionPicker='Picker';`,
      './LoadingSpinner': `export const LoadingSpinner='Spinner';`,
      './useAuth': `export const useAuth=()=>({user:{canReserve:true}});`,
      '../hooks/useVisibleViewport': `export const useVisibleViewport=()=>null;`,
      '../hooks/usePaymentHold': `export const usePaymentHold=()=>({loading:false,hold:null,remainingSeconds:0,release:async()=>{const h=globalThis.__reserveLoading;h.releases++;await h.wait;if(h.error)throw h.error;}});`,
      '../utils/logger': `export default {};`,
      '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'fixture-token';`,
      '../utils/customStyles.ts': `export const customStyles={};`,
    };
    builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: modules[args.path], loader: 'js' }));
  } }],
});
const { default: Modal } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
let h;
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
const render = () => { h.cursor = 0; h.refCursor = 0; h.tree = Modal({ title: 'Reserva ficticia', isOpen: true, selectedTimeSlot: { courtId: '1', date: '2099-01-01', time: '08:15-10:00', player1: 'Fixture', isPayed: false }, playersNames: [], onClose: () => h.closed++, onReservationCreated: () => h.refreshed++ }); };
const button = className => nodes(h.tree).find(n => n.type === 'button' && n.props.className === className);
const flush = async () => { await new Promise(setImmediate); render(); };
beforeEach(() => { h = { states: [], refs: [], releases: 0, closed: 0, refreshed: 0, dialogs: [] }; globalThis.__reserveLoading = h; render(); });
afterEach(() => { delete globalThis.__reserveLoading; });

test('cancelling a reservation shows loading until its hold is released and prevents duplicate requests', async () => {
  let release; h.wait = new Promise(resolve => { release = resolve; });
  const click = button('btn-cancel').props.onClick;
  click(); click(); await flush();
  assert.equal(h.releases, 1);
  assert.equal(button('btn-cancel').props.disabled, true);
  assert.equal(button('btn-cancel').props['aria-busy'], true);
  assert.ok(nodes(button('btn-cancel')).some(n => n.type === 'Spinner'));
  assert.ok(nodes(button('close-button')).some(n => n.type === 'Spinner'));
  assert.ok(!nodes(h.tree).filter(n => n.type === 'button' && n.props.className?.includes('btn-confirm')).some(n => nodes(n).some(c => c.type === 'Spinner')));
  release(); await flush();
  assert.equal(h.closed, 1); assert.equal(h.refreshed, 1);
  assert.equal(button('btn-cancel').props.disabled, false);
});
test('failed hold release clears loading and leaves the reservation open for an explicit retry', async () => {
  h.error = new Error('Fixture failure');
  button('btn-cancel').props.onClick(); await flush();
  assert.equal(h.dialogs.at(-1).icon, 'warning');
  assert.equal(h.closed, 0);
  assert.equal(button('btn-cancel').props['aria-busy'], false);
  assert.ok(!nodes(button('btn-cancel')).some(n => n.type === 'Spinner'));
  h.error = null; button('btn-cancel').props.onClick(); await flush();
  assert.equal(h.releases, 2); assert.equal(h.closed, 1);
});
