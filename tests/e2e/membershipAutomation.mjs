import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [dist, output, modulePath] = process.argv.slice(2);
assert(dist && output && modulePath, 'Usage: node tests/e2e/membershipAutomation.mjs BUILD OUTPUT PLAYWRIGHT');
const { chromium, webkit } = await import(pathToFileURL(resolve(modulePath)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const email = 'admin@example.invalid', memberId = '100000000000000000000001';
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ email, role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture'].join('.');
const report = { executedAt: new Date().toISOString(), scope: 'React production build with isolated HTTP fixtures; no live requests', checks: [], views: [] };
const check = (condition, text) => { assert(condition, text); report.checks.push(text); };
await mkdir(output, { recursive: true });
const materialize = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
let browser, activePage;
try {
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [390, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'es-CL', timezoneId: 'America/Santiago' });
      await context.addInitScript(({ token, email }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ email, name: 'Administrador fixture', role: 'admin', canReserve: true }));
      }, { token, email });
      const page = await context.newPage(), errors = [], writes = [], unexpected = [];
      activePage = page;
      // A new dialog can place its transformed hover edge under the old pointer position.
      const confirm = async () => { await page.mouse.move(0, 0); await page.locator('.swal2-confirm').click(); };
      let revision = 0, fail = false, conflict = false, settingsReads = 0, previewReads = 0;
      const candidates = [
        ...Array.from({ length: 102 }, (_, index) => ({
          memberId: `fixture-${index}`, name: `Socio fixture ${index + 1}`, memberType: 'Titular',
          status: 'ELIGIBLE', reason: 'Sin inicio aprobado',
          plan: { approvalHash: 'a'.repeat(64), total: 18000, rows: [{ period: '2026-11', amount: 18000 }] },
        })),
        { memberId: 'inactive', name: 'Cuenta inactiva fixture', memberType: 'Titular', status: 'REVIEW_REQUIRED', reason: 'Cuenta inactiva' },
        { memberId: 'enabled', name: 'Socio ya habilitado fixture', memberType: 'Titular', status: 'ALREADY_ENABLED', reason: 'Se conserva' },
      ];
      let settings = { generationEnabled: true, autoBlockEnabled: false, terminationEnabled: true, migrationReviewed: true, revision: String(revision).padStart(64, '0') };
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          const respond = json => route.fulfill({ headers, json });
          if (req.method() === 'OPTIONS') return route.fulfill({ headers, status: 204 });
          const p = url.pathname;
          if (p.endsWith('/enrollment/preview') && req.method() === 'POST') {
            previewReads++;
            return respond({ startPeriod: '2026-11', throughPeriod: '2026-11', minimumStartPeriod: '2026-10', currentPeriod: '2026-11', items: candidates });
          }
          if (p.endsWith('/automation/settings')) {
            if (req.method() === 'GET') {
              settingsReads++;
              return fail ? route.fulfill({ headers, status: 503, json: { message: 'Fixture unavailable' } }) : respond(settings);
            }
            const payload = req.postDataJSON(); writes.push(payload);
            assert.equal(req.headers().authorization, `Bearer ${token}`);
            assert.equal(payload.revision, settings.revision);
            if (payload.enabled && !settings.migrationReviewed) return route.fulfill({ headers, status: 409, json: { message: 'Revisa la migracion antes de activar automatismos.' } });
            if (conflict) {
              settings = { ...settings, autoBlockEnabled: false, revision: String(++revision).padStart(64, '0') };
              return route.fulfill({ headers, status: 409, json: { message: 'La configuracion cambio. Actualiza antes de confirmar.' } });
            }
            settings = { ...settings, [payload.setting === 'generation' ? 'generationEnabled' : 'autoBlockEnabled']: payload.enabled, revision: String(++revision).padStart(64, '0') };
            return respond(settings);
          }
          if (req.method() !== 'GET') { unexpected.push(`${req.method()} ${p}`); return route.abort(); }
          if (p.endsWith('/me/access')) return respond({ role: 'admin', canReserve: true, financiallyRestricted: false });
          if (p === '/auth/checkBlocked') return respond({ blocked: false });
          if (p.endsWith(`/members/${memberId}`)) return respond({ memberId, members: [{ id: memberId, name: 'Socio fixture', email: 'member@example.invalid', memberType: 'Titular', active: true, enrolled: true }], dues: [], billing: { minimumStartPeriod: '2026-10', currentPeriod: '2026-11' } });
          if (p.endsWith('/members') || p.endsWith('/payments')) return respond({ items: [], total: 0 });
          unexpected.push(p); return respond([]);
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materialize });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.fulfill({ contentType: 'text/css', body: '' });
        if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
        const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|svg|jpeg|ico)$/.test(url.pathname) ? `.${url.pathname}` : 'index.html');
        try { return route.fulfill({ contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }[extname(file)], body: await readFile(file) }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      });
      const label = `${engine}/${width}`;
      await page.goto(origin + '/adminpayments');
      const generation = page.getByRole('switch', { name: 'Generación recurrente de cuotas', includeHidden: true });
      const autoBlock = page.getByRole('switch', { name: 'Bloqueo de reservas por mora', includeHidden: true });
      await page.waitForFunction(() => document.querySelector('[role=switch]')?.disabled === false);
      check(await generation.isChecked() && !await autoBlock.isChecked() && writes.length === 0, `${label}: initial flags read without mutations`);
      await page.getByRole('button', { name: 'Habilitar socios', exact: true }).click();
      const batch = page.locator('.ap-batch');
      const boxes = batch.locator('input[type=checkbox]');
      const checkedCount = () => batch.locator('input[type=checkbox]:checked').count();
      await batch.getByRole('button', { name: 'Seleccionar pendientes', exact: true }).click();
      check(await checkedCount() === 102, `${label}: select-all includes every eligible candidate, not inactive or enabled members`);
      check(await batch.getByRole('button', { name: 'Deseleccionar pendientes', exact: true }).getAttribute('aria-pressed') === 'true', `${label}: bulk toggle exposes its selected state`);
      await batch.getByRole('button', { name: 'Deseleccionar pendientes', exact: true }).click();
      check(await checkedCount() === 0 && await batch.getByRole('button', { name: 'Confirmar habilitación', exact: true }).isDisabled(), `${label}: second click clears all selections and disables confirmation`);
      await batch.getByRole('button', { name: 'Seleccionar pendientes', exact: true }).click();
      await boxes.first().uncheck({ force: true });
      await batch.getByRole('button', { name: 'Seleccionar pendientes', exact: true }).click();
      check(await checkedCount() === 102, `${label}: partial selection can select all again`);
      await batch.getByRole('button', { name: 'Deseleccionar pendientes', exact: true }).click();
      check(await checkedCount() === 0 && previewReads === 1 && writes.length === 0, `${label}: reversible selection is local and never confirms a batch or payment`);
      check(await boxes.nth(102).isDisabled() && await boxes.nth(103).isDisabled(), `${label}: inactive and already enabled candidates remain disabled`);
      const batchFits = await batch.evaluate(section => {
        const button = section.querySelector('[aria-pressed]'), box = button.getBoundingClientRect();
        return document.documentElement.scrollWidth <= innerWidth + 1 && box.left >= 0 && box.right <= innerWidth;
      });
      check(batchFits, `${label}: bulk control stays inside mobile/tablet/desktop viewport`);
      await batch.screenshot({ path: resolve(output, `batch-cleared-${engine}-${width}.png`), animations: 'disabled' });
      await batch.getByRole('button', { name: 'Cerrar', exact: true }).click();
      const geometry = await page.locator('.ap-automation').evaluate(section => {
        const overlaps = [...section.querySelectorAll('label')].some(label => {
          const text = label.firstElementChild.getBoundingClientRect(), lever = label.lastElementChild.getBoundingClientRect();
          return text.right > lever.left - 4 || lever.right > window.innerWidth;
        });
        const levers = [...section.querySelectorAll('.ap-automation-lever')].map(lever => {
          const box = lever.getBoundingClientRect(), knob = getComputedStyle(lever, '::after');
          return { width: box.width, height: box.height, knobWidth: parseFloat(knob.width), knobHeight: parseFloat(knob.height) };
        });
        return { overlaps, levers, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      check(!geometry.overlaps && !geometry.overflow, `${label}: labels and switches fit without overlap or horizontal scrolling`);
      await page.locator('.admin-membership-payments').screenshot({ path: resolve(output, `automation-${engine}-${width}.png`), animations: 'disabled' });
      check(geometry.levers.every(lever => lever.width === 44 && lever.height === 24 && lever.knobWidth === 16 && lever.knobHeight === 16), `${label}: full switch tracks and knobs survive Materialize CSS (${JSON.stringify(geometry.levers)})`);
      await generation.click();
      check((await page.locator('.swal2-html-container').innerText()).includes('Solo queda disponible la generación manual administrativa'), `${label}: disabling automation correctly describes manual-only emission`);
      await page.locator('.swal2-cancel').click();
      await page.waitForFunction(() => document.querySelector('[role=switch]')?.disabled === false);
      check(await generation.isChecked() && writes.length === 0, `${label}: cancellation preserves the flag`);
      await generation.click(); await confirm();
      await page.locator('.swal2-title').filter({ hasText: 'Configuración actualizada' }).waitFor();
      check(!await generation.isChecked() && writes.length === 1 && writes[0].setting === 'generation' && writes[0].enabled === false, `${label}: generation disables only after server confirmation`);
      check(await autoBlock.isDisabled(), `${label}: controls remain locked while success dialog is open`);
      await confirm();
      await page.waitForFunction(() => document.querySelector('[role=switch]')?.disabled === false);
      await autoBlock.click(); await confirm();
      await page.locator('.swal2-title').filter({ hasText: 'Configuración actualizada' }).waitFor();
      check(await autoBlock.isChecked() && !await generation.isChecked() && settings.terminationEnabled, `${label}: automatic debt blocking is independent of generation and termination`);
      await confirm();
      conflict = true;
      await page.waitForFunction(() => document.querySelector('[role=switch]')?.disabled === false);
      await generation.click(); await confirm();
      await page.locator('.swal2-title').filter({ hasText: 'No se pudo confirmar el cambio' }).waitFor();
      check(writes.length === 3 && !await autoBlock.isChecked() && !await generation.isChecked(), `${label}: conflict re-reads both flags without automatic retry`);
      await confirm();
      fail = true;
      await page.getByRole('button', { name: 'Actualizar automatización', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'No se pudo consultar' }).waitFor();
      check(await generation.isDisabled() && await autoBlock.isDisabled(), `${label}: unavailable settings never become editable assumed defaults`);
      fail = false;
      await page.getByRole('button', { name: 'Actualizar automatización', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[role=switch]')?.disabled === false);
      settings.migrationReviewed = false;
      await page.getByRole('button', { name: 'Actualizar automatización', exact: true }).click();
      await page.getByText('Revisión de migración pendiente.', { exact: false }).waitFor();
      check(await generation.isEnabled() && await autoBlock.isEnabled(), `${label}: pending migration leaves activation requests accessible`);
      await generation.click();
      await confirm();
      await page.locator('.swal2-title').filter({ hasText: 'No se pudo confirmar el cambio' }).waitFor();
      check(!await generation.isChecked() && writes.length === 4, `${label}: activation reaches backend and rejection preserves state`);
      await confirm();
      await page.waitForFunction(() => document.querySelector('[role=switch]')?.disabled === false);
      const readsBefore = settingsReads;
      await page.goto(`${origin}/adminpayments?memberId=${memberId}`);
      await page.getByRole('heading', { name: 'Mensualidades del socio' }).waitFor();
      await page.getByRole('heading', { name: 'Socio fixture' }).waitFor();
      check(await page.locator('.ap-automation').count() === 0 && settingsReads === readsBefore, `${label}: member detail never presents global controls as personal settings`);
      check(errors.length === 0 && unexpected.length === 0, `${label}: no runtime errors, unrelated writes or unexpected requests`);
      report.views.push({ engine, width, settingsReads, writes });
      await context.close();
    }
    await browser.close(); browser = null;
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: resolve(output, 'failure.png') });
    report.motion = await activePage.evaluate(async () => {
      const rows = [];
      for (let i = 0; i < 8; i++) {
        await new Promise(requestAnimationFrame);
        const button = document.querySelector('.swal2-confirm'), box = button?.getBoundingClientRect();
        rows.push({ scrollY, top: box?.top, height: box?.height, transform: button && getComputedStyle(button).transform });
      }
      return rows;
    });
  }
} finally {
  if (browser) await browser.close();
  await writeFile(resolve(output, 'browser-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checks: report.checks.length, error: report.error }));
}
