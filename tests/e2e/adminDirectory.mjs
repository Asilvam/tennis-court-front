import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [buildArg, outputArg, playwrightArg, backend, token] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg && backend && token, 'Usage: adminDirectory.mjs BUILD OUTPUT PLAYWRIGHT ISOLATED_BACKEND JWT');
assert(new URL(backend).hostname === '127.0.0.1', 'Only disposable loopback backend allowed');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const build = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://ctq-directory.example.invalid', api = 'https://api.ctq-directory.example.invalid';
const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const report = { executedAt: new Date().toISOString(), status: 'running', checks: [], views: [], errors: [], writes: [], legacyReads: [] };
const check = (value, message) => { assert(value, message); report.checks.push(message); };
await mkdir(output, { recursive: true });
let browser, page;
try {
  for (const engine of ['webkit', 'chromium']) {
    browser = await ({ webkit, chromium }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [320, 390, 820, 1440]) {
      const label = `${engine}/${width}`;
      const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width <= 820, locale: 'es-CL' });
      await context.addInitScript(token => { localStorage.setItem('token', token); localStorage.setItem('userInfo', JSON.stringify({ role: 'admin', email: 'socio0@example.invalid', name: 'Admin fixture' })); }, token);
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (request.method() !== 'GET') report.writes.push(`${request.method()} ${url.pathname}`);
          if (url.pathname.startsWith('/admin-directory/')) {
            const response = await fetch(backend + url.pathname + url.search, { headers: { Authorization: request.headers().authorization } });
            return route.fulfill({ status: response.status, headers: { ...headers, 'content-type': 'application/json' }, body: await response.text() });
          }
          if (url.pathname === '/register' || url.pathname === '/court-reserve') report.legacyReads.push(url.pathname);
          if (url.pathname.startsWith('/player-category-points/') && url.pathname.endsWith('/editor')) return route.fulfill({ headers, json: { player: { name: 'Socio fixture', email: decodeURIComponent(url.pathname.split('/')[2]), active: true }, categories: [], revision: 'fixture' } });
          const data = url.pathname.endsWith('/me/access') ? { name: 'Admin fixture', role: 'admin', canReserve: true }
            : url.pathname.endsWith('/access') ? { memberId: url.pathname.split('/').at(-2), hasOverdueDues: false, canReserve: true } : [];
          return route.fulfill({ headers, json: data });
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: css });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: js });
        if (url.origin !== origin) return route.fulfill({ body: '' });
        const path = url.pathname.includes('.') ? resolve(build, '.' + url.pathname) : resolve(build, 'index.html');
        assert(path.startsWith(build + '/'));
        return route.fulfill({ contentType: mime[extname(path)] || 'text/html', body: await readFile(path) });
      });
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
      const idle = async () => { await page.locator('.ad-loading').waitFor(); await page.waitForFunction(() => !document.querySelector('.ad-loading')?.textContent.trim()); };
      const filter = async (name, option) => {
        const toggle = page.getByRole('button', { name: /^Filtros/ });
        if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
        const control = page.getByRole('combobox', { name, exact: true });
        await control.focus(); await control.press('ArrowDown');
        await page.getByRole('option', { name: option, exact: true }).click(); await idle();
      };
      await page.goto(origin + '/adminregister?page=2&state=active'); await idle();
      check(await page.locator('.user-table tbody tr').count() === 25 && await page.locator('.ad-page-actions').innerText() === '2 / 3', `${label}: page and filters restore from URL`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: users table and controls fit the viewport`);
      await page.screenshot({ path: resolve(output, `${engine}-${width}-users.png`), fullPage: true, animations: 'disabled' });
      const returnUrl = page.url();
      await page.getByRole('button', { name: /^Administrar categorías de/ }).first().click();
      await page.getByRole('button', { name: 'Volver a socios', exact: true }).click();
      await page.waitForURL(returnUrl); await idle();
      check(new URL(page.url()).searchParams.get('page') === '2' && new URL(page.url()).searchParams.get('state') === 'active', `${label}: returning from categories restores filters and page`);
      await filter('Por página', '50');
      await page.waitForFunction(() => document.querySelectorAll('.admin-user-name').length === 50);
      check(new URL(page.url()).searchParams.get('pageSize') === '50' && !new URL(page.url()).searchParams.has('page'), `${label}: changing page size reloads 50 records from page one`);
      await filter('Por página', '25');
      await page.waitForFunction(() => document.querySelectorAll('.admin-user-name').length === 25);
      const search = page.getByRole('searchbox', { name: 'Buscar por nombre o correo' });
      await search.fill('jose zuniga');
      await page.waitForURL(url => url.searchParams.get('search') === 'jose zuniga'); await idle();
      await page.waitForFunction(() => document.querySelectorAll('.admin-user-name').length === 1 && document.querySelector('.admin-user-name').textContent === 'José Zúñiga Fixture');
      check(await page.locator('.admin-user-name').innerText() === 'José Zúñiga Fixture' && !new URL(page.url()).searchParams.has('page'), `${label}: quick search spans all records, ignores accents and returns to page one`);
      await filter('Tipo de socio', 'Carga');
      check(await page.locator('.admin-user-name').count() === 1, `${label}: combined type filter includes legacy Familiar`);
      await page.getByRole('button', { name: 'Limpiar filtros' }).click(); await idle();
      await page.waitForFunction(() => document.querySelectorAll('.admin-user-name').length === 25);
      await search.fill('Socio 025'); await page.waitForURL(url => url.searchParams.get('search') === 'Socio 025'); await idle();
      await page.getByRole('button', { name: 'Editar a Socio 025', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Editar usuario', exact: true }); await dialog.waitFor();
      if (width <= 820) {
        const trigger = page.getByRole('button', { name: 'Titular asociado', exact: true });
        await trigger.waitFor(); await page.waitForFunction(() => !document.querySelector('#edit-member-titular-trigger')?.disabled);
        await trigger.click();
        await page.locator('.option-picker-input').fill('Titular Fuera');
        check(await page.getByRole('option').filter({ hasText: 'Titular Fuera de Página' }).count() === 1, `${label}: titular search is independent of the visible member page`);
        await page.getByRole('button', { name: 'Volver', exact: true }).click();
      } else {
        const control = page.getByRole('combobox', { name: 'Titular asociado', exact: true });
        await control.waitFor(); await control.fill('Titular Fuera');
        check(await page.getByRole('option').filter({ hasText: 'Titular Fuera de Página' }).count() === 1, `${label}: desktop titular lookup includes off-page candidates`);
        await page.keyboard.press('Escape');
      }
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      check(new URL(page.url()).searchParams.get('search') === 'Socio 025', `${label}: closing the detail preserves filters`);
      await page.goto(origin + '/adminreserves'); await idle();
      check(await page.locator('.ar-table tbody tr').count() === 25, `${label}: reservations are paginated`);
      await page.getByRole('searchbox', { name: 'Buscar jugador' }).fill('jose zuniga');
      await page.waitForURL(url => url.searchParams.get('search') === 'jose zuniga'); await idle();
      await page.waitForFunction(() => document.querySelectorAll('.ar-player-name').length === 1 && document.querySelector('.ar-player-name').textContent === 'Jugador 060');
      check(await page.locator('.ar-table tbody tr').count() === 1 && await page.locator('.ar-player-name').innerText() === 'Jugador 060', `${label}: reservation search finds a partner beyond page one`);
      await page.getByRole('button', { name: 'Limpiar filtros' }).click(); await idle();
      await filter('Cancha', 'Cancha 2');
      await page.waitForFunction(() => document.querySelectorAll('.ar-cell-court').length > 0 && [...document.querySelectorAll('.ar-cell-court')].every(el => el.textContent.trim() === 'Cancha 2'));
      check((await page.locator('.ar-cell-court').allTextContents()).every(text => text.trim() === 'Cancha 2'), `${label}: court filter is applied in the backend`);
      const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.ad-search-row,.ad-filters.is-open,.ad-pagination')].map(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth })) }));
      check(geometry.scrollWidth <= width + 1 && geometry.controls.every(el => el.scrollWidth <= el.width + 1), `${label}: controls fit without horizontal overflow`);
      await page.screenshot({ path: resolve(output, `${engine}-${width}-reserves.png`), fullPage: true, animations: 'disabled' });
      report.views.push({ engine, width, geometry }); await context.close();
    }
    await browser.close(); browser = null;
  }
  check(report.errors.length === 0 && report.writes.length === 0 && report.legacyReads.length === 0, 'No runtime errors, business writes or downloads of unpaginated legacy listings');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checks: report.checks.length, failure: report.failure }));
}
