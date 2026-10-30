import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/components/Ranking.tsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env':JSON.stringify({VITE_API_URL:'https://api.fixture.invalid'})},plugins:[{name:'ranking-fixture',setup(builder){
  const modules={
    react:`export default {};export const useState=initial=>{const h=globalThis.__rankingLayout,i=h.cursor++;if(!(i in h.states))h.states[i]=initial;return[h.states[i],value=>h.states[i]=typeof value==='function'?value(h.states[i]):value];};export const useEffect=fn=>{const h=globalThis.__rankingLayout;if(!h.effect){h.effect=fn;h.pending.push(fn);}};`,
    'react/jsx-runtime':`export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='Fragment';`,
    axios:`export default {get:async url=>{const h=globalThis.__rankingLayout;h.reads.push(url);if(h.error)throw h.error;return{data:h.data};}};`,
    '@fortawesome/react-fontawesome':`export const FontAwesomeIcon='Icon';`,
    '@fortawesome/free-solid-svg-icons':`export const faTrophy=0,faChevronDown=0,faChevronUp=0;`,
    '../utils/logger':`export default {error:()=>{globalThis.__rankingLayout.logged=true;}};`,
    './AppLoader':`export default 'Loader';`,
  };
  builder.onResolve({filter:/.*/},args=>args.path in modules?{path:args.path,namespace:'fixture'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:modules[args.path]}));
}}]});
const {default:Ranking}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let h;
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
const find=fn=>nodes(h.tree).find(fn);
const render=()=>{h.cursor=0;h.tree=Ranking();};
const load=async()=>{h.pending.splice(0).forEach(fn=>fn());await new Promise(setImmediate);render();};
const categories=()=>nodes(h.tree).filter(n=>n.type==='button');
const players=[{id:'first',nombre:'Socio Nombre Completo Apellido Compuesto',puntos:1234567,rank:1,categoria:'1'},{id:'eighth',nombre:'Nombre'.repeat(20),puntos:500,rank:8,categoria:'1'},{id:'ninth',nombre:'Otro Socio Completo',puntos:0,rank:9,categoria:'1'}];
beforeEach(()=>{h={states:[],cursor:0,pending:[],reads:[],data:{Honor:[players[0]],'2':[players[2]],'1':players,Dobles:[players[1]],Menores:players}};globalThis.__rankingLayout=h;render();});
afterEach(()=>{delete globalThis.__rankingLayout;});
test('ranking keeps one existing GET, numeric category order and exclusion of Menores',async()=>{
  await load();assert.deepEqual(h.reads,['https://api.fixture.invalid/match-ranking/ranking']);assert.deepEqual(nodes(h.tree).filter(n=>n.props?.className==='category-name').map(text),['1','2','Dobles','Honor']);assert.equal(text(find(n=>n.props?.id==='ranking-category-title')),'1');
});
test('category controls are native buttons with expanded state and panel association',async()=>{
  await load();assert.ok(categories().every(n=>n.props.type==='button'&&n.props['aria-controls']==='ranking-category-panel'));assert.deepEqual(categories().map(n=>n.props['aria-expanded']),[true,false,false,false]);categories()[1].props.onClick();render();assert.equal(find(n=>n.type==='table').props['aria-label'],'Ranking de 2');assert.equal(h.reads.length,1);
});
test('category repeat closes without another request; row clicks are not a category trigger',async()=>{
  await load();assert.equal(find(n=>n.props?.className?.startsWith('player-row')).props.onClick,undefined);categories()[0].props.onClick();render();assert.equal(find(n=>n.type==='table'),undefined);assert.ok(text(h.tree).includes('Sin categoría seleccionada'));assert.equal(h.reads.length,1);
});
test('ranking preserves backend player order, complete names, points and Masters rank boundary',async()=>{
  await load();assert.deepEqual(nodes(h.tree).filter(n=>n.props?.className==='player-name').map(text),players.map(p=>p.nombre));assert.deepEqual(nodes(h.tree).filter(n=>n.props?.className==='points-value').map(text),['1.234.567','500','0']);assert.equal(nodes(h.tree).filter(n=>n.props?.className==='master-badge').length,2);assert.equal(nodes(h.tree).filter(n=>n.type==='th'&&n.props.scope==='row').length,3);
});
test('empty ranking has no fake players or API writes',async()=>{
  h.data={};await load();assert.equal(categories().length,0);assert.equal(find(n=>n.type==='table'),undefined);assert.ok(text(h.tree).includes('No hay categorías disponibles.'));assert.equal(h.reads.length,1);
});
test('empty category keeps its name with an explicit empty state',async()=>{
  h.data={'1':[]};await load();assert.equal(text(find(n=>n.props?.id==='ranking-category-title')),'1');assert.ok(text(h.tree).includes('Sin jugadores en esta categoría.'));
});
test('failed ranking has an accessible dark-theme error state, not a light glass card',async()=>{
  h.error=new Error('Fixture failure');await load();assert.equal(find(n=>n.type==='main').props.className,'ranking-wrapper');assert.ok(find(n=>n.props?.role==='alert'));assert.equal(h.logged,true);
});
test('avatar fallback is decorative and cannot retry its own failing fallback indefinitely',async()=>{
  await load();const image=find(n=>n.type==='img');assert.equal(image.props.alt,'');assert.equal(image.props.src,'/images/avatar-fantasma.png');let writes=0,src='https://fixture.invalid/broken.png';const target={get src(){return src;},set src(value){src=value;writes++;}};image.props.onError({currentTarget:target});image.props.onError({currentTarget:target});assert.equal(writes,1);assert.equal(src,'/images/avatar-fantasma.png');
});
