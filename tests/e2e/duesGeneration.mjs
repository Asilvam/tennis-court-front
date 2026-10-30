import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [distArg, outArg, playwrightArg] = process.argv.slice(2);
assert(distArg && outArg && playwrightArg, 'Usage: node tests/e2e/duesGeneration.mjs BUILD OUTPUT PLAYWRIGHT_MODULE');
const dist = resolve(distArg), output = resolve(outArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const id = '111111111111111111111111', cargaId = '222222222222222222222222';
const periods = ['2026-10', '2026-11', '2026-12', '2027-01'];
const fingerprint = body => createHash('sha256').update(JSON.stringify(body)).digest('hex');
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role: 'admin', email: 'admin@example.invalid', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture-signature'].join('.');
const report = { date: '2026-10-29', scope: 'React production build with stateful mocked API; no Nest/Mongo or live services', deployed: false, views: [], passed: [], sourceHashes: {} };
let browser, page;
const check = (condition, message) => { assert(condition, message); report.passed.push(message); };

try {
  await mkdir(output, { recursive: true });
  for (const file of ['src/components/MembershipEnrollment.tsx', 'src/components/MembershipBatchEnrollment.tsx', 'src/components/AdminMembershipPayments.tsx', 'src/components/AdminMembershipMember.tsx', 'src/utils/membershipPeriods.ts', 'src/styles/AdminMembershipPayments.css'])
    report.sourceHashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
  const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
  const materializeCss = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
  for (const engine of ['chromium', 'webkit']) {
    browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [320, 390, 820, 1440]) {
      const label = `${engine}/${width}`;
      const ctx = await browser.newContext({ viewport: { width, height: width <= 390 ? 844 : 1080 }, locale: 'es-CL', ...(engine === 'webkit' && width <= 390 ? { isMobile: true, hasTouch: true } : {}) });
      await ctx.addInitScript(token => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ name: 'Administrador fixture', role: 'admin', email: 'admin@example.invalid', financiallyRestricted: false }));
      }, token);
      page = await ctx.newPage();
      const member = { id, name: 'Usuario test 1', email: 'test1@example.invalid', memberType: 'Titular', active: true, enrolled: false };
      const carga = { ...member, id: cargaId, name: 'Usuario test 2', email: 'test2@example.invalid', memberType: 'Familiar' };
      const data = { memberId: id, members: [member], dues: [], billing: { minimumStartPeriod: '2026-10', currentPeriod: '2026-10' } };
      const requests = [], errors = [], unexpected = [], saved = new Map();
      let loseResponse = false, rejectPreview = false;
      page.on('pageerror', error => errors.push(error.message));
      await ctx.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type,Idempotency-Key', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          const body = request.postDataJSON(), path = url.pathname, method = request.method();
          const key = request.headers()['idempotency-key'];
          requests.push({ method, path, body, key });
          const json = (value, status = 200) => route.fulfill({ status, headers, json: value });
          if (path.endsWith('/me/access')) return json({ role: 'admin', name: 'Administrador fixture', financiallyRestricted: false });
          if (method === 'GET' && path.endsWith(`/members/${id}`)) return json(data);
          if (method === 'GET' && path.endsWith('/payments')) return json({ items: [], total: 0 });
          if (method === 'GET' && path.endsWith('/members')) return json({ items: [{ ...member, amount: 180, status: 'OPEN', pricingMode: 'TEST' }], total: 1 });
          if (path.endsWith('/enrollment/preview') && !path.includes(`/members/${id}/`)) {
            const rows = periods.filter(period => period >= body.startPeriod && period <= body.throughPeriod);
            return json({ ...body, ...data.billing, items: [member, carga].map(person => ({ memberId: person.id, name: person.name, memberType: person.memberType, status: person.enrolled ? 'ALREADY_ENABLED' : 'ELIGIBLE', reason: person.enrolled ? 'Se conserva' : '', ...(!person.enrolled ? { plan: { approvalHash: fingerprint(person), rows: rows.map(period => ({ period, amount: person.id === id ? 180 : 50 })), total: rows.length * (person.id === id ? 180 : 50) } } : {}) })) });
          }
          if (method === 'POST' && (path.endsWith('/enrollment/preview') || path.endsWith('/dues/preview'))) {
            if (rejectPreview) return json({ message: 'La sesión no es válida.' }, 401);
            const selected = periods.filter(period => period >= (body.startPeriod || '2026-10') && period <= body.throughPeriod);
            const newRows = selected.filter(period => !data.dues.some(row => row.period === period)).map(period => ({ period, amount: 180, pricingMode: 'TEST' }));
            return json({ ...body, memberId: id, name: member.name, startPeriod: body.startPeriod || '2026-10', total: newRows.length * 180, approvalHash: fingerprint(body), newRows, rows: newRows, existingRows: data.dues.filter(row => selected.includes(row.period)), excludedPeriods: [] });
          }
          if (method === 'POST' && (path.endsWith(`/members/${id}/enrollment`) || path.endsWith(`/members/${id}/dues`))) {
            assert(key); assert(!('reason' in body)); assert(!('amount' in body));
            if (saved.has(key)) { assert.deepEqual(saved.get(key), body); return json({ duplicate: true }); }
            assert.equal(body.approvalHash, fingerprint(path.endsWith('/dues') ? { throughPeriod: body.throughPeriod } : { startPeriod: body.startPeriod, throughPeriod: body.throughPeriod }));
            for (const period of periods.filter(period => period >= (body.startPeriod || '2026-10') && period <= body.throughPeriod)) {
              if (!data.dues.some(row => row.period === period)) data.dues.push({ id: `due-${period}`, beneficiaryId: id, period, amount: 180, status: 'OPEN', pricingMode: 'TEST', dueAt: '2026-11-06T03:00:00.000Z' });
            }
            member.enrolled = true; member.billingStartPeriod = '2026-10'; saved.set(key, body);
            if (loseResponse) { loseResponse = false; return route.abort('failed'); }
            return json({ duplicate: false });
          }
          unexpected.push(`${method} ${path}`); return json({ message: 'Unexpected fixture call' }, 500);
        }
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materializeCss });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
        if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
        const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|svg|jpeg|ico)$/.test(url.pathname) ? `.${url.pathname}` : 'index.html');
        try { return route.fulfill({ contentType: { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }[extname(file)], body: await readFile(file) }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      });
      const capture = async name => {
        const metrics = await page.evaluate(() => {
          const rects = [...document.querySelectorAll('.ap-form-grid > *, .ap-generation-actions > button, .ap-filters > *')].map(element => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.width && rect.height);
          const overflow = rects.some(({ rect }) => rect.x < -1 || rect.right > innerWidth + 1);
          const overlaps = rects.some((a, i) => rects.slice(i + 1).some(b => !a.element.contains(b.element) && !b.element.contains(a.element) && Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x) > 1 && Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y) > 1));
          return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, scale: visualViewport?.scale, overflow, overlaps };
        });
        check(metrics.documentWidth <= width + 1 && !metrics.overflow && !metrics.overlaps, `${label}/${name}: no horizontal overflow or overlapping controls`);
        await page.screenshot({ path: resolve(output, `${name}-${engine}-${width}.png`), fullPage: true });
        return metrics;
      };
      const choose = async (label, value) => { await page.getByLabel(label, { exact: true }).click(); await page.getByRole('option', { name: value, exact: true }).click(); };
      const accept = () => page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      await page.goto(`${origin}/adminpayments?memberId=${id}`);
      await page.getByRole('button', { name: 'Generar cuotas', exact: true }).click();
      check(await page.getByRole('button', { name: 'Registrar pago', exact: true }).isDisabled(), `${label}: no payment without dues`);
      check(await page.locator('input[maxlength="1000"]').count() === 0, `${label}: ordinary generation has no reason field`);
      check(await page.getByText('Preparar cuotas hasta', { exact: true }).count() === 0, `${label}: disconnected external range removed`);
      await choose('Hasta el mes', 'enero de 2027');
      await page.getByRole('button', { name: 'Revisar cuotas', exact: true }).click();
      await page.locator('.ap-enrollment-preview').waitFor();
      check(await page.locator('.ap-enrollment-preview li').count() === 4, `${label}: October to January reviews four dues`);
      check((await page.locator('.ap-total').innerText()).includes('$720'), `${label}: four titular test dues total 720`);
      const previewMetrics = await capture('preview');
      await page.getByRole('button', { name: 'Confirmar generación', exact: true }).click();
      await page.locator('.swal2-cancel').click();
      check(data.dues.length === 0, `${label}: cancelling SweetAlert does not create dues`);
      await page.getByRole('button', { name: 'Confirmar generación', exact: true }).click();
      await page.locator('.swal2-confirm').click();
      await page.getByRole('heading', { name: 'Cuotas revisadas', exact: true }).waitFor(); await accept();
      await page.locator('.ap-dues-table tbody tr').first().waitFor();
      check(data.dues.length === 4 && saved.size === 1, `${label}: explicit confirmation creates four mock dues once`);
      const before = requests.length;
      await page.getByRole('button', { name: 'Registrar pago', exact: true }).click();
      await page.getByRole('button', { name: 'Volver al detalle del socio', exact: true }).waitFor();
      check(requests.slice(before).every(row => row.method === 'GET'), `${label}: opening payment is read only`);
      await capture('payment');
      await page.getByRole('button', { name: 'Volver al detalle del socio', exact: true }).click();
      await page.getByRole('tab', { name: 'Historial de pagos', exact: true }).click();
      await page.getByText('No hay pagos para estos filtros.', { exact: true }).waitFor();
      check(await page.getByLabel('Mes', { exact: true }).count() === 1, `${label}: history has labelled Spanish month filter`);
      await capture('history');
      await page.getByRole('tab', { name: 'Cuotas', exact: true }).click();
      await page.getByRole('button', { name: 'Generar cuotas', exact: true }).click();
      await choose('Hasta el mes', 'enero de 2027');
      await page.getByRole('button', { name: 'Revisar cuotas', exact: true }).click();
      await page.getByText('No hay cuotas nuevas en este rango.', { exact: true }).waitFor();
      check((await page.locator('.ap-total').innerText()).includes('$0'), `${label}: existing dues are not charged as new`);
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      data.dues.splice(1); data.dues[0].status = 'PAID';
      await page.getByRole('button', { name: 'Actualizar mensualidades', exact: true }).click();
      await page.getByRole('button', { name: 'Generar cuotas', exact: true }).click();
      await choose('Hasta el mes', 'enero de 2027');
      await page.getByRole('button', { name: 'Revisar cuotas', exact: true }).click();
      await page.locator('.ap-enrollment-preview').waitFor();
      loseResponse = true;
      await page.getByRole('button', { name: 'Confirmar generación', exact: true }).click(); await page.locator('.swal2-confirm').click();
      await page.getByRole('heading', { name: 'Generar cuotas', exact: true }).waitFor(); await accept();
      await page.getByRole('button', { name: 'Reintentar generación', exact: true }).waitFor();
      check(await page.getByRole('button', { name: 'Cancelar', exact: true }).isDisabled() && await page.getByRole('tab', { name: 'Historial de pagos', exact: true }).isDisabled(), `${label}: uncertain response locks editing and navigation`);
      const lastWrite = requests.at(-1);
      await page.getByRole('button', { name: 'Reintentar generación', exact: true }).click();
      await page.getByRole('heading', { name: 'Cuotas revisadas', exact: true }).waitFor(); await accept();
      const writes = requests.filter(row => row.method === 'POST' && row.path.endsWith('/dues'));
      check(writes.at(-1).key === lastWrite.key && JSON.stringify(writes.at(-1).body) === JSON.stringify(lastWrite.body), `${label}: retry keeps identical payload and idempotency key`);
      check(data.dues.length === 4 && data.dues[0].status === 'PAID', `${label}: retry preserves paid month and creates no duplicate`);
      await page.goto(`${origin}/adminpayments`);
      await page.getByRole('button', { name: 'Habilitar socios', exact: true }).click();
      await choose('Hasta el mes', 'enero de 2027');
      await page.getByRole('button', { name: 'Revisar socios', exact: true }).click();
      await page.getByRole('button', { name: 'Seleccionar pendientes', exact: true }).click();
      check((await page.locator('.ap-total').innerText()).includes('$200'), `${label}: only eligible carga selected, four test dues total 200`);
      check(await page.locator('.ap-batch input[type="checkbox"]:disabled').count() === 1, `${label}: batch preserves enabled titular`);
      await capture('batch');
      await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await page.goto(`${origin}/adminpayments?memberId=${id}`);
      await page.getByRole('button', { name: 'Generar cuotas', exact: true }).click(); rejectPreview = true;
      await page.getByRole('button', { name: 'Revisar cuotas', exact: true }).click();
      await page.waitForURL('**/login');
      check(await page.evaluate(() => localStorage.getItem('token')) === null, `${label}: expired session goes to login and clears token`);
      check(errors.length === 0 && unexpected.length === 0, `${label}: no page errors or unexpected/provider API calls`);
      report.views.push({ engine, browser: browser.version(), width, previewMetrics, requests, pageErrors: errors });
      await ctx.close();
    }
    await browser.close(); browser = null;
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
} finally {
  if (browser) await browser.close();
  await writeFile(resolve(output, 'dues-generation-ui.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checkpoints: report.passed.length, error: report.error }));
}
