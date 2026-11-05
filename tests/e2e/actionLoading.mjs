import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node actionLoading.mjs BUILD OUTPUT PLAYWRIGHT');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const build = resolve(buildArg), output = resolve(outputArg);
const origin = 'https://ctq-loading.example.invalid', api = 'https://api.ctq-loading.example.invalid';
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const memberId = 'a'.repeat(24), current = '2026-11';
const token = ['e30', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture'].join('.');
const person = { id: memberId, name: 'Socio Ficticio Nombre Completo', email: 'member@example.invalid', active: true, enrolled: true, memberType: 'Titular' };
const due = { id: 'b'.repeat(24), beneficiaryId: memberId, period: current, dueAt: '2026-12-06T03:00:00Z', amount: 180, status: 'OPEN', pricingMode: 'TEST' };
const contextData = { memberId, members: [person], dues: [due], billing: { currentPeriod: current, minimumStartPeriod: '2026-10' } };
const preview = { memberId, name: person.name, startPeriod: current, throughPeriod: current, approvalHash: 'f'.repeat(64), total: 180, newRows: [due], rows: [due] };
const batch = { ...preview, currentPeriod: current, minimumStartPeriod: '2026-10', items: [{ memberId, name: person.name, memberType: 'Titular', status: 'ELIGIBLE', reason: 'Sin inicio', plan: { approvalHash: 'f'.repeat(64), total: 180, rows: [due] } }] };
const categories = { player: { email: person.email, name: person.name, active: true }, revision: 'f'.repeat(64), categories: [{ category: '4', points: 0, isActive: true }] };
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const report = { executedAt: new Date().toISOString(), status: 'running', scope: 'Real React build and controlled deferred API responses; no real accounts, writes, emails or payments', checks: [], cases: [], errors: [] };
const check = (value, label) => { assert(value, label); report.checks.push(label); };
await mkdir(output, { recursive: true });
let browser, activePage;
try {
  for (const engine of ['webkit', 'chromium']) {
    browser = await ({ webkit, chromium }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [390, 820, 1440]) {
      const label = `${engine}/${width}`;
      const ctx = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: true, locale: 'es-CL' });
      await ctx.addInitScript(({ token, name }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ email: 'admin@example.invalid', name, role: 'admin' }));
      }, { token, name: person.name });
      let gate;
      const requests = [];
      await ctx.route('**/*', async route => {
        const url = new URL(route.request().url()), method = route.request().method();
        if (url.origin === api) {
          requests.push({ method, path: url.pathname });
          if (gate && gate.method === method && gate.path === url.pathname) {
            const currentGate = gate; currentGate.hits++; await currentGate.wait;
            return route.fulfill({ status: currentGate.status, json: currentGate.data });
          }
          const data = url.pathname.endsWith('/me/access') ? { name: person.name, role: 'admin', canReserve: true, financiallyRestricted: false }
            : url.pathname === `/membership-billing/admin/members/${memberId}` ? contextData
            : url.pathname === '/membership-billing/admin/members' ? { items: [{ ...person, status: 'OPEN', amount: 180 }], total: 1 }
            : url.pathname.endsWith('/settings') ? { generationEnabled: false, autoBlockEnabled: false, migrationReviewed: true, revision: 'f'.repeat(64) }
            : url.pathname === '/membership-billing/me/dues' ? { ...contextData, currentPeriod: current, access: { mpEnabled: false } }
            : url.pathname.includes('player-category-points') ? categories
            : url.pathname === '/court-reserve/my-history' ? {items:[{ idCourtReserve: 'fixture', court: 'Cancha 1', player1: person.name, player2: 'Rival Ficticio', turn: '08:15-10:00', dateToPlay: '2099-01-01', state: true, isForRanking: true }],total:1,cancelled:0,page:1,pageSize:25,pages:1}
            : url.pathname === '/membership-billing/admin/enrollment/preview' ? batch
            : url.pathname.endsWith('/dues/preview') ? preview
            : [];
          return route.fulfill({ json: data });
        }
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js')) });
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css')) });
        if (url.origin !== origin) return route.fulfill({ body: '' });
        const path = url.pathname.includes('.') ? resolve(build, '.' + url.pathname) : resolve(build, 'index.html');
        assert(path.startsWith(build + '/'));
        return route.fulfill({ body: await readFile(path), contentType: mime[extname(path)] || 'text/html' });
      });
      const page = await ctx.newPage(); activePage = page; page.setDefaultTimeout(15000);
      page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
      function defer(method, path, data, status = 200) {
        let release;
        gate = { method, path, data, status, hits: 0, wait: new Promise(resolve => { release = resolve; }) };
        return () => { release(); gate = null; };
      }
      async function pending(button, name) {
        await button.locator('.ctq-spinner').waitFor();
        check(await button.isDisabled(), `${label}/${name}: action disabled while waiting`);
        await page.waitForFunction(() => [...document.querySelectorAll('button .ctq-spinner img')].some(img => img.complete && img.naturalWidth > 0));
        check(await button.locator('.ctq-spinner img').count() === 2, `${label}/${name}: two CTQ layers rendered`);
        await page.screenshot({ path: resolve(output, `${engine}-${width}-${name}.png`), fullPage: true, animations: 'disabled' });
        const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        check(metrics.scrollWidth <= metrics.width + 1, `${label}/${name}: no horizontal overflow`);
        report.cases.push({ engine, width, action: name });
      }
      async function confirm() { await page.locator('.swal2-confirm').click(); }

      await page.goto(`${origin}/adminpayments?memberId=${memberId}`);
      await page.getByRole('button', { name: 'Generar cuotas', exact: true }).click();
      let release = defer('POST', `/membership-billing/admin/members/${memberId}/dues/preview`, preview);
      const review = page.locator('.ap-generation-actions button').filter({ hasText: 'Revisar cuotas' });
      await review.click(); await pending(review, 'review'); release();
      const generation = page.getByRole('button', { name: 'Confirmar generación', exact: true });
      await generation.waitFor();
      release = defer('POST', `/membership-billing/admin/members/${memberId}/dues`, { message: 'Fallo de red simulado' }, 503);
      await generation.click(); await confirm();
      await pending(page.locator('.ap-generation-actions .ap-primary'), 'generation');
      check(gate.hits === 1, `${label}/generation: one request while waiting`);
      release(); await page.locator('.swal2-title').filter({ hasText: 'Generar cuotas' }).waitFor(); await confirm();
      const retry = page.getByRole('button', { name: 'Reintentar generación', exact: true });
      await page.waitForFunction(() => !document.querySelector('.ap-enrollment')?.getAttribute('aria-busy') || document.querySelector('.ap-enrollment')?.getAttribute('aria-busy') === 'false');
      check(await retry.isEnabled() && await retry.locator('.ctq-spinner').count() === 0, `${label}/generation: error releases loading and permits explicit retry`);
      // Reload discards only synthetic UI state after the intentional failure.
      await page.goto(`${origin}/adminpayments`);
      release = defer('POST', '/membership-billing/admin/enrollment/preview', batch);
      await page.getByRole('button', { name: 'Habilitar socios', exact: true }).click();
      await pending(page.locator('.ap-batch .ap-generation-actions button').filter({ hasText: 'Revisar socios' }), 'batch-review'); release();
      await page.getByRole('button', { name: 'Seleccionar pendientes', exact: true }).click();
      release = defer('POST', '/membership-billing/admin/enrollment', { counts: { enrolled: 1, skipped: 0, reviewRequired: 0, errors: 0 }, results: [] });
      await page.getByRole('button', { name: 'Confirmar habilitación', exact: true }).click(); await confirm();
      await pending(page.locator('.ap-batch .ap-generation-actions .ap-primary'), 'batch-enable');
      check(gate.hits === 1, `${label}/batch: one request while waiting`); release();
      await page.locator('.swal2-title').filter({ hasText: 'Resultado de habilitación' }).waitFor(); await confirm();

      await page.goto(`${origin}/admincategories?email=${person.email}`);
      await page.getByLabel('Tercera', { exact: false }).check();
      release = defer('PUT', `/player-category-points/${encodeURIComponent(person.email)}/assignments`, categories);
      await page.locator('.mc-save').click(); await pending(page.locator('.mc-save'), 'categories'); release();
      await page.locator('.swal2-title').filter({ hasText: 'Cambios guardados' }).waitFor(); await confirm();

      await page.goto(`${origin}/myhistory`);
      const deletion = page.locator('.history-delete-btn');
      release = defer('DELETE', '/court-reserve/fixture', {});
      await deletion.click(); await confirm(); await pending(deletion, 'reservation-delete'); release();
      await page.locator('.swal2-title').filter({ hasText: 'Reserva eliminada' }).waitFor(); await confirm();

      await page.goto(`${origin}/restablecer-contrasena#token=${'f'.repeat(64)}`);
      await page.locator('#new-password').fill('Fixture-password');
      await page.locator('#confirm-password').fill('Fixture-password');
      release = defer('POST', '/register/password-recovery/confirm', {});
      const passwordSave = page.getByRole('button', { name: 'Guardar nueva contraseña' });
      await passwordSave.click(); await pending(page.locator('button[type=submit]'), 'password'); release();
      await page.getByText('Contraseña actualizada.', { exact: false }).waitFor();

      await page.goto(`${origin}/monthlypayments`);
      await page.locator('.mp-due').first().waitFor();
      release = defer('POST', '/membership-billing/me/dues', { ...contextData, currentPeriod: current, access: { mpEnabled: false } });
      const refresh = page.getByRole('button', { name: 'Actualizar cuotas', exact: true });
      await refresh.click(); await pending(refresh, 'refresh'); release();
      await page.locator('.mp-due').first().waitFor();
      if (width === 390) {
        // Headless browsers expose zero insets; inject a test value into the real stylesheet.
        const navigationCss = await readFile(resolve(root, 'src/styles/Navigation.css'), 'utf8');
        assert(navigationCss.includes('env(safe-area-inset-top, 0px)'));
        await page.addStyleTag({ content: navigationCss.replaceAll('env(safe-area-inset-top, 0px)', '47px') });
        const metrics = await page.locator('.ctq-nav').evaluate(el => ({ top: parseFloat(getComputedStyle(el).paddingTop), height: el.getBoundingClientRect().height, brandTop: el.querySelector('.ctq-nav__brand').getBoundingClientRect().top }));
        check(metrics.top === 47 && metrics.height === 103 && metrics.brandTop >= 47, `${label}: injected 47px safe area reserved above title (not physical iOS validation)`);
        await page.screenshot({ path: resolve(output, `${engine}-390-safe-area.png`), fullPage: true });
      }
      check(requests.filter(r => r.path === '/register/password-recovery/confirm').length === 1, `${label}/password: one request`);
      await ctx.close();
    }
    await browser.close(); browser = null;
  }
  check(report.errors.length === 0, 'No JavaScript runtime errors');
  report.status = 'passed';
} catch (error) {
  report.failure = error.stack; report.status = 'failed'; process.exitCode = 1;
  await activePage?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, cases: report.cases.length, checks: report.checks.length, failure: report.failure }));
}
