import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';

async function compile(file) {
  const result=await build({entryPoints:[fileURLToPath(new URL(`../src/components/${file}.tsx`,import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env':JSON.stringify({VITE_API_URL:'https://api.fixture.invalid'})},plugins:[{name:'view-fixture',setup(builder){
    const modules={
      react:`export default {};export const useState=initial=>{const h=globalThis.__views,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return[h.states[i],value=>h.states[i]=typeof value==='function'?value(h.states[i]):value];};export const useRef=initial=>{const h=globalThis.__views,i=h.refCursor++;return h.refs[i]||={current:initial};};export const useCallback=fn=>fn;export const useEffect=fn=>{const h=globalThis.__views;if(!h.effectSeen){h.effectSeen=true;h.effects.push(fn);}};`,
      'react/jsx-runtime':`export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='Fragment';`,
      'react-router-dom':`export const Link='Link';`,
      axios:`export default {isAxiosError:error=>!!error?.response,get:async(url,config)=>{const h=globalThis.__views;h.reads.push({url,config});if(h.readError)throw h.readError;return{data:h.rows};},delete:async(url,config)=>{const h=globalThis.__views;h.writes.push({method:'DELETE',url,config});if(h.sendWait)await h.sendWait;if(h.error)throw h.error;h.rows=h.rows.map(row=>({...row,state:false}));return{status:200};},post:async(url,payload,config)=>{const h=globalThis.__views;h.writes.push({method:'POST',url,payload,config});if(h.sendWait)await h.sendWait;if(h.error)throw h.error;return{status:200};}};`,
      sweetalert2:`export default {fire:options=>{const h=globalThis.__views;h.dialogs.push(options);return options.showCancelButton&&h.confirmWait?h.confirmWait:Promise.resolve({isConfirmed:options.showCancelButton?h.confirmed:true});}};`,
      '@fortawesome/react-fontawesome':`export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons':`export const faTrash=0,faEye=0;`,
      '../utils/userUtils':`export const getUserInfoFromLocalStorage=()=>({name:'Socio Nombre Completo'});`,
      '../utils/tokenUtils':`export const getTokenFromLocalStorage=()=> 'fixture-token';`,
      './AppLoader':`export default 'Loader';`,
      './LoadingSpinner':`export const LoadingSpinner='Spinner';`,
    };
    builder.onResolve({filter:/.*/},args=>args.path in modules?{path:args.path,namespace:'fixture'}:undefined);
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:modules[args.path]}));
  }}]});return (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).default;
}
const History=await compile('MyHistoryReserve'),Recovery=await compile('ResetPassword');
let h,component,props;
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
const find=predicate=>nodes(h.tree).find(predicate);
const render=()=>{h.cursor=0;h.refCursor=0;h.tree=component(props);};
const flush=async()=>{await new Promise(setImmediate);render();};
const load=async()=>{h.effects.splice(0).forEach(fn=>fn());await flush();};
const useRecovery=(admin=true)=>{component=Recovery;props={adminRequest:admin};h.states=[];h.refs=[];render();};
const email=value=>{find(n=>n.props?.id==='email-input').props.onChange({target:{value}});render();};
const submit=()=>find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
const deletes=()=>nodes(h.tree).filter(n=>n.props?.className==='history-btn history-delete-btn');
beforeEach(()=>{
  h={states:[],refs:[],cursor:0,refCursor:0,effects:[],reads:[],writes:[],dialogs:[],confirmed:true,rows:[{idCourtReserve:'fixture',court:'Cancha 3',player1:'Socio Nombre Completo',player2:'<img src=x onerror=attack()> Rival Nombre Completo',dateToPlay:DateTime.now().plus({days:2}).toISODate(),turn:'20:15-22:00',state:true,isForRanking:true}]};globalThis.__views=h;component=History;props={};render();
});
afterEach(()=>{delete globalThis.__views;});
test('history reads the existing authenticated endpoint and renders full turn/year with labelled columns',async()=>{
  await load();assert.equal(h.reads.length,1);assert.equal(h.reads[0].url,'https://api.fixture.invalid/court-reserve/history/Socio Nombre Completo');assert.equal(h.reads[0].config.headers.Authorization,'Bearer fixture-token');
  assert.equal(text(find(n=>n.type==='h1')),'Mi historial de reservas');assert.equal(text(find(n=>n.props?.className==='history-turn')),'20:15-22:00');
  assert.equal(nodes(h.tree).filter(n=>n.type==='th'&&n.props.scope==='col').length,5);assert.ok(text(find(n=>n.type==='time')).endsWith(h.rows[0].dateToPlay.slice(0,4)));
});
test('history detail is plain text with full names and CTQ inherited alert colors',async()=>{
  await load();find(n=>n.props?.className==='history-btn history-view-btn').props.onClick();assert.ok(h.dialogs[0].text.includes(h.rows[0].player2));assert.ok(h.dialogs[0].text.includes('20:15-22:00'));assert.ok(!('html'in h.dialogs[0])&&!('confirmButtonColor'in h.dialogs[0]));
});
test('past and canceled history rows retain the existing deletion restriction',async()=>{
  h.rows.push({...h.rows[0],idCourtReserve:'old',dateToPlay:DateTime.now().minus({days:2}).toISODate()},{...h.rows[0],idCourtReserve:'canceled',state:false});await load();assert.deepEqual(deletes().map(n=>n.props.disabled),[false,true,true]);
});
test('canceling history confirmation does not delete or refetch',async()=>{
  await load();h.confirmed=false;deletes()[0].props.onClick();await flush();assert.equal(h.writes.length,0);assert.equal(h.reads.length,1);assert.equal(deletes()[0].props.disabled,false);
});
test('history confirmed deletion keeps API and Bearer, then refreshes state',async()=>{
  await load();deletes()[0].props.onClick();await flush();assert.equal(h.writes[0].url,'https://api.fixture.invalid/court-reserve/fixture');assert.equal(h.writes[0].config.headers.Authorization,'Bearer fixture-token');assert.equal(h.reads.length,2);assert.ok(text(h.tree).includes('Cancelada'));
});
test('history double clicks share confirmation and one in-flight request',async()=>{
  await load();let confirm,send;h.confirmWait=new Promise(resolve=>confirm=resolve);h.sendWait=new Promise(resolve=>send=resolve);const action=deletes()[0].props.onClick;action();action();await flush();assert.equal(h.dialogs.length,1);assert.ok(deletes()[0].props.disabled);confirm({isConfirmed:true});await flush();action();assert.equal(h.writes.length,1);send();await flush();
});
test('history failure preserves data and releases the deletion guard',async()=>{
  await load();h.error=new Error('Fixture network failure');deletes()[0].props.onClick();await flush();assert.equal(h.rows[0].state,true);assert.equal(h.dialogs.at(-1).icon,'error');assert.equal(deletes()[0].props.disabled,false);assert.equal(h.reads.length,1);
});
test('empty history keeps zero counters without an empty table',async()=>{
  h.rows=[];await load();assert.equal(find(n=>n.type==='table'),undefined);assert.equal(text(find(n=>n.type==='h2')),'No tienes reservas');assert.deepEqual(nodes(h.tree).filter(n=>n.type==='dd').map(text),['0','0']);
});
test('admin recovery normalizes email and preserves the protected endpoint and notice',async()=>{
  useRecovery();email('  Member@Test.cl  ');await submit();await flush();assert.equal(h.writes[0].url,'https://api.fixture.invalid/register/admin/resetpass');assert.deepEqual(h.writes[0].payload,{email:'member@test.cl'});assert.equal(h.writes[0].config.headers.Authorization,'Bearer fixture-token');assert.equal(find(n=>n.props?.id==='email-input').props.value,'');assert.ok(!('confirmButtonColor'in h.dialogs[0]));
});
test('public recovery retains its unauthenticated endpoint and login link',async()=>{
  useRecovery(false);email('member@test.cl');await submit();await flush();assert.equal(h.writes[0].url,'https://api.fixture.invalid/register/password-recovery');assert.equal(h.writes[0].config,undefined);assert.equal(find(n=>n.type==='Link').props.to,'/login');assert.ok(text(h.tree).includes('una solicitud cada 24 horas'));
});
test('recovery double submission sends once and disables input while pending',async()=>{
  useRecovery();email('member@test.cl');let send;h.sendWait=new Promise(resolve=>send=resolve);const action=find(n=>n.type==='form').props.onSubmit;const a=action({preventDefault(){}});await action({preventDefault(){}});await flush();assert.equal(h.writes.length,1);assert.equal(find(n=>n.props?.id==='email-input').props.disabled,true);send();await a;await flush();assert.equal(find(n=>n.props?.id==='email-input').props.disabled,false);
});
test('recovery error retains email and allows retry, invalid email never sends',async()=>{
  useRecovery();email('invalid');await submit();await flush();assert.equal(h.writes.length,0);assert.equal(h.dialogs.at(-1).icon,'error');email('member@test.cl');h.error=new Error('Fixture failure');await submit();await flush();assert.equal(find(n=>n.props?.id==='email-input').props.value,'member@test.cl');h.error=null;await submit();assert.equal(h.writes.length,2);
});
test('401 recovery errors are handled by the global auth boundary, not competing alerts',async()=>{
  useRecovery();email('member@test.cl');h.error={response:{status:401}};await submit();await flush();assert.equal(h.dialogs.length,0);assert.equal(find(n=>n.props?.id==='email-input').props.disabled,false);
});
