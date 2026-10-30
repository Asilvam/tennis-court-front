import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/MembershipEnrollment.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://backend.example.invalid' }) },
  plugins: [{ name: 'enrollment-test-adapters', setup(builder) {
    const modules = {
      react: `export const useState = initial => { const h=globalThis.__enrollment, i=h.cursor++; if(!(i in h.states)) h.states[i]=typeof initial==='function'?initial():initial; return [h.states[i], value=>{h.states[i]=typeof value==='function'?value(h.states[i]):value;}]; }; export const useRef=initial=>{const h=globalThis.__enrollment,i=h.refCursor++;return h.refs[i] ||= {current:initial};};`,
      'react/jsx-runtime': `export const Fragment='Fragment'; export const jsx=(type,props)=>({type,props}); export const jsxs=jsx;`,
      axios: `export default { isAxiosError:error=>!!error?.response, post:async(url,payload,options)=>{const h=globalThis.__enrollment;h.requests.push({url,payload,options});if(url.endsWith('/preview'))return {data:h.preview};if(h.recordError)throw h.recordError;return {data:{duplicate:false}};} };`,
      sweetalert2: `export default {fire:async options=>{const h=globalThis.__enrollment;h.dialogs.push(options);return {isConfirmed:options.icon==='question'?h.confirmed:true};}};`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faCheck=0,faClipboardCheck=0;`,
      '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'isolated-token';`,
      './LoadingSpinner': `export const LoadingSpinner='Spinner';`,
      './MembershipBillingSelect': `export const MembershipBillingSelect='BillingSelect';`,
      '../hooks/useUnsavedCategoryChanges': `export const useUnsavedEditorChanges=()=>{};`,
    };
    builder.onResolve({filter:/.*/},args=>args.path in modules?{path:args.path,namespace:'test'}:undefined);
    builder.onLoad({filter:/.*/,namespace:'test'},args=>({loader:'js',contents:modules[args.path]+(args.path==='react'?'export const useEffect=()=>{};':'')}));
  }}],
});
const { MembershipEnrollment } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const render=()=>{h.cursor=0;h.refCursor=0;h.tree=MembershipEnrollment({context:h.context,onSaved:()=>{h.saved++;}});};
const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];
const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):typeof node==='string'?node:'';
const button=name=>nodes(h.tree).find(node=>node.type==='button'&&text(node).trim()===name);
const flush=async()=>{await new Promise(setImmediate);render();};
const click=async name=>{button(name).props.onClick();await flush();};
const reason=value=>{nodes(h.tree).find(node=>node.type==='input'&&node.props.maxLength===1000).props.onChange({target:{value}});render();};
const review=async()=>{await click('Generar cuotas');await click('Revisar cuotas');};
const month=label=>nodes(h.tree).find(node=>node.type==='BillingSelect'&&node.props.label===label);
beforeEach(()=>{
  h={states:[],refs:[],requests:[],dialogs:[],saved:0,confirmed:true,
    context:{memberId:'member',members:[{id:'member',name:'Usuario test 1',active:true,enrolled:false}],dues:[],billing:{minimumStartPeriod:'2026-10',currentPeriod:'2026-10'}},
    preview:{memberId:'member',name:'Usuario test 1',startPeriod:'2026-10',throughPeriod:'2026-10',approvalHash:'a'.repeat(64),total:180,rows:[{period:'2026-10',amount:180,pricingMode:'TEST'}]},
  };
  globalThis.__enrollment=h;render();
});
afterEach(()=>{delete globalThis.__enrollment;});
test('active members can generate; inactive enrolled members cannot',()=>{
  assert.equal(button('Generar cuotas').props.disabled,false);
  h.context.members[0].active=false;render();
  assert.equal(button('Generar cuotas').props.disabled,true);
  h.context.members[0].enrolled=true;render();
  assert.equal(h.tree,null);
  assert.equal(h.requests.length,0);
});
test('review sends the explicit range without a reason or payment',async()=>{
  await review();
  assert.equal(h.requests.length,1);
  assert.ok(h.requests[0].url.endsWith('/enrollment/preview'));
  assert.deepEqual(h.requests[0].payload,{startPeriod:'2026-10',throughPeriod:'2026-10'});
  assert.equal(h.saved,0);
  assert.ok(text(h.tree).includes('$180'));
});
test('changing the start invalidates the old preview',async()=>{
  await review();
  month('Hasta el mes').props.onChange('2027-01');render();
  assert.equal(button('Confirmar generación'),undefined);
  assert.ok(button('Revisar cuotas'));
});
test('normal generation has no reason input and cancellation makes no writes',async()=>{
  await review();
  assert.equal(nodes(h.tree).find(node=>node.props?.maxLength===1000),undefined);
  h.confirmed=false;
  await click('Confirmar generación');
  assert.equal(h.requests.length,1);
  assert.equal(h.saved,0);
});
test('confirmed enrollment sends the server fingerprint and an idempotency key only once',async()=>{
  await review();
  const confirm=button('Confirmar generación');
  confirm.props.onClick();confirm.props.onClick();await flush();
  assert.equal(h.requests.length,2);
  assert.deepEqual(h.requests[1].payload,{startPeriod:'2026-10',throughPeriod:'2026-10',approvalHash:'a'.repeat(64)});
  assert.ok(h.requests[1].options.headers['Idempotency-Key']);
  assert.equal(h.saved,1);
  assert.ok(h.dialogs.at(-1).text.includes('No se ha registrado ningún pago'));
});
test('an uncertain response preserves the same approval and idempotency on retry',async()=>{
  await review();h.recordError=new Error('timeout');
  await click('Confirmar generación');
  const first=h.requests[1];
  assert.equal(month('Hasta el mes').props.disabled,true);
  assert.equal(button('Cancelar').props.disabled,true);
  h.recordError=null;
  await click('Reintentar generación');
  assert.equal(h.requests[2].options.headers['Idempotency-Key'],first.options.headers['Idempotency-Key']);
  assert.deepEqual(h.requests[2].payload,first.payload);
  assert.equal(h.saved,1);
});
test('a stale preview conflict requires review again instead of silently approving new prices',async()=>{
  await review();h.recordError={response:{status:409,data:{message:'Las tarifas cambiaron'}}};
  await click('Confirmar generación');
  assert.equal(button('Confirmar generación'),undefined);
  assert.ok(button('Revisar cuotas'));
  assert.equal(h.saved,0);
});
test('a terminated member uses reenrollment, with only the current month and no debt prerequisite',async()=>{
  Object.assign(h.context.members[0],{active:false,enrolled:true,canReenroll:true});
  h.context.billing.currentPeriod='2027-03';h.states=[];h.refs=[];render();
  assert.equal(button('Reinscribir socio').props.disabled,false);
  await click('Reinscribir socio');reason('Nueva vigencia aprobada');
  const selected=month('Desde el mes');
  assert.equal(selected.props.disabled,true);
  assert.equal(selected.props.value,'2027-03');
  assert.equal(month('Hasta el mes'),undefined);
  h.preview={...h.preview,startPeriod:'2027-03',throughPeriod:'2027-03'};
  await click('Revisar cuotas');
  assert.ok(h.requests[0].url.endsWith('/reenrollment/preview'));
  await click('Confirmar reinscripción');
  assert.ok(h.requests[1].url.endsWith('/reenrollment'));
  assert.ok(h.dialogs.find(dialog=>dialog.icon==='question').text.includes('histórico no exigible, sin bloquear reservas'));
  assert.equal(h.saved,1);
});
test('four selected months are reviewed and confirmed as four without hidden reasons',async()=>{
  await click('Generar cuotas');
  assert.deepEqual(month('Hasta el mes').props.options.map(row=>row.value),['2026-10','2026-11','2026-12','2027-01']);
  month('Hasta el mes').props.onChange('2027-01');render();
  h.preview={...h.preview,throughPeriod:'2027-01',total:720,rows:['2026-10','2026-11','2026-12','2027-01'].map(period=>({period,amount:180,pricingMode:'TEST'}))};
  await click('Revisar cuotas');await click('Confirmar generación');
  assert.equal(h.requests[1].payload.throughPeriod,'2027-01');
  assert.ok(h.dialogs.find(dialog=>dialog.icon==='question').text.includes('4 cuota(s) nuevas'));
});
test('already enrolled preview distinguishes existing paid rows and creates only new rows',async()=>{
  h.context.members[0].enrolled=true;render();
  h.preview={...h.preview,rows:undefined,newRows:[],existingRows:[{period:'2026-10',amount:180,status:'PAID'}],total:0};
  await review();
  assert.ok(h.requests[0].url.endsWith('/dues/preview'));
  assert.deepEqual(h.requests[0].payload,{throughPeriod:'2026-10'});
  assert.ok(text(h.tree).includes('sin cambios'));
  assert.ok(text(h.tree).includes('Pagado'));
  await click('Confirmar generación');
  assert.ok(h.requests[1].url.endsWith('/dues'));
  assert.deepEqual(h.requests[1].payload,{throughPeriod:'2026-10',approvalHash:'a'.repeat(64)});
});
test('reenrollment still requires a reason',async()=>{
  Object.assign(h.context.members[0],{active:false,enrolled:true,canReenroll:true});render();
  await click('Reinscribir socio');await click('Revisar cuotas');
  await click('Confirmar reinscripción');
  assert.equal(h.requests.length,1);assert.equal(h.dialogs.at(-1).icon,'warning');
});
test('ordinary inactive accounts cannot use reenrollment',()=>{
  Object.assign(h.context.members[0],{active:false,enrolled:true,canReenroll:false});render();
  assert.equal(h.tree,null);assert.equal(h.requests.length,0);
});
test('reenrollment cancellation leaves the inactive member and history unchanged',async()=>{
  Object.assign(h.context.members[0],{active:false,enrolled:true,canReenroll:true});render();
  await click('Reinscribir socio');reason('Nueva vigencia aprobada');await click('Revisar cuotas');
  h.confirmed=false;await click('Confirmar reinscripción');
  assert.equal(h.requests.length,1);assert.equal(h.context.members[0].active,false);assert.equal(h.saved,0);
});
