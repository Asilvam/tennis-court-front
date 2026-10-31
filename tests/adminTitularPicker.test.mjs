import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
    entryPoints: [fileURLToPath(new URL('../src/components/AdminRegister.tsx', import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.fixture.invalid' }) },
    plugins: [{ name: 'titular-fixture', setup(builder) {
        const modules = {
            react: `export default {};export const useState=initial=>{const h=globalThis.__titular,i=h.cursor++;if(!(i in h.states))h.states[i]=typeof initial==='function'?initial():initial;return[h.states[i],v=>h.states[i]=typeof v==='function'?v(h.states[i]):v];};export const useRef=initial=>{const h=globalThis.__titular,i=h.refCursor++;return h.refs[i]||={current:initial};};export const useEffect=fn=>globalThis.__titular.effects.push(fn);export const useMemo=fn=>fn();export const useCallback=fn=>fn;`,
            'react/jsx-runtime': `export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='Fragment';`,
            'react-router-dom': `export const useNavigate=()=>()=>{};export const useLocation=()=>({state:null});export const useSearchParams=()=>[new URLSearchParams(),()=>{}];`,
            axios: `export default {get:async()=>({data:globalThis.__titular.rows}),isAxiosError:()=>false,patch:async(url,body,config)=>{const h=globalThis.__titular;h.writes.push({url,body,config});if(h.wait)await h.wait;return{status:200};}};`,
            sweetalert2: `export default {fire:(...args)=>{globalThis.__titular.alerts.push(args);return Promise.resolve({isConfirmed:true});}};`,
            'react-select': `export default 'Select';`,
            '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
            '@fortawesome/free-solid-svg-icons': `export const faClipboardCheck=0,faEdit=0,faKey=0,faLayerGroup=0,faMagnifyingGlass=0,faMoneyBillTransfer=0,faTimes=0,faUsersGear=0;`,
            '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'fixture-token';`,
            '../hooks/useVisibleViewport': `export const useVisibleViewport=()=>({width:390,height:380,top:40,left:0});`,
            './AdaptiveSelect': `export const AdaptiveSelect='AdaptiveSelect';`,
            './OptionPicker': `export const OptionPicker='OptionPicker';`,
            './AppLoader': `export default 'AppLoader';`,
            './LoadingSpinner': `export const LoadingSpinner='LoadingSpinner';`,
        };
        builder.onResolve({ filter: /.*/ }, args => args.path in modules ? { path: args.path, namespace: 'fixture' } : undefined);
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: modules[args.path] }));
    } }],
});
const { default: Admin } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const find = predicate => nodes(h.tree).find(predicate);
const render = () => { h.cursor = 0; h.refCursor = 0; h.tree = Admin(); };
const selector = () => find(node => node.type === 'AdaptiveSelect');
const picker = () => find(node => node.type === 'OptionPicker');
const flush = async () => { await new Promise(setImmediate); render(); };
const edit = () => { find(node => node.props?.['aria-label'] === 'Editar a Carga fixture').props.onClick({ currentTarget: {} }); render(); };
beforeEach(async () => {
    const base = { cellular: '+56912345678', role: 'user', statePlayer: true, updatePayment: true };
    h = { states: [], refs: [], cursor: 0, refCursor: 0, effects: [], writes: [], alerts: [], rows: [
        { ...base, _id: 'carga', email: 'carga@example.invalid', namePlayer: 'Carga fixture', partnerType: 'Carga', titularId: 'titular-a' },
        { ...base, _id: 'titular-a', email: 'a@example.invalid', namePlayer: 'Ana Fixture', partnerType: 'Titular' },
        { ...base, _id: 'titular-b', email: 'b@example.invalid', namePlayer: 'Beto Fixture', partnerType: 'Titular' },
    ] };
    globalThis.__titular = h;
    globalThis.document = { body: {} };
    globalThis.requestAnimationFrame = () => 0;
    render(); h.effects.splice(0).forEach(fn => fn()); await flush(); edit();
});
afterEach(() => { delete globalThis.__titular; delete globalThis.requestAnimationFrame; delete globalThis.document; });

test('uses the existing adaptive control and preserves titular eligibility and full labels', () => {
    assert.equal(selector().props.label, 'Titular asociado');
    assert.equal(selector().props.value.value, 'titular-a');
    assert.deepEqual(selector().props.options.map(row => row.value), ['titular-a', 'titular-b']);
    assert.ok(selector().props.options.every(row => row.label.includes('@example.invalid')));
});
test('opens the picker with the typed query and visible viewport, without saving', () => {
    selector().props.onOpenPicker('Beto'); render();
    assert.equal(picker().props.initialQuery, 'Beto');
    assert.equal(find(node => node.props?.role === 'dialog').props['aria-label'], 'Titular asociado');
    assert.equal(find(node => node.type === 'form'), undefined);
    assert.deepEqual(find(node => node.props?.className === 'edit-modal-backdrop').props.style, { top: 40, left: 0, width: 390, height: 380 });
    assert.equal(h.writes.length, 0);
});
test('canceling picker keeps the association and other draft changes', () => {
    find(node => node.props?.id === 'namePlayer').props.onChange({ target: { name: 'namePlayer', value: 'Draft name' } }); render();
    selector().props.onOpenPicker(''); render(); picker().props.onCancel(); render();
    assert.equal(selector().props.value.value, 'titular-a');
    assert.equal(find(node => node.props?.id === 'namePlayer').props.value, 'Draft name');
    assert.equal(h.writes.length, 0);
});
test('selection only updates draft and explicit save preserves the protected PATCH contract', async () => {
    selector().props.onOpenPicker(''); render();
    picker().props.onSelect({ value: 'titular-b', label: 'Beto Fixture' }); render();
    assert.equal(selector().props.value.value, 'titular-b');
    assert.equal(h.writes.length, 0);
    await find(node => node.props?.className?.includes('admin-modal-btn-submit')).props.onClick(); await flush();
    assert.deepEqual(h.writes, [{ url: 'https://api.fixture.invalid/register/admin/carga%40example.invalid', body: { partnerType: 'Carga', titularId: 'titular-b' }, config: { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-token' } } }]);
});
test('clearing a titular retains the existing required association validation', async () => {
    find(node => node.props?.['aria-label'] === 'Quitar titular asociado').props.onClick(); render();
    assert.equal(selector().props.value, null);
    await find(node => node.props?.className?.includes('admin-modal-btn-submit')).props.onClick(); await flush();
    assert.equal(h.writes.length, 0);
    assert.ok(JSON.stringify(h.alerts).includes('Selecciona el titular'));
});
test('closing the editor discards the picker state before the next member edit', () => {
    selector().props.onOpenPicker('old query'); render();
    picker().props.onCancel(); render();
    find(node => node.props?.className?.includes('admin-modal-btn-cancel')).props.onClick(); render(); edit();
    assert.equal(picker(), undefined);
    selector().props.onOpenPicker(''); render();
    assert.equal(picker().props.initialQuery, '');
});
test('in-flight save disables association controls and clear command', async () => {
    selector().props.onChange({ value: 'titular-b' }); render();
    let finish; h.wait = new Promise(resolve => { finish = resolve; });
    const pending = find(node => node.props?.className?.includes('admin-modal-btn-submit')).props.onClick(); render();
    assert.equal(selector().props.isDisabled, true);
    assert.equal(find(node => node.props?.['aria-label'] === 'Quitar titular asociado').props.disabled, true);
    finish(); await pending;
});
