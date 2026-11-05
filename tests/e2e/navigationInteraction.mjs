import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node navigationInteraction.mjs BUILD OUTPUT PLAYWRIGHT');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const build = resolve(buildArg), output = resolve(outputArg);
const origin = 'https://ctq-navigation.example.invalid';
const api = 'https://api.ctq-navigation.example.invalid';
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const token = ['e30', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture'].join('.');
const report = { executedAt: new Date().toISOString(), status: 'running',
  scope: 'Built React and real Materialize; synthetic login/API, no real accounts or messages',
  cases: [], checks: [], errors: [], blockedWhatsAppRequests: 0 };
const check = (value, message) => { assert(value, message); report.checks.push(message); };
const materializeCss = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
await mkdir(output, { recursive: true });
let browser;
try {
  for (const engine of ['webkit', 'chromium']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium'
      ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const [width, height] of [[390, 844], [820, 1180], [1024, 1366], [1366, 1024], [1440, 1000]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true,
        locale: 'es-CL', ...(engine === 'webkit' ? { isMobile: true } : {}) });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'wa.me') {
          report.blockedWhatsAppRequests++;
          return route.fulfill({ contentType: 'text/html', body: 'Blocked fixture WhatsApp request' });
        }
        if (url.origin === api) {
          const data = url.pathname === '/auth/login'
            ? { accessToken: token, namePlayer: 'Administrador fixture', role: 'admin', canReserve: true, financiallyRestricted: false }
            : url.pathname.endsWith('/me/access')
              ? { name: 'Administrador fixture', role: 'admin', canReserve: true, financiallyRestricted: false }
              : url.pathname === '/court-reserve/my-history' ? { items: [], total: 0, cancelled: 0, page: 1, pageSize: 25, pages: 1 } : [];
          return route.fulfill({ json: data });
        }
        if (url.pathname.endsWith('/materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materializeCss });
        if (url.pathname.endsWith('/materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
        if (url.origin !== origin) return route.fulfill({ body: '' });
        const path = url.pathname.includes('.') ? resolve(build, '.' + url.pathname) : resolve(build, 'index.html');
        assert(path.startsWith(build + '/'));
        return route.fulfill({ body: await readFile(path), contentType: mime[extname(path)] || 'text/html' });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(origin);
      const label = `${engine}/${width}x${height}`;
      check(await page.locator('.dropdown-trigger').isHidden(), `${label}: anonymous dropdown trigger hidden`);
      check(await page.locator('#dropdown1').isHidden(), `${label}: anonymous dropdown panel hidden`);
      if (width < 993) {
        await page.locator('.sidenav-trigger').tap();
        await page.locator('#mobile-nav').getByRole('link', { name: 'Login', exact: true }).tap();
        await page.waitForURL('**/login');
        check(true, `${label}: anonymous sidebar Login works`);
      }
      await page.screenshot({ path: resolve(output, `${engine}-${width}-anonymous.png`), fullPage: true });
      async function login() {
        if (await page.evaluate(() => !!localStorage.getItem('token'))) {
          await page.goto(origin);
          return;
        }
        await page.goto(origin + '/login');
        await page.locator('#email').fill('admin@example.invalid');
        await page.locator('#password').fill('Fixture-only-password');
        await page.getByRole('button', { name: 'Ingresar', exact: true }).tap();
        await page.waitForURL(url => url.pathname === '/');
        await page.waitForFunction(() => localStorage.getItem('token'));
      }
      const desktop = width >= 993;
      for (const delay of desktop ? [null, 40, 80, 180] : [null]) {
        for (const action of ['Mi historial', 'Logout']) {
          await login();
          await page.locator(desktop ? '.dropdown-trigger' : '.sidenav-trigger').tap();
          await page.waitForTimeout(400);
          const panel = page.locator(desktop ? '#dropdown1' : '#mobile-nav');
          const item = panel.getByRole('link', { name: action, exact: true });
          await item.scrollIntoViewIfNeeded();
          const box = await item.boundingBox();
          assert(box);
          const x = box.x + box.width / 2, y = box.y + box.height / 2;
          let targetAtClick;
          if (delay === null) await item.tap();
          else {
            await item.dispatchEvent('touchend');
            await page.waitForTimeout(delay);
            targetAtClick = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.textContent.trim(), { x, y });
            check(targetAtClick === action, `${label}/${action}/${delay}ms: target remains stable after touchend`);
            await page.mouse.click(x, y);
          }
          if (action === 'Mi historial') {
            await page.waitForURL(url => url.pathname === '/myhistory');
            check(await page.evaluate(() => !!localStorage.getItem('token')), `${label}/${delay}: history preserves session`);
          } else {
            await page.waitForFunction(() => !localStorage.getItem('token') && !localStorage.getItem('userInfo'));
            check(new URL(page.url()).pathname === '/' && !new URL(page.url()).hash, `${label}/${delay}: logout returns home without anchor navigation`);
          }
          await page.waitForTimeout(400);
          check(await panel.isHidden() || await panel.evaluate(el => el.getBoundingClientRect().right <= 0), `${label}/${action}/${delay}: menu closes`);
          report.cases.push({ engine, width, height, action, mode: delay === null ? 'native tap' : 'controlled touchend then delayed click', delayMs: delay, targetAtClick, path: new URL(page.url()).pathname });
        }
      }
      await page.screenshot({ path: resolve(output, `${engine}-${width}-logout.png`), fullPage: true });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no horizontal overflow`);
      await context.close();
    }
    await browser.close(); browser = null;
  }
  check(report.errors.length === 0, 'No browser runtime exceptions');
  check(report.blockedWhatsAppRequests === 0, 'No WhatsApp request activated by menu actions');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, cases: report.cases.length, failure: report.failure }));
}
