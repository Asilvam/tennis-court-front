import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/MultipleBookingForm.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.fixture.invalid' }) },
  plugins: [{ name: 'multibooking-fixture', setup(builder) {
    const modules = {
      react: `export default {};export const forwardRef=render=>props=>render(props,null);export const useState=initial=>{const h=globalThis.__multi,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return [h.states[i],value=>h.states[i]=typeof value==='function'?value(h.states[i]):value];};export const useRef=initial=>{const h=globalThis.__multi,i=h.refCursor++;return h.refs[i]||={current:initial};};export const useEffect=()=>{};`,
      'react/jsx-runtime': `export const jsx=(type,props)=>typeof type==='function'?type(props):({type,props});export const jsxs=jsx;export const Fragment='Fragment';`,
      'react-dom': `export const createPortal=node=>node;`,
      'react-router-dom': `export const useNavigate=()=>path=>globalThis.__multi.navigation.push(path);`,
      'react-datepicker': `export default 'DatePicker';`,
      '@floating-ui/react': `export const shift=options=>({name:'shift',options});`,
      axios: `export default {isAxiosError:error=>!!error?.response,post:async(url,payload,options)=>{const h=globalThis.__multi;h.writes.push({url,payload,options});if(h.networkWait)await h.networkWait;if(h.error)throw h.error;return {data:{}};}};`,
      sweetalert2: `export default {fire:options=>{const h=globalThis.__multi;h.dialogs.push(options);return options.icon==='question'&&h.confirmWait?h.confirmWait:Promise.resolve({isConfirmed:options.icon==='question'?h.confirmed:true});}};`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faCalendarAlt=0,faTimes=0;`,
      './LoadingSpinner': `export const LoadingSpinner='Spinner';`,
      './useAuth.ts': `export const useAuth=()=>globalThis.__multi.auth;`,
      './AdaptiveSelect': `export const AdaptiveSelect='AdaptiveSelect';`,
      './OptionPicker': `export const OptionPicker='OptionPicker';`,
      '../hooks/useVisibleViewport': `export const useVisibleViewport=()=>({width:1440,height:1000,top:0,left:0});`,
      '../hooks/useUnsavedCategoryChanges': `export const useUnsavedEditorChanges=(dirty,saving)=>globalThis.__multi.guard={dirty,saving};`,
    };
    builder.onResolve({filter:/.*/},args=>args.path in modules?{path:args.path,namespace:'fixture'}:undefined);
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:modules[args.path]+(args.path==='react'?'export const useCallback=fn=>fn;':'')}));
  }}],
});
const { default: Multi } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const render=()=>{h.cursor=0;h.refCursor=0;h.tree=Multi();};
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
const find=predicate=>nodes(h.tree).find(predicate);
const button=name=>find(n=>n.type==='button'&&text(n).trim()===name);
const check=label=>{find(n=>n.type==='label'&&text(n)===label).props.children[0].props.onChange();render();};
const calendar=()=>find(n=>n.type==='DatePicker');
const future=count=>Array.from({length:count},(_,i)=>DateTime.now().plus({days:i+1}).startOf('day').toJSDate());
const chooseDates=dates=>{calendar().props.onChange(dates);render();};
const motive=(value='Campeonato')=>{find(n=>n.type==='AdaptiveSelect').props.onChange({value});render();};
const flush=async()=>{await new Promise(setImmediate);render();};
const prepare=()=>{check('Cancha 1');chooseDates(future(1));check('08:15-10:00');motive();};
beforeEach(()=>{h={states:[],refs:[],writes:[],dialogs:[],navigation:[],confirmed:true,auth:{token:'fixture-token',user:{role:'admin',name:'Admin fixture'}}};globalThis.__multi=h;render();});
afterEach(()=>{delete globalThis.__multi;});

test('initial form has native checkboxes, accessible dates and no implicit requests',()=>{
  assert.equal(h.writes.length,0);
  assert.equal(nodes(h.tree).filter(n=>n.type==='input'&&n.props.type==='checkbox').length,12);
  assert.equal(calendar().props.locale.code,'es');assert.equal(calendar().props.selectsMultiple,true);
  assert.equal(calendar().props.customInput.type,'button');
  assert.equal(calendar().props.customInput.props.type,'button');
  assert.deepEqual(calendar().props.popperModifiers[0],{name:'shift',options:{padding:8,crossAxis:true}});
});
test('required fields show SweetAlert and never submit incomplete selections',async()=>{
  await button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Sin canchas');
  check('Cancha 1');await button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Sin fechas');
  chooseDates(future(1));await button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Sin turnos');
  check('08:15-10:00');await button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Sin motivo');
  assert.equal(h.writes.length,0);
});
test('dates are sorted, deduplicated and synchronized with the calendar',()=>{
  const dates=future(3);chooseDates([dates[2],dates[0],dates[2]]);
  assert.deepEqual(calendar().props.selectedDates.map(date=>DateTime.fromJSDate(date).toISODate()),[dates[0],dates[2]].map(date=>DateTime.fromJSDate(date).toISODate()));
  assert.equal(nodes(h.tree).filter(n=>n.props?.className==='mbf-chip').length,2);
});
test('past dates and more than ten dates do not alter the accepted selection',()=>{
  chooseDates(future(1));chooseDates([DateTime.now().minus({days:1}).toJSDate()]);
  assert.equal(h.dialogs.at(-1).title,'Fecha inválida');assert.equal(calendar().props.selectedDates.length,1);
  chooseDates(future(11));assert.equal(h.dialogs.at(-1).title,'Límite alcanzado');assert.equal(calendar().props.selectedDates.length,1);
});
test('summary uses the Cartesian total and all-turn selection can be cleared',()=>{
  check('Cancha 1');check('Cancha 2');chooseDates(future(2));check('Todos los turnos');
  assert.equal(text(find(n=>n.props?.className==='mbf-summary-total')),'Reservas32');
  check('Todos los turnos');assert.equal(text(find(n=>n.props?.className==='mbf-summary-total')),'Reservas0');
});
test('reviewing confirmation makes no request and preserves selections',async()=>{
  prepare();h.confirmed=false;button('Reservar').props.onClick();await flush();
  assert.equal(h.writes.length,0);assert.equal(calendar().props.selectedDates.length,1);
  assert.equal(h.dialogs[0].cancelButtonText,'Revisar');assert.equal(h.dialogs[0].focusCancel,true);
});
test('confirmed request preserves the API contract, token and exact reviewed detail',async()=>{
  prepare();find(n=>n.props?.id==='motive-detail').props.onChange({target:{value:'  Final CTQ  '}});render();
  button('Reservar').props.onClick();await flush();
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].url,'https://api.fixture.invalid/booking/multiple');
  assert.deepEqual(Object.keys(h.writes[0].payload).sort(),['courts','dates','motive','turns']);
  assert.equal(h.writes[0].payload.motive,'Campeonato - Final CTQ');
  assert.equal(h.writes[0].options.headers.Authorization,'Bearer fixture-token');
  assert.equal(calendar().props.selectedDates.length,0);
  assert.ok(h.dialogs.every(dialog=>!('confirmButtonColor' in dialog)));
});
test('double clicks are blocked during confirmation and sending, with frozen form data',async()=>{
  prepare();let confirm,send;h.confirmWait=new Promise(resolve=>confirm=resolve);h.networkWait=new Promise(resolve=>send=resolve);
  const submit=button('Reservar').props.onClick;submit();submit();await flush();
  assert.equal(h.dialogs.filter(d=>d.icon==='question').length,1);assert.equal(h.writes.length,0);
  assert.equal(find(n=>n.type==='fieldset').props.disabled,true);assert.equal(h.guard.saving,true);
  confirm({isConfirmed:true});await flush();assert.equal(h.writes.length,1);
  button('Reservando...').props.onClick();await flush();assert.equal(h.writes.length,1);
  assert.equal(button('Cancelar').props.disabled,true);send();await flush();assert.equal(h.guard.saving,false);
});
test('network errors preserve the draft and warn against an unverified retry',async()=>{
  prepare();h.error=new Error('Fixture timeout');button('Reservar').props.onClick();await flush();
  assert.equal(calendar().props.selectedDates.length,1);assert.equal(h.dialogs.at(-1).icon,'error');
  assert.ok(h.dialogs.at(-1).text.includes('Revisa las reservas antes de volver a enviar'));
  assert.equal(button('Reservar').props.disabled,false);
});
test('100 reservations is allowed but more than 100 never reaches confirmation or API',async()=>{
  check('Cancha 1');check('Cancha 2');chooseDates(future(10));
  for(const turn of ['08:15-10:00','10:15-12:00','12:15-14:00','14:15-16:00','16:15-18:00'])check(turn);
  motive();h.confirmed=false;button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).icon,'question');
  check('18:15-20:00');button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Demasiadas reservas');assert.equal(h.writes.length,0);
});
test('professor keeps a fixed motive using the complete account name',async()=>{
  h.auth.user={role:'profesor',name:'  Profesor Nombre Completo Apellido Compuesto  '};render();
  check('Cancha 1');chooseDates(future(1));check('08:15-10:00');
  assert.equal(find(n=>n.type==='AdaptiveSelect').props.isDisabled,true);
  button('Reservar').props.onClick();await flush();assert.equal(h.writes[0].payload.motive,'Clases - Profesor Nombre Completo Apellido Compuesto');
});
test('missing session and unnamed professor cannot submit',async()=>{
  prepare();h.auth.token='';render();button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Sesión inválida');
  h.auth.token='fixture-token';h.auth.user={role:'profesor',name:''};render();button('Reservar').props.onClick();await flush();assert.equal(h.dialogs.at(-1).title,'Profesor sin nombre');assert.equal(h.writes.length,0);
});
