import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [distArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(distArg && outputArg && playwrightArg, 'Usage: node tests/e2e/navigationLayout.mjs BUILD OUTPUT PLAYWRIGHT_MODULE');
const dist = resolve(distArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role: 'admin', email: 'fixture@example.invalid', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'isolated-fixture-signature'].join('.');
const report = { date: '2026-10-29', scope: 'Local React build, mocked session/news; no live club API', passed: [], views: [] };
let browser, page;
const check = (condition, name) => { assert(condition, name); report.passed.push(name); };
try {
  await mkdir(output, { recursive: true });
  report.navigationCssSha256 = createHash('sha256').update(await readFile(resolve(root, 'src/styles/Navigation.css'))).digest('hex');
  const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
  const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [390, 820, 992, 993, 1024, 1280, 1399, 1400, 1440, 2068, 2560]) {
      const label = `${engine}/${width}`;
      const context = await browser.newContext({ viewport: { width, height: 1035 }, locale: 'es-CL' });
      await context.addInitScript(token => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ name: 'Administrador fixture', email: 'fixture@example.invalid', role: 'admin' }));
      }, token);
      page = await context.newPage();
      const errors = [], unexpected = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (request.method() === 'GET' && url.pathname.endsWith('/news-ctq')) return route.fulfill({ headers, json: [] });
          if (url.pathname.endsWith('/me/access')) return route.fulfill({ headers, json: { role: 'admin', name: 'Administrador fixture', financiallyRestricted: false } });
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
      await page.goto(origin);
      await page.locator('.home-hero__actions').waitFor();
      await page.locator('.home-hero__flag-image').first().evaluate(image => image.decode());
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const rect = selector => {
          const element = document.querySelector(selector), bounds = element.getBoundingClientRect(), style = getComputedStyle(element);
          return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight) };
        };
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, wrapper: rect('.ctq-nav__wrapper'), brand: rect('.ctq-nav__brand'), links: rect('.ctq-nav__links'), hero: rect('.home-hero__content'), menu: rect('.ctq-nav__trigger i') };
      });
      report.views.push({ engine, browser: browser.version(), width, metrics });
      check(metrics.documentWidth <= width + 1, `${label}: no page horizontal overflow`);
      if (width >= 993) {
        check(Math.abs(metrics.wrapper.left - metrics.hero.left) < 1 && Math.abs(metrics.wrapper.right - metrics.hero.right) < 1, `${label}: navigation shell matches home shell`);
        check(Math.abs(metrics.brand.left - metrics.hero.left - metrics.hero.paddingLeft) < 1, `${label}: title aligns with content left edge`);
        check(Math.abs(metrics.links.right - metrics.hero.right + metrics.hero.paddingRight) < 1, `${label}: menu aligns with content right edge`);
        await page.locator('.ctq-nav .dropdown-trigger').click();
        await page.locator('#dropdown1').waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.querySelector('#dropdown1').getBoundingClientRect().width >= 239);
        const dropdown = await page.locator('#dropdown1').boundingBox();
        check(dropdown.x >= metrics.hero.left && dropdown.x + dropdown.width <= metrics.hero.right - metrics.hero.paddingRight + 1, `${label}: open menu stays within content width`);
        await page.getByRole('link', { name: 'Mensualidades', exact: true }).first().waitFor();
        await page.mouse.click(width - 8, 70);
        await page.locator('#dropdown1').waitFor({ state: 'hidden' });
      } else {
        check(metrics.brand.left >= metrics.menu.right && metrics.brand.right <= width, `${label}: mobile title and hamburger do not overlap`);
        await page.locator('.sidenav-trigger').click();
        await page.locator('#mobile-nav').waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.querySelector('#mobile-nav').getBoundingClientRect().left >= -1);
        check(await page.locator('#mobile-nav').evaluate(element => element.getBoundingClientRect().right > 0), `${label}: mobile menu opens`);
        await page.locator('.sidenav-overlay').click({ position: { x: width - 10, y: 700 } });
        await page.waitForFunction(() => document.querySelector('#mobile-nav').getBoundingClientRect().right <= 1);
      }
      if ([390, 1280, 2068].includes(width)) await page.screenshot({ path: resolve(output, `navigation-${engine}-${width}.png`), fullPage: true });
      check(errors.length === 0 && unexpected.length === 0, `${label}: no page errors or unexpected APIs`);
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
  await writeFile(resolve(output, 'navigation-layout.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checkpoints: report.passed.length, error: report.error }));
}
