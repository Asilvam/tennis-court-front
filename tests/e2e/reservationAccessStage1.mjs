import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DateTime } from 'luxon';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [dist, output, modulePath] = process.argv.slice(2);
assert(dist && output && modulePath, 'Usage: node tests/e2e/reservationAccessStage1.mjs BUILD OUTPUT PLAYWRIGHT');
const { chromium, webkit } = await import(pathToFileURL(resolve(modulePath)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const email = 'debtor@example.invalid', name = 'Socio con reserva bloqueada';
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ email, role: 'profesor', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture'].join('.');
const report = { executedAt: new Date().toISOString(), scope: 'React build, fixture APIs and no live data', checks: [], views: [] };
const check = (condition, text) => { assert(condition, text); report.checks.push(text); };
await mkdir(output, { recursive: true });
const materialize = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
let browser;
try {
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [390, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'es-CL', timezoneId: 'America/Santiago' });
      await context.addInitScript(({ token, email, name }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ email, name, role: 'profesor', financiallyRestricted: true, canReserve: false }));
      }, { token, email, name });
      const page = await context.newPage(), errors = [], writes = [], unexpected = [];
      let blocked = true;
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          const respond = json => route.fulfill({ headers, json });
          if (req.method() === 'OPTIONS') return route.fulfill({ headers, status: 204 });
          const p = decodeURIComponent(url.pathname);
          if (p.endsWith('/me/access')) return respond({ name, role: 'profesor', financiallyRestricted: blocked, canReserve: !blocked, reason: blocked ? 'OVERDUE_DUES' : null, mpEnabled: false });
          if (p === '/mp/rates') return respond({ currency: 'CLP', nightAmount: 3500, visitAmount: 5000, nightVisitAmount: 8500 });
          if (p === '/auth/checkBlocked') return respond({ blocked: false });
          if (req.method() !== 'GET') { writes.push(p); return route.fulfill({ headers, status: 403, json: { code: 'RESERVATION_BLOCKED' } }); }
          if (p.includes('/register/profile/')) return respond({ namePlayer: name, email, category: '3', points: 100, imageUrlProfile: '/images/avatar-fantasma.png' });
          if (p === '/match-ranking/ranking') return respond({ '3': [{ id: email, nombre: name, categoria: '3', puntos: 100, rank: 1 }] });
          if (p === '/match-ranking/pending') return respond({ matches: [], member: { name, email }, totalPending: 0 });
          if (p.startsWith('/court-reserve/active/')) return respond(null);
          if (p.startsWith('/court-reserve/available/')) return respond([{ time: '08:15-10:00', slots: [{ court: 'Cancha 1', available: true, isPayed: false, isBlockedByAdmin: false, data: '' }] }]);
          if (p === '/register/names') return respond([name, 'Otro socio']);
          if (p === '/news-ctq' || p === '/match-ranking' || p.includes('/history/')) return respond([]);
          unexpected.push(p); return respond([]);
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materialize });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
        if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
        const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|svg|jpeg|ico)$/.test(url.pathname) ? `.${url.pathname}` : 'index.html');
        try { return route.fulfill({ contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }[extname(file)], body: await readFile(file) }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      });
      const label = `${engine}/${width}`;
      for (const [route, selector] of [['/profile', '.profile-container'], ['/ranking', '.ranking-wrapper'], ['/myhistory', '.history-page'], ['/updatematch', '.results-page']]) {
        await page.goto(origin + route); await page.locator(selector).waitFor();
        check(new URL(page.url()).pathname === route, `${label}: debtor can view ${route} without forced payment redirect`);
      }
      await page.goto(origin + '/dashboard'); await page.locator('.court-card.available').first().waitFor();
      await page.locator('input[type=date]').fill(DateTime.now().setZone('America/Santiago').plus({ days: 1 }).toISODate());
      await page.locator('.court-card.available').first().click();
      await page.locator('.swal2-title').filter({ hasText: 'Reservas bloqueadas' }).waitFor();
      check(writes.length === 0 && await page.locator('.modal-overlay').count() === 0, `${label}: booking click shows SweetAlert without creating hold or payment`);
      check(await page.locator('a[href="/profile"]').count() > 0 && await page.locator('a[href="/dashboard"]').count() > 0, `${label}: full role menu remains present`);
      await page.screenshot({ path: resolve(output, `blocked-${engine}-${width}.png`), animations: 'disabled' });
      await page.locator('.swal2-confirm').click();
      await page.goto(origin + '/multibooking'); await page.locator('.mbf-container').waitFor();
      await page.getByRole('button', { name: 'Reservar', exact: true }).click();
      await page.locator('.swal2-title').filter({ hasText: 'Reservas bloqueadas' }).waitFor();
      check(writes.length === 0, `${label}: multi-booking blocks before submitting`);
      await page.locator('.swal2-confirm').click();
      blocked = false;
      await page.goto(origin + '/dashboard');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('userInfo')).canReserve === true);
      await page.locator('input[type=date]').fill(DateTime.now().setZone('America/Santiago').plus({ days: 1 }).toISODate());
      await page.locator('.court-card.available').first().click();
      await page.getByRole('button', { name: 'Confirmar Reserva', exact: true }).waitFor();
      check(writes.length === 0, `${label}: refreshed payment permission restores the reservation form without a charge or new login`);
      check(errors.length === 0 && unexpected.length === 0, `${label}: no page errors or unexpected requests`);
      report.views.push({ engine, width, writes });
      await context.close();
    }
    await browser.close(); browser = null;
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await writeFile(resolve(output, 'browser-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checks: report.checks.length, error: report.error }));
}
