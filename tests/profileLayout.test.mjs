import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/components/PlayerProfile.tsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.fixture.invalid' }) },
  plugins: [{ name: 'profile-layout-fixture', setup(builder) {
    const modules = {
      react: `export default {}; export const useState=initial=>{const h=globalThis.__profileLayout,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return [h.states[i],next=>h.states[i]=typeof next==='function'?next(h.states[i]):next];};export const useEffect=effect=>{const h=globalThis.__profileLayout;if(!h.effect){h.effect=effect;h.pending.push(effect);}};`,
      'react/jsx-runtime': `export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='Fragment';`,
      axios: `export default {get:async url=>{const h=globalThis.__profileLayout;h.requests.push(url);return {data:url.includes('/register/profile/')?h.profile:url.endsWith('/ranking')?h.ranking:h.history};}};`,
      sweetalert2: `export default {fire:()=>{throw Error('Unexpected dialog');}};`,
      '@fortawesome/react-fontawesome': `export const FontAwesomeIcon='Icon';`,
      '@fortawesome/free-solid-svg-icons': `export const faPenToSquare=0,faTrophy=0,faRankingStar=0,faStar=0,faUser=0,faUserGroup=0,faCheckCircle=0,faTimesCircle=0,faCalendarAlt=0;`,
      '../utils/logger.ts': `export default {error:()=>{}};`,
      '../utils/userUtils.ts': `export const getUserInfoFromLocalStorage=()=>({email:'fixture@example.invalid'});`,
      '../utils/tokenUtils': `export const getTokenFromLocalStorage=()=> 'fixture-token';`,
      '../utils/profileImage': `export const updateProfileImage=()=>{throw Error('Unexpected upload');};`,
      './AppLoader': `export default 'Loader';`,
      './LoadingSpinner': `export const LoadingSpinner='Spinner';`,
    };
    builder.onResolve({ filter: /.*/ }, args=>args.path in modules?{path:args.path,namespace:'fixture'}:undefined);
    builder.onLoad({ filter: /.*/, namespace:'fixture' }, args=>({loader:'js',contents:modules[args.path]}));
  }}],
});
const { default: Profile } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const render=()=>{h.cursor=0;h.tree=Profile();};
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const find=predicate=>nodes(h.tree).find(predicate);
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
const load=async()=>{h.pending.splice(0).forEach(run=>run());await new Promise(setImmediate);render();};
beforeEach(()=>{
  h={states:[],cursor:0,pending:[],requests:[],focused:[],profile:{namePlayer:'Socio Nombre Completo Apellido Compuesto',email:'fixture@example.invalid',imageUrlProfile:'/images/avatar-fantasma.png'},ranking:{Tercera:[{id:'fixture@example.invalid',puntos:1635,rank:13}],Dobles:[{id:'fixture@example.invalid',puntos:500,rank:2}]},history:[{id:'one',fecha:'2026-10-29',rival:'Rival Nombre Completo',score:'6:4, 7:6',ganador:true,isDouble:false},{id:'two',fecha:'2026-10-28',rival:'Rival Dobles Completo',score:'6:2, 6:4',ganador:false,isDouble:true}]};
  globalThis.__profileLayout=h;globalThis.document={getElementById:id=>({focus:()=>h.focused.push(id)})};render();
});
afterEach(()=>{delete globalThis.__profileLayout;delete globalThis.document;});
test('profile layout preserves complete names and only reads the existing three endpoints',async()=>{
  await load();assert.equal(h.requests.length,3);
  assert.equal(text(find(n=>n.type==='h1')),h.profile.namePlayer);
  assert.ok(text(h.tree).includes('Rival Nombre Completo'));
  assert.equal(find(n=>n.props?.className==='profile-mode-content').props.role,'tabpanel');
});
test('Singles/Dobles preserves filtering of categories, matches and statistics',async()=>{
  await load();assert.ok(text(h.tree).includes('Tercera'));
  find(n=>n.props?.id==='profile-tab-doubles').props.onClick();render();
  assert.equal(find(n=>n.props?.id==='profile-tab-doubles').props['aria-selected'],true);
  assert.equal(find(n=>n.props?.id==='profile-tab-singles').props.tabIndex,-1);
  assert.ok(text(h.tree).includes('Rival Dobles Completo'));
  assert.equal(text(h.tree).includes('Rival Nombre Completo'),false);
  assert.equal(h.requests.length,3);
});
test('mode keyboard navigation updates focus, selection and panel label',async()=>{
  await load();let prevented=false;
  find(n=>n.props?.id==='profile-tab-singles').props.onKeyDown({key:'ArrowRight',preventDefault:()=>prevented=true});render();
  assert.ok(prevented);assert.deepEqual(h.focused,['profile-tab-doubles']);
  assert.equal(find(n=>n.props?.role==='tabpanel').props['aria-labelledby'],'profile-tab-doubles');
  find(n=>n.props?.id==='profile-tab-doubles').props.onKeyDown({key:'Home',preventDefault(){}});render();
  assert.equal(find(n=>n.props?.id==='profile-tab-singles').props['aria-selected'],true);
});
test('empty profile keeps zero statistics and both empty sections',async()=>{
  h.ranking={};h.history=[];delete h.profile.imageUrlProfile;await load();
  assert.ok(text(h.tree).includes('Sin categorías en este modo.'));
  assert.ok(text(h.tree).includes('Sin partidos registrados.'));
  assert.equal(find(n=>n.props?.className==='winrate-container'),undefined);
  assert.deepEqual(nodes(h.tree).filter(n=>n.props?.className?.startsWith('stat-number')).map(text),['0','0','0']);
  assert.equal(find(n=>n.type==='img').props.src,'/images/avatar-fantasma.png');
});
test('doubles-only membership still opens in doubles by default',async()=>{
  delete h.ranking.Tercera;await load();
  assert.equal(find(n=>n.props?.id==='profile-tab-doubles').props['aria-selected'],true);
  assert.ok(text(h.tree).includes('Categorías Dobles'));
});
