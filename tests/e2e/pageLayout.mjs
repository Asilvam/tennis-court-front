import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [buildArg, outputArg, playwrightArg, widthsArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node tests/e2e/pageLayout.mjs BUILD OUTPUT PLAYWRIGHT_MODULE');
const dist = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const email = 'fixture@example.invalid', id = '111111111111111111111111';
const name = 'Socio de prueba Nombre Completo Apellido Compuesto';
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role: 'admin', email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'isolated-signature'].join('.');
const member = { id, name, email, active: true, enrolled: true, memberType: 'Titular' };
const billing = { memberId: id, members: [member], dues: [{ id: 'fixture-due', beneficiaryId: id, period: '2026-10', amount: 180, pricingMode: 'TEST', status: 'OPEN', dueAt: '2026-11-06T03:00:00Z' }], billing: { minimumStartPeriod: '2026-10', currentPeriod: '2026-10' } };
const reserves = [{ idCourtReserve: 'fixture-reserve', court: 'Cancha 1', player1: name, player2: 'Otro Socio Nombre Completo', dateToPlay: '2026-10-29', turn: '20:00-21:30', state: true, isDouble: false, isForRanking: true }];
const history = Array.from({ length: 6 }, (_, i) => ({ id: `match-${i}`, jugadorId: email, fecha: `2026-10-${28-i}`, rival: `Rival de prueba ${i + 1} Apellido Completo`, score: '6:4, 7:6', ganador: i % 3 !== 0, isDouble: i > 3 }));
const ranking = Object.fromEntries(['Tercera', '+55', 'Dobles'].map((categoria, i) => [categoria, [{ id: email, nombre: name, puntos: 1635 - i * 100, categoria, rank: 13 - i, cellular: '', imageUrlProfile: '/images/avatar-fantasma.png' }]]));
const routes = [
  ['/', '.home-hero__content', '.home-hero__actions'],
  ['/dashboard', '.dashboard-container', '.court-card'],
  ['/adminregister', '.admin-register-container', '.user-table tbody tr'],
  ['/adminreserves', '.ar-container', '.ar-table tbody tr'],
  ['/ranking', '.ranking-wrapper', '.category-card'],
  ['/myhistory', '.history-page', '.history-table tbody tr'],
  ['/multibooking', '.mbf-container', '.mbf-form-layout'],
  ['/adminpayments', '.admin-membership-payments', '.ap-table tbody tr'],
  [`/adminpayments?memberId=${id}`, '.admin-membership-payments', '.ap-dues-table tbody tr'],
  ['/monthlypayments', '.member-payments', '.mp-due'],
  ['/updatematch', '.results-page', '.results-empty'],
  [`/admincategories?email=${email}`, '.member-categories', '.mc-choice'],
  ['/profile', '.profile-container', '.profile-section--history .match-row'],
];
const report = { date: new Date().toISOString().slice(0, 10), executedAt: new Date().toISOString(), scope: 'Actual React build; mocked club APIs; no live data or writes', views: [], passed: [], captures: [], sourceHashes: {} };
let browser, page;
const check = (condition, message) => { assert(condition, message); report.passed.push(message); };
try {
  await mkdir(output, { recursive: true });
  for (const file of ['src/index.css', 'src/components/PlayerProfile.tsx', ...['Home', 'Navigation', 'Dashboard', 'AdminRegister', 'AdminReserves', 'AdminMembershipPayments', 'MembershipPayments', 'Ranking', 'MyHistoryReserve', 'MultipleBookingForm', 'MemberCategories', 'MatchResult', 'PlayerProfile'].map(name => `src/styles/${name}.css`)])
    report.sourceHashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
  const materializeCss = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
  const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of widthsArg ? widthsArg.split(',').map(Number) : [390, 820, 1024, 1280, 1440, 2068]) {
      const context = await browser.newContext({ viewport: { width, height: 1035 }, locale: 'es-CL' });
      await context.addInitScript(({ token, email, name }) => {
        localStorage.setItem('token', token); localStorage.setItem('userInfo', JSON.stringify({ name, email, role: 'admin' }));
      }, { token, email, name });
      page = await context.newPage();
      const errors = [], unexpected = [], requests = [];
      let variant = 'populated';
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type,Idempotency-Key', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          const path = decodeURIComponent(url.pathname), method = request.method(); requests.push({ path, method });
          const respond = data => route.fulfill({ headers, json: data });
          if (path.endsWith('/me/access')) return respond({ role: 'admin', name, memberId: id, financiallyRestricted: false, reason: null, mpEnabled: false });
          if (path === '/auth/checkBlocked') return respond({ blocked: false });
          if (path === '/membership-billing/me/dues') return respond({ ...billing, currentPeriod: '2026-10', access: { mpEnabled: false, financiallyRestricted: false, reason: null } });
          if (method !== 'GET') { unexpected.push(`${method} ${path}`); return route.abort(); }
          if (path === '/news-ctq' || path === '/match-ranking') return respond([]);
          if (path === '/register/names') return respond([name, 'Otro Socio Nombre Completo']);
          if (path === '/register') return respond([{ ...member, namePlayer: name, statePlayer: true, emailVerified: true, updatePayment: true, partnerType: 'Titular', titularId: null, role: 'user', cellular: '+56912345678' }]);
          if (path.includes('/register/profile/')) return respond({ namePlayer: name, email, category: 'Tercera', points: 1635, imageUrlProfile: variant === 'empty' ? undefined : '/images/avatar-fantasma.png' });
          if (path === '/match-ranking/ranking') return respond(variant === 'empty' ? {} : variant === 'doubles-only' ? { Dobles: ranking.Dobles } : ranking);
          if (path.includes('/match-ranking/history/')) return respond(variant === 'empty' ? [] : history);
          if (path === '/match-ranking/pending') return respond({ matches: [], member: { name, email }, totalPending: 0 });
          if (path.startsWith('/court-reserve/active/')) return respond([]);
          if (path.startsWith('/court-reserve/available/')) return respond([{ time: '20:00-21:30', slots: Array.from({ length: 3 }, (_, i) => ({ court: `Cancha ${i+1}`, available: i === 0, isPayed: false, isBlockedByAdmin: false, data: i ? 'reserva - Nombre Completo Apellido Largo vs Otro Socio Nombre Completo' : '' })) }]);
          if (path === '/court-reserve' || path.startsWith('/court-reserve/history/')) return respond(reserves);
          if (path.endsWith('/editor')) return respond({ player: { name, email, active: true }, categories: [{ category: '3', points: 1635, isActive: true }, { category: 'Dobles', points: 500, isActive: true }], revision: 'fixture-revision' });
          if (path === '/membership-billing/admin/members') return respond({ items: [{ ...member, amount: 180, status: 'OPEN', pricingMode: 'TEST' }], total: 1 });
          if (path.endsWith(`/admin/members/${id}`)) return respond(billing);
          if (path.endsWith('/payments')) return respond({ items: [], total: 0, pageSize: 20 });
          unexpected.push(`${method} ${path}`); return route.fulfill({ headers, status: 500, json: { message: 'Unexpected fixture request' } });
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materializeCss });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
        if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
        const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|svg|jpeg|ico)$/.test(url.pathname) ? `.${url.pathname}` : 'index.html');
        try { return route.fulfill({ contentType: { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' }[extname(file)], body: await readFile(file) }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      });
      let home;
      for (const [path, selector, ready] of routes) {
        const label = `${engine}/${width}${path}`;
        await page.goto(`${origin}${path}`);
        await page.locator(ready).first().waitFor(); await page.evaluate(() => document.fonts.ready);
        await page.locator('.swal2-container').waitFor({ state: 'hidden' });
        const metrics = await page.locator(selector).evaluate(element => {
          const r = element.getBoundingClientRect(), style = getComputedStyle(element), root = getComputedStyle(document.documentElement);
          return { x: r.x, right: r.right, width: r.width, paddingLeft: parseFloat(style.paddingLeft), documentWidth: document.documentElement.scrollWidth, cap: root.getPropertyValue('--ctq-page-max').trim(), palette: ['--ctq-bg-top', '--ctq-text', '--ctq-accent', '--ctq-yellow'].map(name => root.getPropertyValue(name).trim()) };
        });
        report.views.push({ engine, browser: browser.version(), viewport: width, path, metrics });
        if (path === '/') home = metrics;
        check(metrics.width <= home.width + 1, `${label}: no wider than Home`);
        check(metrics.documentWidth <= width + 1, `${label}: no page horizontal overflow`);
        if (width >= 1024) check(Math.abs(metrics.x - home.x) < 1 && Math.abs(metrics.paddingLeft - home.paddingLeft) < 1, `${label}: desktop shell and gutter align with Home`);
        check(JSON.stringify(metrics.palette) === JSON.stringify(['#07152a', '#f8fafc', '#7dd3fc', '#f4e85a']), `${label}: CTQ color tokens unchanged`);
        if (path === '/profile') {
          const geometry = await page.evaluate(() => {
            const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, height: r.height }; };
            return { categories: rect('.profile-section--categories'), history: rect('.profile-section--history'), stats: rect('.profile-section--summary') };
          });
          check(width >= 1024 ? Math.abs(geometry.categories.y - geometry.history.y) < 1 && geometry.categories.right <= geometry.history.x + 1 : geometry.categories.bottom <= geometry.history.y + 1, `${label}: desktop two columns / mobile-tablet one column`);
          check(await page.getByRole('heading', { name, exact: true }).count() === 1, `${label}: complete name retained`);
          await page.getByRole('tab', { name: 'Singles', exact: true }).focus(); await page.keyboard.press('ArrowRight');
          check(await page.getByRole('tab', { name: 'Dobles', exact: true }).getAttribute('aria-selected') === 'true' && await page.locator('.match-row').count() === 2, `${label}: keyboard modality and history work`);
          await page.keyboard.press('Home');
          check(await page.locator('.match-row').count() === 4, `${label}: singles statistics and matches restored`);
          if ([390, 820, 1440, 2068].includes(width)) {
            const capture = `profile-${engine}-${width}.png`; await page.screenshot({ path: resolve(output, capture), fullPage: true }); report.captures.push(capture);
          }
          variant = 'empty'; await page.reload(); await page.getByText('Sin partidos registrados.', { exact: true }).waitFor();
          check(await page.locator('.stat-number').allTextContents().then(values => values.every(value => value === '0')), `${label}: empty profile has zero statistics`);
          check(await page.locator('.profile-image').evaluate(image => image.decode().then(() => image.naturalWidth > 0)), `${label}: existing fallback avatar renders without a missing asset`);
          variant = 'doubles-only'; await page.reload(); await page.getByRole('tab', { name: 'Dobles', exact: true }).waitFor();
          await page.waitForFunction(() => document.getElementById('profile-tab-doubles')?.getAttribute('aria-selected') === 'true');
          check(await page.locator('.pp-category-card').count() === 1, `${label}: doubles-only default preserved`);
          await page.locator('#file-upload').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: await readFile(resolve(root, 'public/images/avatar-fantasma.png')) });
          check(await page.getByRole('button', { name: 'Guardar Foto', exact: true }).isVisible(), `${label}: photo selection still available; no upload submitted`);
          metrics.profile = geometry;
          variant = 'populated';
        } else if (width === 1440 && ['/dashboard', '/adminregister', '/adminpayments'].includes(path)) {
          const capture = `${path.slice(1)}-${engine}-${width}.png`; await page.screenshot({ path: resolve(output, capture), fullPage: true }); report.captures.push(capture);
        }
      }
      const menuNavigate = async path => {
        const menu = width >= 993 ? '#dropdown1' : '#mobile-nav';
        await page.locator(width >= 993 ? '.ctq-nav .dropdown-trigger' : '.sidenav-trigger').click();
        await page.locator(`${menu} a[href="${path}"]`).click();
        await page.waitForURL(`${origin}${path}`);
      };
      await page.locator('.ctq-nav__brand').click();
      await menuNavigate('/ranking'); await page.locator('.category-card').first().waitFor();
      await menuNavigate('/profile'); await page.locator('.profile-section--history .match-row').first().waitFor();
      const afterNavigation = await page.locator('.profile-container').boundingBox();
      check(Math.abs(afterNavigation.width - home.width) < 1, `${engine}/${width}: shared width survives SPA navigation and accumulated styles`);
      check(await page.getByRole('tab', { name: 'Singles', exact: true }).getAttribute('aria-selected') === 'true' && await page.locator('.match-row').count() === 4, `${engine}/${width}: profile state resets correctly after returning from ranking`);
      check(errors.length === 0 && unexpected.length === 0, `${engine}/${width}: no page errors, unexpected APIs or submitted writes`);
      console.log(JSON.stringify({ engine, width, routes: routes.length, status: 'passed' }));
      await context.close();
    }
    await browser.close(); browser = null;
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
} finally {
  if (browser) await browser.close();
  await writeFile(resolve(output, 'page-layout.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checkpoints: report.passed.length, error: report.error }));
}
