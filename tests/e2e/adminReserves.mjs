import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node tests/e2e/adminReserves.mjs BUILD OUTPUT PLAYWRIGHT_MODULE');
const dist = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role: 'admin', email: 'fixture@example.invalid', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture-signature'].join('.');
const fixtures = [
  { idCourtReserve: 'one', player1: 'Socio de prueba con nombre y dos apellidos compuestos muy largos', court: 'Cancha 1', dateToPlay: '2026-10-29', turn: '08:15-10:00', state: true },
  { idCourtReserve: 'two', player1: 'NombreSinEspacios'.repeat(5), court: 'Cancha 12', dateToPlay: '2026-11-01', turn: '20:00-21:30', state: true },
  { idCourtReserve: 'three', player1: 'Socio de prueba con nombre y dos apellidos compuestos muy largos', court: 'Cancha 3', dateToPlay: '2026-11-02', turn: '18:30-20:00', state: true },
];
const report = { date: '2026-10-29', scope: 'Real React build with mocked reservations/deletes; no club/provider traffic or real writes', views: [], passed: [], captures: [], sourceHashes: {} };
const check = (condition, message) => { assert(condition, message); report.passed.push(message); };
let browser, page;
try {
  await mkdir(output, { recursive: true });
  for (const file of ['src/components/AdminReserves.tsx', 'src/styles/AdminReserves.css', 'src/index.css']) report.sourceHashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
  const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
  const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [320, 390, 767, 768, 820, 1024, 1440]) {
      const label = `${engine}/${width}`;
      const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'es-CL' });
      await context.addInitScript(token => { localStorage.setItem('token', token); localStorage.setItem('userInfo', JSON.stringify({ name: 'Admin fixture', email: 'fixture@example.invalid', role: 'admin' })); }, token);
      page = await context.newPage();
      let rows = [...fixtures], failDelete = false;
      const requests = [], unexpected = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          requests.push({ path: url.pathname, method: request.method() });
          if (url.pathname.endsWith('/me/access')) return route.fulfill({ headers, json: { name: 'Admin fixture', role: 'admin', financiallyRestricted: false } });
          if (request.method() === 'GET' && url.pathname === '/court-reserve') return route.fulfill({ headers, json: rows });
          if (request.method() === 'DELETE' && url.pathname.startsWith('/court-reserve/')) {
            if (failDelete) return route.fulfill({ headers, status: 503, json: { message: 'Simulated error' } });
            rows = rows.filter(row => row.idCourtReserve !== url.pathname.split('/').at(-1));
            return route.fulfill({ headers, json: { success: true } });
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
      await page.goto(`${origin}/adminreserves`);
      await page.locator('.ar-table tbody tr').first().waitFor(); await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const bounds = element => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
        const table = document.querySelector('.ar-table'), cell = table.querySelector('td'), header = table.querySelector('th'), button = table.querySelector('button');
        const groups = [...table.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(bounds));
        const overlap = groups.some(cells => cells.some((a,i) => cells.slice(i+1).some(b => Math.min(a.right,b.right)-Math.max(a.x,b.x)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)));
        const clippedNames = [...table.querySelectorAll('.ar-player-name')].some(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, tableWidth: table.scrollWidth, wrapperWidth: table.parentElement.clientWidth, overlap, clippedNames, firstRow: groups[0], button: bounds(button), cellColor: getComputedStyle(cell).color, cellBackground: getComputedStyle(cell).backgroundColor, headerBackground: getComputedStyle(header).backgroundColor, headerColor: getComputedStyle(header).color, buttonColor: getComputedStyle(button).color, heroBackground: getComputedStyle(document.querySelector('.ar-hero')).backgroundImage };
      });
      check(metrics.documentWidth <= width + 1 && metrics.tableWidth <= metrics.wrapperWidth + 1, `${label}: no page or table horizontal scroll`);
      check(!metrics.overlap && !metrics.clippedNames, `${label}: full names fit and cells do not overlap`);
      check(metrics.button.width === 44 && metrics.button.height === 44, `${label}: stable 44px delete target`);
      check(metrics.cellColor === 'rgb(248, 250, 252)' && metrics.headerColor === 'rgb(125, 211, 252)' && metrics.buttonColor === 'rgb(252, 165, 165)', `${label}: rendered text, heading and destructive colors match CTQ`);
      check(metrics.heroBackground === 'none' && metrics.headerBackground === 'rgba(17, 37, 68, 0.96)' && metrics.cellBackground === (width < 768 ? 'rgba(0, 0, 0, 0)' : 'rgba(10, 27, 51, 0.98)'), `${label}: real header/cell backgrounds are dark, not legacy white/bright blue`);
      check(width < 768 ? metrics.firstRow[1].y > metrics.firstRow[0].y && Math.abs(metrics.firstRow[4].y - metrics.firstRow[0].y) < metrics.firstRow[0].height : metrics.firstRow.every(cell => Math.abs(cell.y - metrics.firstRow[0].y) < 1), `${label}: compact mobile rows and aligned tablet/desktop columns`);
      check((await page.locator('.ar-cell-turn').first().innerText()).includes('08:15-10:00') && (await page.locator('time').first().innerText()).includes('2026'), `${label}: full time range and year visible`);
      const remove = page.locator('.ar-btn-delete').first();
      await remove.focus();
      check(await remove.evaluate(el => getComputedStyle(el).outlineColor === 'rgb(125, 211, 252)' && getComputedStyle(el).outlineWidth === '2px'), `${label}: keyboard focus uses CTQ accent`);
      await page.locator('.ar-table tbody tr').first().hover();
      const hover = await page.locator('.ar-cell-player').first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
      check(hover.color === 'rgb(248, 250, 252)' && hover.background === (width < 768 ? 'rgba(0, 0, 0, 0)' : 'rgba(125, 211, 252, 0.06)'), `${label}: hover stays dark and readable`);
      await page.mouse.move(0, 0);
      if ([320, 390, 820, 1440].includes(width)) { const capture = `active-reserves-${engine}-${width}.png`; await page.screenshot({ path: resolve(output, capture), fullPage: true }); report.captures.push(capture); }
      await remove.click(); await page.locator('.swal2-cancel').click();
      check(requests.every(request => request.method !== 'DELETE'), `${label}: cancelling SweetAlert does not delete`);
      failDelete = true; await remove.click(); await page.locator('.swal2-confirm').click();
      await page.getByRole('heading', { name: 'Error', exact: true }).waitFor(); await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      check(await page.locator('.ar-table tbody tr').count() === 3, `${label}: failed delete keeps row`);
      failDelete = false; await remove.click(); await page.getByRole('heading', { name: '¿Eliminar reserva?', exact: true }).waitFor();
      check(await page.locator('.swal2-confirm').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(244, 232, 90)'), `${label}: confirmation inherits CTQ yellow`);
      await page.locator('.swal2-confirm').click(); await page.getByRole('heading', { name: 'Eliminada', exact: true }).waitFor(); await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      check(await page.locator('.ar-table tbody tr').count() === 2 && rows.length === 2, `${label}: successful fixture delete removes only one row`);
      rows = []; await page.reload(); await page.getByText('No hay reservas activas.', { exact: true }).waitFor();
      check(await page.locator('.ar-table').count() === 0 && await page.locator('.ar-empty').evaluate(el => getComputedStyle(el).color !== 'rgb(51, 65, 85)'), `${label}: empty state readable without a white panel`);
      check(errors.length === 0 && unexpected.length === 0, `${label}: no page errors or live APIs`);
      report.views.push({ engine, browser: browser.version(), width, metrics, requests });
      await context.close();
      console.log(JSON.stringify({ engine, width, status: 'passed' }));
    }
    await browser.close(); browser = null;
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
} finally {
  if (browser) await browser.close();
  await writeFile(resolve(output, 'active-reserves.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checkpoints: report.passed.length, error: report.error }));
}
