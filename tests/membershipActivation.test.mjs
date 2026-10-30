import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const compile = async name => {
  const result = await build({ entryPoints: [fileURLToPath(new URL(`../src/components/${name}.tsx`, import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://backend.example.invalid' }) },
    plugins: [{ name: 'activation-test-adapters', setup(builder) {
      const modules = {
        react: `export const useState=initial=>{const h=globalThis.__activation,i=h.cursor++;if(!(i in h.states))h.states[i]=typeof initial==='function'?initial():initial;return [h.states[i],value=>h.states[i]=typeof value==='function'?value(h.states[i]):value];};export const useRef=initial=>{const h=globalThis.__activation,i=h.refCursor++;return h.refs[i]||={current:initial};};`,
        'react/jsx-runtime': `export const Fragment='Fragment';export const jsx=(type,props)=>({type,props});export const jsxs=jsx;`,
        axios: `export default {isAxiosError:error=>!!error?.response,get:async(url,options)=>{const h=globalThis.__activation;h.requests.push({url,options});return {data:h.history};},post:async(url,payload,options)=>{const h=globalThis.__activation;h.requests.push({url,payload,options});if(url.endsWith('/preview'))return {data:h.preview};if(h.recordError)throw h.recordError;if(h.defer)await h.defer;return {data:h.result};}};`,
        sweetalert2: `export default {fire:async options=>{const h=globalThis.__activation;h.dialogs.push(options);return {isConfirmed:options.icon==='question'?h.confirmed:true};}};`,
        '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
        '@fortawesome/free-solid-svg-icons': `export const faCheck=0,faClipboardCheck=0,faUserCheck=0;`,
        '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'fixture-token';`,
        './LoadingSpinner': `export const LoadingSpinner='Spinner';`,
        './MembershipBillingSelect': `export const MembershipBillingSelect='BillingSelect';`,
        '../hooks/useUnsavedCategoryChanges': `export const useUnsavedEditorChanges=()=>{};`,
      };
      builder.onResolve({filter:/.*/}, args=>args.path in modules?{path:args.path,namespace:'fixture'}:undefined);
      builder.onLoad({filter:/.*/,namespace:'fixture'}, args=>({loader:'js',contents:modules[args.path]+(args.path==='react'?'export const useEffect=()=>{};':'')}));
    }}],
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`))[name];
};
const Batch = await compile('MembershipBatchEnrollment'), History = await compile('MembershipHistoryReview');
let h;
const render = () => { h.cursor=0;h.refCursor=0;h.tree=(h.historyMode?History:Batch)({memberId:'one',...h.props,onSaved:()=>h.saved++,onBusyChange:value=>h.busy.push(value)}); };
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'?n:'';
const button=name=>nodes(h.tree).find(n=>n.type==='button'&&text(n).trim()===name);
const flush=async()=>{await new Promise(setImmediate);render();};
const click=async name=>{button(name).props.onClick();await flush();};
const reason=value=>{nodes(h.tree).find(n=>n.type==='input'&&n.props.maxLength===1000).props.onChange({target:{value}});render();};
const select=async()=>{await click('Habilitar socios');await click('Seleccionar pendientes');};
beforeEach(()=>{
  h={states:[],refs:[],requests:[],dialogs:[],busy:[],saved:0,confirmed:true,props:{currentPeriod:'2026-10'},
    preview:{startPeriod:'2026-10',throughPeriod:'2026-10',minimumStartPeriod:'2026-10',currentPeriod:'2026-10',items:[
      {memberId:'one',name:'Titular fixture',memberType:'Titular',status:'ELIGIBLE',reason:'Sin inicio',plan:{approvalHash:'a'.repeat(64),total:180,rows:[{period:'2026-10',amount:180}]}},
      {memberId:'two',name:'Carga fixture',memberType:'Carga',status:'ELIGIBLE',reason:'Sin inicio',plan:{approvalHash:'b'.repeat(64),total:50,rows:[{period:'2026-10',amount:50}]}},
      {memberId:'old',name:'Habilitado',memberType:'Titular',status:'ALREADY_ENABLED',reason:'Se conserva'},
      {memberId:'inactive',name:'Inactivo',memberType:'Titular',status:'REVIEW_REQUIRED',reason:'Cuenta inactiva'},
    ]},
    result:{counts:{enrolled:2,skipped:0,reviewRequired:0,errors:0},results:[]},
    history:{memberId:'one',name:'Piloto',startPeriod:'2026-10',approvalHash:'c'.repeat(64),dues:[{}],payments:[{}]},
  };globalThis.__activation=h;render();
});
afterEach(()=>{delete globalThis.__activation;});
test('opening the batch only previews; already enabled and inactive members are not selectable',async()=>{
  assert.equal(h.requests.length,0);await click('Habilitar socios');
  assert.equal(h.requests.length,1);assert.ok(h.requests[0].url.endsWith('/preview'));
  const boxes=nodes(h.tree).filter(n=>n.type==='input'&&n.props.type==='checkbox');
  assert.deepEqual(boxes.map(n=>n.props.disabled),[false,false,true,true]);
  await click('Seleccionar pendientes');
  assert.equal(nodes(h.tree).filter(n=>n.type==='input'&&n.props.checked).length,2);
  assert.ok(text(h.tree).includes('$230'));
});
test('family preview sends only its explicit family ID and month',async()=>{
  h.props.familyMemberId='titular-id';render();await click('Habilitar titular y cargas');
  assert.deepEqual(h.requests[0].payload,{startPeriod:'2026-10',throughPeriod:'2026-10',familyMemberId:'titular-id'});
});
test('confirmation submits reviewed selected IDs without prices, payments or activation flags',async()=>{
  await select();const b=button('Confirmar habilitación');b.props.onClick();b.props.onClick();await flush();
  assert.equal(h.requests.length,2);assert.equal(h.saved,1);
  assert.deepEqual(h.requests[1].payload,{startPeriod:'2026-10',throughPeriod:'2026-10',items:[
    {memberId:'one',approvalHash:'a'.repeat(64)},{memberId:'two',approvalHash:'b'.repeat(64)}]});
  assert.ok(h.requests[1].options.headers['Idempotency-Key']);
});
test('ordinary family enrollment needs confirmation but not a reason',async()=>{
  await select();assert.equal(nodes(h.tree).find(n=>n.props?.maxLength===1000),undefined);
  h.confirmed=false;await click('Confirmar habilitación');assert.equal(h.requests.length,1);
});
test('uncertain responses lock the reviewed payload and retry with exactly the same identity',async()=>{
  await select();h.recordError=new Error('timeout');await click('Confirmar habilitación');
  const first=h.requests[1];assert.ok(button('Reintentar mismo lote'));
  assert.ok(nodes(h.tree).find(n=>n.type==='BillingSelect').props.disabled);
  assert.equal(button('Cerrar').props.disabled,true);
  h.recordError=null;await click('Reintentar mismo lote');
  assert.deepEqual(h.requests[2].payload,first.payload);
  assert.equal(h.requests[2].options.headers['Idempotency-Key'],first.options.headers['Idempotency-Key']);
});
test('changing month clears old selection and requires another review',async()=>{
  await select();nodes(h.tree).find(n=>n.type==='BillingSelect'&&n.props.label==='Hasta el mes').props.onChange('2027-01');render();
  assert.equal(button('Confirmar habilitación'),undefined);assert.ok(button('Revisar socios'));
});
test('large selections are split into stable small requests for Heroku',async()=>{
  h.preview.items=Array.from({length:23},(_,i)=>({...h.preview.items[0],memberId:String(i).padStart(2,'0')}));
  h.result.counts.enrolled=0;await select();await click('Confirmar habilitación');
  const writes=h.requests.filter(r=>!r.url.endsWith('/preview'));
  assert.deepEqual(writes.map(r=>r.payload.items.length),[10,10,3]);
  assert.equal(new Set(writes.map(r=>r.options.headers['Idempotency-Key'])).size,3);
});
test('history review is read only until approved and never submits a new start or payment',async()=>{
  h.historyMode=true;h.states=[];h.refs=[];render();await click('Revisar vigencia');
  assert.equal(h.requests.length,1);assert.ok(h.requests[0].url.endsWith('/billing-history/preview'));
  reason('Vigencia antigua revisada');await click('Aprobar vigencia');
  assert.deepEqual(h.requests[1].payload,{approvalHash:'c'.repeat(64),reason:'Vigencia antigua revisada'});
  assert.equal(h.saved,1);assert.ok(h.dialogs.find(d=>d.icon==='question').text.includes('No se generan ni archivan cuotas'));
});
test('history cancellation makes no write and stale reviews cannot be applied twice',async()=>{
  h.historyMode=true;h.states=[];h.refs=[];render();await click('Revisar vigencia');reason('Revision valida');
  h.confirmed=false;await click('Aprobar vigencia');assert.equal(h.requests.length,1);
  h.confirmed=true;h.recordError={response:{status:409,data:{message:'Historial cambio'}}};
  await click('Aprobar vigencia');assert.ok(button('Revisar vigencia'));assert.equal(h.saved,0);
});
