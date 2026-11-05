import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node siteShell.mjs BUILD OUTPUT PLAYWRIGHT');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const build = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://ctq-shell.example.invalid', api = 'https://api.ctq-shell.example.invalid';
const token = ['e30', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture'].join('.');
const times = ['08:15-10:00', '10:15-12:00', '12:15-14:00', '14:15-16:00', '16:15-18:00', '18:15-20:00', '20:15-22:00', '22:15-00:00'];
const slots = times.map(time => ({ time, slots: [1, 2, 3].map(n => ({ court: `Cancha ${n}`, data: '', available: true, isPayed: false, isBlockedByAdmin: false })) }));
const materializeCss = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const report = { executedAt: new Date().toISOString(), status: 'running', checks: [], views: [], errors: [], writes: [], scope: 'Built React/Materialize, synthetic APIs and authentication; no real club data' };
const check = (value, message) => { assert(value, message); report.checks.push(message); };
await mkdir(output, { recursive: true });
let browser, page;
try {
  for (const engine of ['webkit', 'chromium']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [320, 390, 600, 820, 1024, 1440]) {
      const label = `${engine}/${width}`;
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width <= 1024, locale: 'es-CL' });
      await ctx.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          if (request.method() !== 'GET' && url.pathname !== '/auth/checkBlocked') report.writes.push(`${request.method()} ${url.pathname}`);
          const data = url.pathname.endsWith('/me/access') ? { name: 'Administrador fixture', role: 'admin', canReserve: true, financiallyRestricted: false }
            : url.pathname === '/auth/checkBlocked' ? { blocked: false }
            : url.pathname === '/court-reserve/my-history' ? { items: [], total: 0, cancelled: 0, page: 1, pageSize: 25, pages: 1 }
            : url.pathname.startsWith('/court-reserve/available/') ? slots
            : url.pathname.startsWith('/court-reserve/active/') ? null : [];
          return route.fulfill({ json: data });
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materializeCss });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
        if (url.origin !== origin) return route.fulfill({ body: '' });
        const path = url.pathname.includes('.') ? resolve(build, '.' + url.pathname) : resolve(build, 'index.html');
        assert(path.startsWith(build + '/'));
        return route.fulfill({ contentType: mime[extname(path)] || 'text/html', body: await readFile(path) });
      });
      page = await ctx.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
      async function inspect(path) {
        await page.goto(origin + path);
        await page.locator('.app-route-loader').waitFor({ state: 'hidden' });
        await page.locator('.ctq-footer').waitFor();
        check(await page.locator('.ctq-footer').count() === 1, `${label}${path}: one global footer`);
        const content = await page.locator('.ctq-footer').innerText();
        check(content.includes(`Club de Tenis Quintero · ${new Date().getFullYear()}`) && /v\d+\.\d+\.\d+/.test(content) && /Compilación [a-f\d]{7}/.test(content) && !content.includes('Local'), `${label}${path}: compiled identity and year shown without a local label`);
        const top = await page.evaluate(() => {
          const nav = document.querySelector('.ctq-nav').getBoundingClientRect();
          const main = document.querySelector('.app-content-wrapper').getBoundingClientRect();
          return { navTop: nav.top, navBottom: nav.bottom, mainTop: main.top };
        });
        check(Math.abs(top.navTop) < 1 && top.mainTop >= top.navBottom - 1, `${label}${path}: header reserves its flow space`);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(80);
        const metrics = await page.evaluate(() => {
          const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, right: r.right, bottom: r.bottom, height: r.height }; };
          return {
            nav: rect(document.querySelector('.ctq-nav')),
            main: rect(document.querySelector('.app-content-wrapper')),
            home: document.querySelector('.home-page') ? rect(document.querySelector('.home-page')) : null,
            contact: document.querySelector('.home-section') ? rect(document.querySelector('.home-section')) : null,
            footer: rect(document.querySelector('.ctq-footer')),
            inner: rect(document.querySelector('.ctq-footer__inner')),
            footerPosition: getComputedStyle(document.querySelector('.ctq-footer')).position,
            text: [...document.querySelectorAll('.ctq-footer span')].map(el => ({ ...rect(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })),
            scrollWidth: document.documentElement.scrollWidth,
            viewportHeight: innerHeight,
          };
        });
        check(Math.abs(metrics.nav.y) < 1, `${label}${path}: header remains visible after scrolling`);
        check(metrics.footerPosition !== 'fixed' && metrics.footer.y >= metrics.main.bottom - 1 && metrics.footer.bottom <= metrics.viewportHeight + 1, `${label}${path}: footer follows content without covering it`);
        check(Math.abs(metrics.footer.y - metrics.main.bottom) < 1, `${label}${path}: footer directly follows natural page height, with no flex filler`);
        if (metrics.home) check(Math.abs(metrics.home.bottom - metrics.contact.bottom - 24) < 1, `${label}${path}: Home keeps exactly 24px after contacts without viewport-height filler`);
        if (path === '/ruta-inexistente') check(metrics.footer.bottom < metrics.viewportHeight / 2, `${label}${path}: a short page does not push the footer to the screen bottom`);
        check(metrics.scrollWidth <= width + 1 && metrics.text.every(t => t.x >= metrics.inner.x && t.right <= metrics.inner.right + 1 && t.scrollWidth <= t.clientWidth + 1), `${label}${path}: footer fits without clipped version text`);
        report.views.push({ engine, width, path, metrics });
      }
      for (const path of ['/', '/login', '/ruta-inexistente']) {
        await inspect(path);
        if (path === '/') {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(80);
          await page.screenshot({ path: resolve(output, `${engine}-${width}-home.png`), fullPage: true, animations: 'disabled' });
        }
      }
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ name: 'Administrador fixture', email: 'admin@example.invalid', role: 'admin', canReserve: true }));
      }, token);
      await inspect('/dashboard');
      await page.screenshot({ path: resolve(output, `${engine}-${width}-footer.png`), animations: 'disabled' });
      const desktop = width >= 993;
      const trigger = page.locator(desktop ? '.dropdown-trigger' : '.sidenav-trigger');
      const activate = locator => width <= 1024 ? locator.tap() : locator.click();
      await activate(trigger);
      const panel = page.locator(desktop ? '#dropdown1' : '#mobile-nav');
      await activate(panel.getByRole('link', { name: 'Mi historial', exact: true }));
      await page.waitForURL(url => url.pathname === '/myhistory');
      check(await page.locator('.ctq-footer').count() === 1 && await page.evaluate(() => !!localStorage.getItem('token')), `${label}: fixed-header menu navigates to history and preserves the global footer`);
      await activate(trigger);
      await activate(panel.getByRole('link', { name: 'Logout', exact: true }));
      await page.waitForFunction(() => !localStorage.getItem('token'));
      await page.waitForURL(url => ['/', '/login'].includes(url.pathname));
      await page.locator('.ctq-footer').waitFor();
      check(await page.locator('.ctq-footer').count() === 1, `${label}: logout clears authentication and the public destination keeps the footer`);
      await ctx.close();
    }
    await browser.close(); browser = null;
  }
  check(report.errors.length === 0, 'No browser runtime exceptions');
  check(report.writes.length === 0, 'No business writes');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checks: report.checks.length, failure: report.failure }));
}
