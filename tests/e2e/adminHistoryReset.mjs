import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [buildArg, outputArg, playwrightArg, widthArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node tests/e2e/adminHistoryReset.mjs BUILD OUTPUT PLAYWRIGHT_MODULE [WIDTH]');
const dist = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const email = 'fixture@example.invalid', name = 'Socio Nombre Completo Apellido Compuesto';
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role: 'admin', email, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'isolated-signature'].join('.');
const users = ['Socio Nombre Completo Apellido Compuesto', 'Nombre'.repeat(18), 'Socio inactivo', 'Socio con pago pendiente'].map((namePlayer,i) => ({ _id: String(i+1).padStart(24,'0'),namePlayer,email: i === 1 ? `${'nombre'.repeat(16)}@example.invalid` : `socio${i}@example.invalid`,cellular:'+56912345678',role:'user',partnerType:i===1?'Carga':'Titular',titularId:i===1?'1'.padStart(24,'0'):null,statePlayer:i!==2,updatePayment:i!==3,emailVerified:true }));
const future = new Date(Date.now()+86400000*3).toISOString().slice(0,10);
const past = new Date(Date.now()-86400000*3).toISOString().slice(0,10);
const reservation = { idCourtReserve:'fixture-future',court:'Cancha 3',player1:name,player2:'<img src=x onerror="window.injected=true"> Rival Nombre Completo',player3:'Partner Tres Nombre Completo',player4:'Partner Cuatro Nombre Completo',dateToPlay:future,turn:'20:15-22:00',state:true,isForRanking:true,visitName:'Visita de prueba' };
const rankingPlayers=Array.from({length:10},(_,i)=>({id:`ranking-${i}`,nombre:i===1?'Nombre'.repeat(18):`${name} ${i+1}`,puntos:1234567-i*100,rank:i+1,categoria:'1',imageUrlProfile:i===2?'/images/broken-fixture.png':undefined}));
const rankingData={'2':rankingPlayers.slice(0,2),'1':rankingPlayers,Dobles:rankingPlayers.slice(0,3),Honor:rankingPlayers.slice(0,4),Damas:rankingPlayers.slice(0,5),'+55':rankingPlayers.slice(0,2),Menores:rankingPlayers};
const sizes = widthArg ? [[Number(widthArg),1000]] : [[320,760],[390,844],[768,1024],[820,1180],[1024,768],[1440,1000]];
const report={executedAt:new Date().toISOString(),scope:'Actual React build, fixture APIs only; no real email, member or reservation writes',passed:[],views:[],sourceHashes:{},captures:[]};
const check=(condition,message)=>{assert(condition,message);report.passed.push(message);};
const contrastSamples = element => {
  const rgba = value => { const n=value.match(/[\d.]+/g).map(Number);return [n[0],n[1],n[2],n[3]??1]; };
  const blend = (front,back) => front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3]));
  const luminance = rgb => rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const sample = node => {
    const ancestors=[];for(let parent=node;parent;parent=parent.parentElement)ancestors.unshift(parent);
    let background=[7,21,42];for(const parent of ancestors)background=blend(rgba(getComputedStyle(parent).backgroundColor),background);
    const color=rgba(getComputedStyle(node).color),foreground=blend(color,background),a=luminance(foreground),b=luminance(background);
    return {text:node.textContent.trim(),color:getComputedStyle(node).color,ownBackground:getComputedStyle(node).backgroundColor,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  };
  if(element.matches('a'))return [sample(element)];
  return [...element.querySelectorAll('.admin-user-name,.admin-user-email,.admin-user-type,.admin-user-status,button:not(:disabled)')].filter(node=>node.getClientRects().length).map(sample);
};
let browser,page;
try {
  await mkdir(output,{recursive:true});
  for(const file of ['src/index.css','src/components/Navigation.tsx','src/styles/Navigation.css','src/components/AdminRegister.tsx','src/styles/AdminUsersLayout.css','src/components/MyHistoryReserve.tsx','src/styles/MyHistoryReserve.css','src/components/ResetPassword.tsx','src/styles/ResetPassword.css','src/components/Ranking.tsx','src/styles/Ranking.css'])report.sourceHashes[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');
  const css=await readFile(resolve(root,'node_modules/materialize-css/dist/css/materialize.min.css'));
  const js=await readFile(resolve(root,'node_modules/materialize-css/dist/js/materialize.min.js'));
  for(const engine of ['chromium','webkit']){
    browser=await ({chromium,webkit}[engine]).launch(engine==='chromium'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}:{headless:true});
    for(const [width,height]of sizes){
      const label=`${engine}/${width}x${height}`;
      const context=await browser.newContext({viewport:{width,height},locale:'es-CL',timezoneId:'America/Santiago',...(width<=820?{hasTouch:true}:{})});
      await context.addInitScript(({token,email,name})=>{localStorage.setItem('token',token);localStorage.setItem('userInfo',JSON.stringify({role:'admin',email,name}));},{token,email,name});
      page=await context.newPage();const errors=[],unexpected=[],writes=[];
      let rows=[reservation,{...reservation,idCourtReserve:'fixture-past',dateToPlay:past,state:false}],mode='hold',release,rankingReads=0;
      page.on('pageerror',error=>errors.push(error.message));
      await context.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.origin===api){
          const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'Authorization,Content-Type','access-control-allow-methods':'GET,POST,DELETE,OPTIONS'};
          if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
          const respond=(json,status=200)=>route.fulfill({headers,status,json});
          if(url.pathname.endsWith('/me/access'))return respond({role:'admin',name,financiallyRestricted:false});
          if(url.pathname==='/register'&&request.method()==='GET')return respond(users);
          if(url.pathname==='/match-ranking/ranking'&&request.method()==='GET'){rankingReads++;return respond(rankingData);}
          if(url.pathname.startsWith('/court-reserve/history/'))return respond(rows);
          if(request.method()==='DELETE'&&url.pathname==='/court-reserve/fixture-future'){
            writes.push({method:'DELETE',path:url.pathname,authenticated:request.headers().authorization===`Bearer ${token}`});
            rows=rows.map(row=>({...row,state:false}));return respond({success:true});
          }
          if(request.method()==='POST'&&['/register/admin/resetpass','/register/password-recovery'].includes(url.pathname)){
            writes.push({method:'POST',path:url.pathname,body:request.postDataJSON(),authenticated:request.headers().authorization===`Bearer ${token}`});
            if(mode==='hold')await new Promise(resolve=>release=resolve);
            return respond({message:'Fixture response'},mode==='error'?503:mode==='expired'?401:200);
          }
          unexpected.push(`${request.method()} ${url.pathname}`);return route.abort();
        }
        if(url.pathname.endsWith('materialize.min.css'))return route.fulfill({contentType:'text/css',body:css});
        if(url.pathname.endsWith('materialize.min.js'))return route.fulfill({contentType:'text/javascript',body:js});
        if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();
        if(url.origin!==origin){unexpected.push(url.origin);return route.abort();}
        const file=resolve(dist,url.pathname.startsWith('/assets/')||/\.(png|svg|jpeg|ico)$/.test(url.pathname)?`.${url.pathname}`:'index.html');
        try{return route.fulfill({contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.jpeg':'image/jpeg','.ico':'image/x-icon'}[extname(file)],body:await readFile(file)});}catch{return route.fulfill({status:404,body:''});}
      });
      const fit=async(selector,caption)=>{
        await page.locator(selector).waitFor();await page.evaluate(()=>document.fonts.ready);
        const m=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,width:r.width,right:r.right,documentWidth:document.documentElement.scrollWidth,cap:getComputedStyle(document.documentElement).getPropertyValue('--ctq-page-max').trim()};});
        check(m.documentWidth<=width+1,`${label}/${caption}: no horizontal page overflow`);
        check(m.width<=Math.min(width,parseInt(m.cap))+1,`${label}/${caption}: shared Home maximum width`);
        report.views.push({engine,width,height,caption,metrics:m});
      };
      const capture=async caption=>{if([390,820,1440].includes(width)){const file=`${caption}-${engine}-${width}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});report.captures.push(file);}};
      await page.goto(`${origin}/adminregister`);await page.locator('.user-table tbody tr').first().waitFor();await fit('.admin-users-page','users');
      check(await page.locator('h1').innerText()==='Administración de usuarios',`${label}/users: descriptive heading`);
      const first=page.locator('.user-table tbody tr').first();
      const targets=await first.locator('button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));
      check(targets.length===5&&targets.every((r,i)=>r.height>=44&&r.width>=(width<640?36:44)&&(!i||r.x>=targets[i-1].right-1)),`${label}/users: five stable non-overlapping action targets`);
      const nameBox=await first.locator('.admin-user-name').boundingBox();check(targets.every(r=>r.x>=nameBox.x+nameBox.width-1),`${label}/users: name and actions share a row without overlap`);
      check(await page.locator('.user-table tbody tr').nth(2).locator('button:disabled').count()===4,`${label}/users: inactive actions remain disabled except edit`);
      check(await first.locator('.admin-user-type').isVisible()===(width>=1024),`${label}/users: desktop metadata, compact mobile/tablet columns`);
      await capture('users');
      const contrasts=[];
      for(let i=0;i<4;i++){
        const row=page.locator('.user-table tbody tr').nth(i);
        await page.mouse.move(1,1);await page.evaluate(()=>document.activeElement?.blur());
        const normal=await row.evaluate(contrastSamples);check(normal.every(s=>s.ratio>=4.5),`${label}/users/${i}: default text and enabled icons contrast >= 4.5`);
        await row.hover();const hover=await row.evaluate(contrastSamples);check(hover.every(s=>s.ratio>=4.5)&&await row.locator('td').first().evaluate(el=>getComputedStyle(el).backgroundColor)==='rgb(217, 238, 246)',`${label}/users/${i}: opaque pastel hover with readable text/icons`);
        if(i===0)await capture('users-hover');
        await row.getByRole('button').first().focus();await page.mouse.move(1,1);const focus=await row.evaluate(contrastSamples);check(focus.every(s=>s.ratio>=4.5),`${label}/users/${i}: keyboard focus retains text/icon contrast`);
        contrasts.push({row:i,normal,hover,focus});
      }
      await page.evaluate(()=>document.activeElement?.blur());
      const menu=page.locator(width>=993?'#dropdown1':'#mobile-nav');
      await page.locator(width>=993?'.ctq-nav .dropdown-trigger':'.sidenav-trigger').click();
      await menu.waitFor({state:'visible'});await page.waitForFunction(selector=>document.querySelector(selector).getBoundingClientRect().left>=-1,width>=993?'#dropdown1':'#mobile-nav');
      if(width>=993)await page.waitForFunction(()=>document.querySelector('#dropdown1').getBoundingClientRect().width>=239);
      const profileLink=menu.getByRole('link',{name:'Mi Perfil',exact:true}),menuContrasts=[];
      await profileLink.hover();const menuHover=await profileLink.evaluate(contrastSamples);check(menuHover[0].ratio>=4.5&&menuHover[0].color==='rgb(23, 50, 74)',`${label}/menu: pastel hover uses dark readable text ${JSON.stringify(menuHover)}`);menuContrasts.push({state:'hover',samples:menuHover});await capture('menu-hover');
      await page.mouse.move(width-1,height-1);await profileLink.focus();const menuFocus=await profileLink.evaluate(contrastSamples);check(menuFocus[0].ratio>=4.5&&menuFocus[0].color==='rgb(23, 50, 74)',`${label}/menu: keyboard focus is readable`);menuContrasts.push({state:'focus',samples:menuFocus});
      await page.evaluate(()=>document.activeElement?.blur());
      for(const state of ['active','selected']){await profileLink.evaluate((el,state)=>el.parentElement.classList.add(state),state);const samples=await profileLink.evaluate(contrastSamples);check(samples[0].ratio>=4.5&&samples[0].color==='rgb(23, 50, 74)',`${label}/menu: Materialize ${state} keeps contrast`);menuContrasts.push({state,samples});await profileLink.evaluate((el,state)=>el.parentElement.classList.remove(state),state);}
      if(width>=993){await page.mouse.click(width-2,100);await menu.waitFor({state:'hidden'});}else{await page.locator('.sidenav-overlay').click({position:{x:width-10,y:height-20}});await page.waitForFunction(()=>document.querySelector('#mobile-nav').getBoundingClientRect().right<=1);}
      report.views.at(-1).contrast={rows:contrasts,menu:menuContrasts};
      const search=page.getByRole('textbox',{name:'Buscar usuarios por nombre'});await search.fill('Socio inactivo');
      check(await page.locator('.user-table tbody tr').count()===1&&new URL(page.url()).searchParams.get('search')==='Socio inactivo',`${label}/users: quick search and URL state preserved`);
      await search.fill('no existe fixture');check(await page.locator('.admin-users-empty').isVisible(),`${label}/users: empty search`);await search.fill('');
      await page.getByRole('button',{name:`Editar a ${users[0].namePlayer}`,exact:true}).click();await page.getByRole('dialog',{name:'Editar usuario'}).waitFor();
      const modal=await page.locator('.edit-modal').boundingBox();check(modal.x>=0&&modal.x+modal.width<=width+1&&modal.y>=0&&modal.y+modal.height<=height+1,`${label}/editor: dialog stays inside viewport`);
      const columns=await page.locator('.admin-edit-form').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);check(columns===(width>=640?2:1),`${label}/editor: desktop/tablet columns and mobile stack`);
      check(await page.locator('#namePlayer').evaluate(el=>getComputedStyle(el).fontSize)==='16px'&&await page.locator('#email').getAttribute('readonly')!==null,`${label}/editor: 16px controls and email stays readonly`);
      await page.locator('.admin-member-select__control').first().click();await page.getByRole('option',{name:'User',exact:true}).waitFor();check(await page.getByRole('listbox').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth+1;}),`${label}/editor: selector menu fits viewport`);await page.getByRole('option',{name:'User',exact:true}).click();check(await page.getByRole('dialog',{name:'Editar usuario'}).isVisible()&&await page.getByRole('button',{name:'Actualizar',exact:true}).isDisabled(),`${label}/editor: choosing unchanged role keeps dialog and unchanged state`);
      await capture('editor');
      if(width===390){await page.setViewportSize({width,height:420});await page.waitForFunction(()=>{const r=document.querySelector('.edit-modal').getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight+1;});const r=await page.locator('.edit-modal').boundingBox();check(r.y>=0&&r.y+r.height<=421,`${label}/editor: resized visible area remains contained`);await page.setViewportSize({width,height});}
      await page.locator('#editModal').focus();await page.keyboard.press('Tab');check(await page.locator('#namePlayer').evaluate(el=>document.activeElement===el),`${label}/editor: keyboard focus enters editor`);
      await page.getByRole('button',{name:'Cancelar',exact:true}).click();check(writes.length===0&&await page.getByRole('button',{name:`Editar a ${users[0].namePlayer}`,exact:true}).evaluate(el=>document.activeElement===el),`${label}/editor: cancel restores focus and makes no write`);
      await page.goto(`${origin}/myhistory`);await page.locator('.history-table tbody tr').first().waitFor();await fit('.history-page','history');
      check((await page.locator('.history-turn').first().innerText())===reservation.turn&&(await page.locator('.history-date').first().innerText()).endsWith(future.slice(0,4)),`${label}/history: complete turn and four-digit year`);
      check(await page.locator('.history-delete-btn:disabled').count()===1,`${label}/history: canceled/past reservation stays non-deletable`);
      const geometry=await page.locator('.history-table tbody tr').first().locator('td').evaluateAll(cells=>cells.map(c=>{const r=c.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
      check(geometry.every((a,i)=>geometry.every((b,j)=>i===j||a.right<=b.x+1||b.right<=a.x+1||a.bottom<=b.y+1||b.bottom<=a.y+1)),`${label}/history: data cells do not overlap`);
      check(await page.locator('.history-view-btn').first().evaluate(el=>getComputedStyle(el).color)==='rgb(125, 211, 252)',`${label}/history: CTQ action color`);
      await capture('history');
      await page.locator('.history-view-btn').first().click();await page.getByRole('heading',{name:'Detalle de la reserva'}).waitFor();
      check((await page.locator('.swal2-html-container').innerText()).includes(reservation.player2)&&await page.locator('.swal2-html-container img').count()===0,`${label}/history: full names are plain text, not injected HTML`);await page.getByRole('button',{name:'Cerrar',exact:true}).click();
      await page.locator('.history-delete-btn').first().click();await page.locator('.swal2-cancel').click();check(writes.length===0,`${label}/history: cancel does not delete`);
      await page.locator('.history-delete-btn').first().click();await page.locator('.swal2-confirm').click();await page.getByRole('heading',{name:'Reserva eliminada'}).waitFor();await page.getByRole('button',{name:'Aceptar',exact:true}).click();await page.locator('.history-table').waitFor();
      check(writes.length===1&&writes[0].authenticated&&await page.locator('.history-status-chip.cancel').count()===2,`${label}/history: exact authenticated delete and refreshed status`);
      rows=[];await page.reload();await page.locator('.history-empty').waitFor();check(await page.getByRole('heading',{name:'No tienes reservas'}).isVisible(),`${label}/history: empty state`);
      await page.goto(`${origin}/resetpassword`);await fit('.reset-password-page','reset');
      const recoveryColumns=await page.locator('.password-recovery-layout').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);check(recoveryColumns===(width>=900?2:1),`${label}/reset: two desktop columns, form-first compact layout`);
      check((await page.locator('.password-recovery-policy').innerText()).includes('24 horas'),`${label}/reset: lifetime and admin policy retained`);
      check(await page.locator('#email-input').evaluate(el=>getComputedStyle(el).fontSize)==='16px'&&await page.locator('.submit-button').evaluate(el=>getComputedStyle(el).backgroundColor)==='rgb(244, 232, 90)',`${label}/reset: readable input and CTQ yellow action`);
      await capture('reset');
      await page.locator('#email-input').fill('  Member@Test.cl  ');await page.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
      for(let i=0;!release&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,20));assert(release,'held reset intercepted');
      check(writes.length===2&&await page.locator('.submit-button').isDisabled()&&await page.locator('#email-input').isDisabled(),`${label}/reset: single-flight and pending controls`);
      mode='success';release();await page.getByRole('heading',{name:'Solicitud recibida'}).waitFor();await page.getByRole('button',{name:'Aceptar',exact:true}).click();
      check(writes[1].path==='/register/admin/resetpass'&&writes[1].authenticated&&writes[1].body.email==='member@test.cl'&&await page.locator('#email-input').inputValue()==='',`${label}/reset: normalized email and existing admin contract`);
      mode='error';await page.locator('#email-input').fill('member@test.cl');await page.locator('.submit-button').click();await page.getByRole('heading',{name:'Error',exact:true}).waitFor();await page.locator('.swal2-confirm').click();check(await page.locator('#email-input').inputValue()==='member@test.cl',`${label}/reset: error keeps email`);
      await page.goto(`${origin}/recuperar-contrasena`);await fit('.reset-password-page','public-recovery');check((await page.locator('.password-recovery-policy').innerText()).includes('una solicitud cada 24 horas')&&await page.getByRole('link',{name:'Volver a iniciar sesión'}).isVisible(),`${label}/public: unchanged public limit and login return`);
      await page.goto(`${origin}/restablecer-contrasena`);await page.getByText('El enlace no es válido. Solicita uno nuevo.').waitFor();check(await page.locator('.reset-password-container').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),`${label}/confirm: shared CSS keeps invalid-link view contained`);
      await page.goto(`${origin}/restablecer-contrasena?fixture=valid#token=${'f'.repeat(64)}`);await page.locator('#new-password').waitFor();check(await page.locator('.form-group input').evaluateAll(inputs=>inputs.every(el=>{const r=el.getBoundingClientRect();return r.right<=innerWidth&&r.x>=0&&getComputedStyle(el).fontSize==='16px';})),`${label}/confirm: valid-token password fields retain 16px and fit`);
      await page.goto(`${origin}/ranking`);await page.locator('.category-card').first().waitFor();await fit('.ranking-wrapper','ranking');
      const nav=await page.locator('.categories-grid').boundingBox(),panel=await page.locator('.ranking-panel').boundingBox();check(width>=1024?panel.x>=nav.x+nav.width:panel.y>=nav.y+nav.height,`${label}/ranking: desktop category rail and compact top categories`);
      const categories=await page.locator('.categories-grid').evaluate(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return {background:style.backgroundColor,contained:[...el.querySelectorAll('.category-card')].every(button=>{const b=button.getBoundingClientRect();return b.x>=r.x&&b.right<=r.right+1&&b.bottom<=r.bottom+1&&[...button.querySelectorAll('.category-name,.category-label')].every(text=>{const t=text.getBoundingClientRect();return t.y>=b.y&&t.bottom<=b.bottom+1;});})};});
      check(categories.background==='rgba(0, 0, 0, 0)'&&categories.contained,`${label}/ranking: no inherited red navbar or fixed-height clipping; labels contained`);
      check(await page.locator('.category-card').count()===6&&await page.locator('#ranking-category-title').innerText()==='1'&&await page.locator('.player-row').count()===10,`${label}/ranking: existing category order/filter and initial selection`);
      check(await page.locator('.master-badge').count()===8&&await page.locator('.points-value').first().innerText()==='1.234.567'&&await page.locator('.player-name').nth(1).innerText()===rankingPlayers[1].nombre,`${label}/ranking: unchanged points, Masters top eight and complete names`);
      await page.waitForFunction(()=>[...document.querySelectorAll('.player-avatar')].every(img=>img.complete&&img.naturalWidth>0));check(await page.locator('.player-avatar').nth(2).getAttribute('src')==='/images/avatar-fantasma.png',`${label}/ranking: missing/broken image fallback renders`);
      const cells=await page.locator('.player-row').nth(1).locator('td,th').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,right:r.right};}));check(cells.every((r,i)=>!i||r.x>=cells[i-1].right-1),`${label}/ranking: position, avatar, name and points do not overlap`);
      await capture('ranking');await page.locator('.player-row').first().click();check(await page.locator('#ranking-category-title').innerText()==='1',`${label}/ranking: player row does not collapse category`);
      await page.locator('.category-card').nth(1).click();check(await page.locator('#ranking-category-title').innerText()==='2'&&await page.locator('.player-row').count()===2,`${label}/ranking: category selection updates panel`);await page.locator('.category-card').nth(1).click();check(await page.locator('.ranking-table').count()===0,`${label}/ranking: repeated category collapses as before`);await page.locator('.category-card').first().focus();await page.keyboard.press('Enter');check(await page.locator('#ranking-category-title').innerText()==='1'&&rankingReads===1,`${label}/ranking: native keyboard and no extra API requests`);
      mode='expired';await page.goto(`${origin}/resetpassword`);await page.locator('#email-input').fill('member@test.cl');await page.locator('.submit-button').click();await page.waitForURL('**/login');check(await page.evaluate(()=>localStorage.getItem('token'))===null,`${label}/reset: 401 forces login`);
      check(errors.length===0&&unexpected.length===0,`${label}: no runtime errors or unexpected/live APIs`);
      await context.close();console.log(JSON.stringify({engine,width,height,status:'passed'}));
    }
    await browser.close();browser=null;
  }
  report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:resolve(output,'failure.png'),fullPage:true});}
finally{if(browser)await browser.close();await writeFile(resolve(output,'admin-history-reset.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({status:report.status,views:report.views.length,checks:report.passed.length,error:report.error}));}
