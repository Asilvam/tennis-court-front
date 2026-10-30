import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [buildArg, outputArg, playwrightArg, sizeArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node tests/e2e/multibooking.mjs BUILD OUTPUT PLAYWRIGHT_MODULE [WIDTH]');
const dist = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const token = role => [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role, email: 'fixture@example.invalid', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'isolated-signature'].join('.');
const sizes = sizeArg ? [[Number(sizeArg), 1000]] : [[320, 760], [390, 844], [820, 1024], [1024, 768], [1440, 1000], [820, 500]];
const report = { date: '2026-10-30', scope: 'Real React build with mocked auth/booking; no club writes or services', passed: [], views: [], sourceHashes: {}, captures: [] };
const check = (condition, message) => { assert(condition, message); report.passed.push(message); };
let browser, page;
try {
  await mkdir(output, { recursive: true });
  for (const file of ['src/components/MultipleBookingForm.tsx', 'src/styles/MultipleBookingForm.css', 'package.json']) report.sourceHashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
  const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
  const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const [width, height] of sizes) {
      const label = `${engine}/${width}x${height}`;
      const context = await browser.newContext({ viewport: { width, height }, locale: 'es-CL', timezoneId: 'America/Santiago', ...(width <= 820 ? { hasTouch: true } : {}) });
      await context.addInitScript(token => {
        if (!localStorage.getItem('token')) { localStorage.setItem('token', token); localStorage.setItem('userInfo', JSON.stringify({ name: 'Admin fixture', email: 'fixture@example.invalid', role: 'admin' })); }
      }, token('admin'));
      page = await context.newPage();
      const writes = [], errors = [], unexpected = [];
      let role = 'admin', mode = 'error', release;
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (url.pathname.endsWith('/me/access')) return route.fulfill({ headers, json: { role, name: role === 'admin' ? 'Admin fixture' : 'Profesor Nombre Completo Apellido Compuesto', financiallyRestricted: false } });
          if (request.method() === 'POST' && url.pathname === '/booking/multiple') {
            writes.push({ body: request.postDataJSON(), authenticated: request.headers().authorization?.startsWith('Bearer '), mode });
            if (mode === 'hold') await new Promise(resolve => release = resolve);
            return route.fulfill({ headers, status: mode === 'error' ? 503 : mode === 'expired' ? 401 : 200, json: { message: 'Fixture response' } });
          }
          unexpected.push(`${request.method()} ${url.pathname}`); return route.abort();
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: css });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: js });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
        if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
        const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|svg|jpeg|ico)$/.test(url.pathname) ? `.${url.pathname}` : 'index.html');
        try { return route.fulfill({ contentType: { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' }[extname(file)], body: await readFile(file) }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      });
      const getMetrics = () => page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, width: r.width, height: r.height }; };
        const sections = [...document.querySelectorAll('.mbf-section')].map(rect);
        return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, form: rect(document.querySelector('.mbf-container')), sections, labels: [...document.querySelectorAll('.mbf-checkbox-pill')].map(rect), inputFont: document.querySelector('#motive-detail') ? getComputedStyle(document.querySelector('#motive-detail')).fontSize : null };
      });
      const closeCalendar = async () => {
        if (await page.locator('.mbf-calendar').isVisible()) await page.getByRole('button', { name: 'Listo', exact: true }).click();
        await page.locator('.mbf-calendar').waitFor({ state: 'hidden' });
      };
      const selectDate = async () => {
        await page.getByRole('button', { name: 'Seleccionar fechas', exact: true }).click();
        const day = page.locator('.mbf-calendar .react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month):not(.react-datepicker__day--selected)').first();
        await day.click(); await closeCalendar();
      };
      const selectMotive = async () => { await page.getByLabel('Motivo', { exact: true }).click(); await page.getByRole('option', { name: 'Campeonato', exact: true }).click(); };
      await page.goto(`${origin}/multibooking`); await page.locator('.mbf-form-layout').waitFor(); await page.evaluate(() => document.fonts.ready);
      const initial = await getMetrics();
      check(initial.documentWidth <= width + 1, `${label}: initial form fits viewport`);
      check(width >= 1024 ? initial.sections[0].x < initial.sections[1].x && Math.abs(initial.sections[0].y - initial.sections[1].y) < 1 : initial.sections[0].y < initial.sections[1].y, `${label}: desktop columns / compact single column`);
      const firstCourt = page.getByRole('checkbox', { name: 'Cancha 1', exact: true });
      await firstCourt.check(); await page.getByRole('checkbox', { name: 'Cancha 2', exact: true }).check();
      await page.getByRole('checkbox', { name: 'Todos los turnos', exact: true }).check();
      const selected = await getMetrics();
      check(selected.labels.every((item,i) => item.height >= 44 && Math.abs(item.height-initial.labels[i].height) < 1 && Math.abs(item.width-initial.labels[i].width) < 1), `${label}: stable checkbox targets before/after checking`);
      await firstCourt.focus(); const scroll = await page.evaluate(() => scrollY); await page.keyboard.press('Space');
      check(!await firstCourt.isChecked() && Math.abs(await page.evaluate(() => scrollY) - scroll) < 2, `${label}: native Space toggles without page jump`); await firstCourt.check();
      const dateButton = page.getByRole('button', { name: 'Seleccionar fechas', exact: true });
      await dateButton.focus(); await page.keyboard.press('Enter'); await page.locator('.mbf-calendar').waitFor();
      const calendar = await page.locator('.mbf-calendar').boundingBox();
      check(calendar.x >= -1 && calendar.x + calendar.width <= width + 1 && calendar.y >= -1 && calendar.y + calendar.height <= height + 1, `${label}: keyboard opens a calendar within the visible viewport`);
      check(!/January|February|March|April|May|June|July|August|September|October|November|December/.test(await page.locator('.react-datepicker__current-month').innerText()), `${label}: calendar month is Spanish`);
      let days = page.locator('.mbf-calendar .react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month)');
      if (await days.count() < 2) await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click();
      days = page.locator('.mbf-calendar .react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month)');
      await days.nth(0).click(); await days.nth(1).click();
      check(await page.locator('.react-datepicker__day--selected').count() === 2, `${label}: both selected dates marked`);
      const dayColors = await page.locator('.react-datepicker__day--selected').evaluateAll(elements => elements.map(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor })));
      check(dayColors.every(style => style.background === 'rgb(244, 232, 90)' && style.color === 'rgb(15, 23, 42)'), `${label}: all selected dates retain CTQ yellow and dark readable text, including hover`);
      if ([320, 820, 1440].includes(width)) { const name = `calendar-${engine}-${width}x${height}.png`; await page.screenshot({ path: resolve(output,name), fullPage: true }); report.captures.push(name); }
      await closeCalendar();
      const dateValues = await page.locator('.mbf-chip time').evaluateAll(elements => elements.map(element=>element.getAttribute('datetime')));
      check((await page.locator('.mbf-summary-total dd').innerText()) === '32', `${label}: 2 courts x 2 dates x 8 turns = 32`);
      await selectMotive(); await page.locator('#motive-detail').fill('D'.repeat(80));
      const filled = await getMetrics();
      check(filled.documentWidth <= width + 1 && filled.inputFont === '16px', `${label}: unbroken 80-character detail fits with 16px input`);
      const detailStyle = await page.locator('#motive-detail').evaluate(element => {
        const style = getComputedStyle(element);
        return { top: style.borderTopWidth, left: style.borderLeftWidth, right: style.borderRightWidth, radius: style.borderRadius };
      });
      check(detailStyle.top === '1px' && detailStyle.left === '1px' && detailStyle.right === '1px' && detailStyle.radius === '6px', `${label}: detail keeps the CTQ outlined control`);
      check(await page.locator('.mbf-btn-submit').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(244, 232, 90)'), `${label}: main action retains CTQ yellow`);
      const name = `form-${engine}-${width}x${height}.png`; await page.screenshot({ path: resolve(output,name), fullPage: true }); report.captures.push(name);
      await page.getByRole('button', { name: 'Reservar', exact: true }).click(); await page.getByRole('heading', { name: 'Confirmar reservas', exact: true }).waitFor();
      check(writes.length === 0 && (await page.locator('.swal2-html-container').innerText()).includes('32 reservas'), `${label}: review is explicit and makes no request`);
      await page.locator('.swal2-cancel').click();
      check(await page.locator('.mbf-chip').count() === 2 && writes.length === 0, `${label}: cancelling review keeps draft`);
      await page.getByRole('button', { name: 'Reservar', exact: true }).click(); await page.locator('.swal2-confirm').click();
      await page.getByRole('heading', { name: 'No se pudo confirmar la operación', exact: true }).waitFor(); await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      check(await page.locator('.mbf-chip').count() === 2, `${label}: simulated failure preserves draft`);
      mode = 'hold'; await page.getByRole('button', { name: 'Reservar', exact: true }).evaluate(button => { button.click(); button.click(); });
      await page.getByRole('heading', { name: 'Confirmar reservas', exact: true }).waitFor(); await page.locator('.swal2-confirm').click();
      await page.waitForFunction(() => document.querySelector('.mbf-btn-submit')?.textContent.includes('Reservando'));
      for (let attempt = 0; !release && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
      assert(release, `${label}: held API request was intercepted`);
      check(await dateButton.isDisabled() && await page.getByRole('button', { name: 'Cancelar', exact: true }).isDisabled(), `${label}: pending request freezes controls and cancel`);
      await page.locator('.mbf-btn-submit').evaluate(button => button.click());
      check(writes.length === 2, `${label}: double clicks cannot duplicate active request`);
      release(); await page.getByRole('heading', { name: 'Reservas creadas', exact: true }).waitFor(); await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      check(await page.locator('.mbf-summary-total dd').innerText() === '0' && await page.locator('.mbf-chip').count() === 0, `${label}: success resets selections`);
      check(writes[1].authenticated && writes[1].body.motive === `Campeonato - ${'D'.repeat(80)}` && JSON.stringify(writes[1].body.dates) === JSON.stringify([...dateValues].sort()), `${label}: payload preserves reviewed data and bearer contract`);
      await dateButton.click(); await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click();
      days = page.locator('.mbf-calendar .react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month)');
      for (let i=0; i<11; i++) await days.nth(i).click();
      await page.getByRole('heading', { name: 'Límite alcanzado', exact: true }).waitFor(); await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      check(await page.locator('.mbf-chip').count() === 10, `${label}: eleventh date rejected`); await closeCalendar();
      for (const court of ['Cancha 1','Cancha 2','Cancha 3']) await page.getByRole('checkbox',{name:court,exact:true}).check();
      await page.getByRole('checkbox',{name:'Todos los turnos',exact:true}).check(); await selectMotive();
      await page.getByRole('button',{name:'Reservar',exact:true}).click(); await page.getByRole('heading',{name:'Demasiadas reservas',exact:true}).waitFor(); await page.getByRole('button',{name:'Aceptar',exact:true}).click();
      check(writes.length === 2 && await page.locator('.mbf-summary-total dd').innerText() === '240', `${label}: over 100 blocked without API call`);
      role = 'profesor'; mode = 'expired';
      await page.evaluate(({token}) => { localStorage.setItem('token',token);localStorage.setItem('userInfo',JSON.stringify({role:'profesor',name:'Profesor Nombre Completo Apellido Compuesto',email:'fixture@example.invalid'})); }, { token: token('profesor') });
      await page.reload(); await page.locator('.mbf-form-layout').waitFor();
      check(await page.getByLabel('Motivo',{exact:true}).isDisabled() && await page.locator('#motive-detail').count() === 0, `${label}: professor motive remains fixed`);
      await firstCourt.check(); await page.getByRole('checkbox',{name:'08:15-10:00',exact:true}).check(); await selectDate();
      await page.getByRole('button',{name:'Reservar',exact:true}).click(); await page.locator('.swal2-confirm').click(); await page.waitForURL('**/login');
      check(await page.evaluate(() => localStorage.getItem('token')) === null, `${label}: expired session returns to login`);
      check(errors.length === 0 && unexpected.length === 0, `${label}: no page errors or unexpected/live APIs`);
      report.views.push({ engine, browser: browser.version(), width, height, initial, filled, calendar, writes });
      await context.close(); console.log(JSON.stringify({ engine,width,height,status:'passed' }));
    }
    await browser.close(); browser=null;
  }
  report.status='passed';
} catch(error) {
  report.status='failed';report.error=error.stack;process.exitCode=1;
  if(page&&!page.isClosed())await page.screenshot({path:resolve(output,'failure.png'),fullPage:true});
} finally {
  if(browser)await browser.close();
  await writeFile(resolve(output,'multibooking.json'),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({status:report.status,views:report.views.length,checkpoints:report.passed.length,error:report.error}));
}
