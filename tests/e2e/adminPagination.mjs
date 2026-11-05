import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: adminPagination.mjs BUILD OUTPUT PLAYWRIGHT');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const build = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://ctq-pagination.example.invalid', api = 'https://api.ctq-pagination.example.invalid';
const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const token = `fixture.${Buffer.from(JSON.stringify({ email: 'admin@example.invalid', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
const report = { executedAt: new Date().toISOString(), status: 'running', checks: [], views: [], errors: [], writes: [] };
const check = (value, message) => { assert(value, message); report.checks.push(message); };
await mkdir(output, { recursive: true });
let browser, page;
try {
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [320, 390, 700, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width <= 820, locale: 'es-CL' });
      await context.addInitScript(token => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ name: 'Admin fixture', email: 'admin@example.invalid', role: 'admin' }));
      }, token);
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (request.method() !== 'GET') report.writes.push(`${request.method()} ${url.pathname}`);
          if (url.pathname.startsWith('/admin-directory/') || url.pathname === '/court-reserve/my-history') {
            const history = url.pathname === '/court-reserve/my-history';
            const total = history ? 61 : url.pathname.endsWith('/members') ? 148 : 48;
            const pageSize = Number(url.searchParams.get('pageSize') || 25);
            const pages = Math.ceil(total / pageSize), current = Math.min(Number(url.searchParams.get('page') || 1), pages);
            const items = Array.from({ length: Math.min(pageSize, total - (current - 1) * pageSize) }, (_, i) => {
              const n = (current - 1) * pageSize + i + 1;
              return url.pathname.endsWith('/members') ? {
                _id: String(n).padStart(24, '0'), namePlayer: `Socio Fixture ${n}`, email: `socio${n}@example.invalid`,
                role: 'user', partnerType: 'Titular', statePlayer: true, updatePayment: true, canReserve: true,
              } : {
                idCourtReserve: `fixture-${n}`, player1: 'Campeonato - Campeonato Menores Rotary',
                court: `Cancha ${(n % 3) + 1}`, dateToPlay: '2030-11-14', turn: '14:15-16:00', state: n % 5 !== 1,
              };
            });
            return route.fulfill({ headers, json: { items, total, cancelled: history ? 13 : 0, page: current, pageSize, pages } });
          }
          return route.fulfill({ headers, json: url.pathname.endsWith('/me/access') ? { name: 'Admin fixture', role: 'admin', canReserve: true } : [] });
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: css });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: js });
        if (url.origin !== origin) return route.fulfill({ body: '' });
        const file = url.pathname.includes('.') ? resolve(build, '.' + url.pathname) : resolve(build, 'index.html');
        assert(file.startsWith(build + '/'));
        return route.fulfill({ contentType: mime[extname(file)] || 'text/html', body: await readFile(file) });
      });
      page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      for (const view of ['adminregister', 'adminreserves', 'myhistory']) {
        const label = `${engine}/${width}/${view}`;
        await page.goto(`${origin}/${view}`);
        const pagination = page.locator('.ad-pagination');
        await pagination.waitFor();
        await page.getByRole('button', { name: 'Página siguiente', exact: true }).scrollIntoViewIfNeeded();
        const geometry = await pagination.evaluate(element => {
          const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, cy: r.y + r.height / 2 }; };
          return {
            summary: rect(element.querySelector('[role="status"]')), field: rect(element.querySelector('.ap-field')),
            label: rect(element.querySelector('.ap-field > label')), select: rect(element.querySelector('.ap-select')),
            actions: rect(element.querySelector('.ad-page-actions')), root: rect(element),
            scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
          };
        });
        check(Math.abs(geometry.label.cy - geometry.select.cy) <= 1, `${label}: page-size label and selector are vertically centered`);
        if (width > 700) {
          check(Math.abs(geometry.summary.cy - geometry.actions.cy) <= 1 && Math.abs(geometry.select.cy - geometry.actions.cy) <= 1,
            `${label}: desktop pagination uses one aligned row`);
          check(geometry.summary.right < geometry.field.x && geometry.field.right < geometry.actions.x,
            `${label}: desktop groups do not overlap`);
        } else {
          check(Math.abs(geometry.summary.cy - geometry.field.cy) <= 1 && geometry.actions.y >= geometry.field.bottom + 7,
            `${label}: mobile pagination uses count and selector above navigation`);
          check(geometry.summary.right <= geometry.field.x && geometry.root.height <= 102,
            `${label}: two compact mobile rows have no overlap`);
        }
        check(geometry.scrollWidth <= width + 1 && geometry.actions.right <= width && geometry.field.right <= width,
          `${label}: pagination fits the viewport`);
        if (view === 'myhistory') {
          check(JSON.stringify(await page.locator('.history-kpis dd').allTextContents()) === '["61","13"]' && await page.locator('.history-table tbody tr').count() === 25,
            `${label}: history shows one page and complete total/cancelled counts`);
          if ([390, 820, 1440].includes(width)) {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: resolve(output, `${engine}-${width}-history-page.png`), fullPage: true, animations: 'disabled' });
          }
        }
        await pagination.screenshot({ path: resolve(output, `${engine}-${width}-${view}.png`), animations: 'disabled' });
        const choose = async size => {
          const control = page.getByRole('combobox', { name: 'Por página', exact: true });
          await pagination.scrollIntoViewIfNeeded();
          await control.focus(); await control.press('ArrowDown');
          await page.getByRole('option', { name: String(size), exact: true }).click();
          await page.waitForURL(url => (url.searchParams.get('pageSize') || '25') === String(size));
          await page.waitForFunction(size => document.querySelector('.ad-pagination .ap-select__single-value')?.textContent === String(size) && !document.querySelector('.ad-loading')?.textContent.trim(), size);
        };
        await choose(100);
        check(await pagination.locator('.ap-select__single-value').innerText() === '100' && await pagination.evaluate(el => el.scrollWidth <= el.clientWidth + 1),
          `${label}: the three-digit page size fits and remains functional`);
        await choose(25);
        await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.ad-page-actions > span')?.textContent.startsWith('2 /'));
        check(new URL(page.url()).searchParams.get('page') === '2', `${label}: navigation still updates the requested page`);
        report.views.push({ engine, width, view, geometry });
      }
      await context.close();
    }
    await browser.close(); browser = null;
  }
  check(report.errors.length === 0 && report.writes.length === 0, 'No runtime errors or business writes');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, views: report.views.length, failure: report.failure }));
}
