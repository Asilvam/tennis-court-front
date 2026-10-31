import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node tests/e2e/adminTitularPicker.mjs BUILD OUTPUT PLAYWRIGHT_MODULE');
const dist = resolve(buildArg), output = resolve(outputArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const origin = 'https://front.ctq-fixture.invalid', api = 'https://api.ctq-fixture.invalid';
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ role: 'admin', email: 'admin@example.invalid', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture-signature'].join('.');
const report = { executedAt: new Date().toISOString(), scope: 'React build with intercepted APIs; visualViewport reduction/pan simulated, not physical iOS keyboard', passed: [], views: [], captures: [], sourceHashes: {} };
const check = (condition, message) => { assert(condition, message); report.passed.push(message); };
let browser, page;
try {
    await mkdir(output, { recursive: true });
    for (const file of ['src/components/AdminRegister.tsx', 'src/styles/AdminUsersLayout.css', 'src/components/AdaptiveSelect.tsx', 'src/components/OptionPicker.tsx', 'src/hooks/useVisibleViewport.ts', 'src/utils/memberEditing.ts']) report.sourceHashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
    const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
    const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
    for (const engine of ['chromium', 'webkit']) {
        browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
        for (const width of [320, 390, 768, 820, 1024, 1440]) {
            const label = `${engine}/${width}`;
            const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'es-CL', ...(width <= 1024 ? { hasTouch: true } : {}) });
            await context.addInitScript(token => { localStorage.setItem('token', token); localStorage.setItem('userInfo', JSON.stringify({ role: 'admin', email: 'admin@example.invalid', name: 'Admin fixture' })); }, token);
            page = await context.newPage(); const writes = [], errors = [], unexpected = [];
            const base = { role: 'user', statePlayer: true, updatePayment: true, emailVerified: true, cellular: '+56912345678' };
            const members = [
                { ...base, _id: '1'.padStart(24, '0'), namePlayer: 'Carga fixture', email: 'carga@example.invalid', partnerType: 'Carga', titularId: null },
                ...Array.from({ length: 40 }, (_, i) => ({ ...base, _id: String(i + 2).padStart(24, '0'), namePlayer: i < 2 ? `Álvaro Titular Apellido Compuesto ${i}` : `Titular ${String(i).padStart(2, '0')} ${'Apellido'.repeat(i === 2 ? 18 : 1)}`, email: `titular${i}@example.invalid`, partnerType: 'Titular' })),
            ];
            page.on('pageerror', error => errors.push(error.message));
            await context.route('**/*', async route => {
                const req = route.request(), url = new URL(req.url());
                if (url.origin === api) {
                    const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,PATCH,OPTIONS' };
                    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
                    if (url.pathname.endsWith('/me/access')) return route.fulfill({ headers, json: { role: 'admin', name: 'Admin fixture', financiallyRestricted: false } });
                    if (url.pathname === '/register' && req.method() === 'GET') return route.fulfill({ headers, json: members });
                    if (url.pathname === '/register/admin/carga%40example.invalid' && req.method() === 'PATCH') {
                        const body = req.postDataJSON(); writes.push({ body, authenticated: req.headers().authorization === `Bearer ${token}` });
                        Object.assign(members[0], body); return route.fulfill({ headers, json: members[0] });
                    }
                    unexpected.push(`${req.method()} ${url.pathname}`); return route.abort();
                }
                if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: css });
                if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: js });
                if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
                if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
                const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|svg|jpeg|ico)$/.test(url.pathname) ? `.${url.pathname}` : 'index.html');
                try { return route.fulfill({ contentType: { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }[extname(file)], body: await readFile(file) }); }
                catch { return route.fulfill({ status: 404, body: '' }); }
            });
            const visual = async reduced => {
                await page.evaluate(reduced => {
                    for (const [key, value] of Object.entries({ height: 360, offsetTop: 48, offsetLeft: 0 })) {
                        if (reduced) Object.defineProperty(window.visualViewport, key, { configurable: true, value });
                        else delete window.visualViewport[key];
                    }
                    window.visualViewport.dispatchEvent(new Event('resize'));
                }, reduced);
            };
            const screenshot = async state => { const file = `${state}-${engine}-${width}.png`; await page.screenshot({ path: resolve(output, file) }); report.captures.push(file); };
            await page.goto(`${origin}/adminregister`);
            await page.getByRole('button', { name: 'Editar a Carga fixture', exact: true }).click();
            await page.locator('#namePlayer').fill('Carga fixture editada');
            const compact = width < 1000;
            if (compact) await page.getByRole('button', { name: 'Titular asociado', exact: true }).click();
            else { await page.getByRole('combobox', { name: 'Titular asociado', exact: true }).fill('alvaro'); }
            if (width <= 1024) {
                await visual(true);
                await page.getByRole('dialog', { name: 'Titular asociado', exact: true }).waitFor();
                await page.waitForFunction(() => { const r = document.querySelector('.edit-modal').getBoundingClientRect(); return r.top >= 48 && r.bottom <= 408; });
                const search = page.getByRole('combobox', { name: 'Buscar titular por nombre o correo', exact: true });
                if (!compact) check(await search.inputValue() === 'alvaro', `${label}: iPad keeps typed query when keyboard removes dropdown space`);
                await search.fill('');
                const metrics = await page.evaluate(() => {
                    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
                    const list = document.querySelector('.option-picker-results');
                    return { header: rect('.option-picker-header'), search: rect('.option-picker-search'), list: rect('.option-picker-results'), scrollHeight: list.scrollHeight, inputFont: getComputedStyle(document.querySelector('.option-picker-input')).fontSize, docWidth: document.documentElement.scrollWidth };
                });
                check(metrics.header.top >= 48 && metrics.header.bottom <= metrics.search.top + 1 && metrics.search.bottom <= metrics.list.top + 1 && metrics.list.bottom <= 408 && metrics.list.height >= 48, `${label}: title, search and results remain visible above simulated keyboard`);
                check(metrics.inputFont === '16px' && metrics.docWidth <= width + 1 && metrics.scrollHeight > metrics.list.height, `${label}: readable search and contained long scrollable list`);
                const scroll = await page.evaluate(() => scrollY);
                await page.locator('.option-picker-results').evaluate(el => { el.scrollTop = 500; });
                check(await page.evaluate(() => scrollY) === scroll && await search.isVisible(), `${label}: scrolling results does not pan the page or hide search`);
                await search.fill('alvaro'); check(await page.getByRole('option').count() === 2, `${label}: name search ignores accents`);
                await screenshot('search');
                await page.getByRole('button', { name: 'Volver', exact: true }).focus(); await page.keyboard.press('Shift+Tab');
                check(await page.getByRole('button', { name: 'Limpiar busqueda' }).evaluate(el => document.activeElement === el), `${label}: picker traps reverse keyboard navigation`);
                await search.focus();
                await search.fill('titular2@example.invalid'); check(await page.getByRole('option').count() === 1, `${label}: email search and unbroken long name fit`);
                await screenshot('keyboard');
                await search.fill('no existe fixture'); check(await page.getByRole('status').filter({ hasText: 'Sin resultados' }).isVisible(), `${label}: no-results state`);
                await page.keyboard.press('Escape');
                await page.getByRole('dialog', { name: 'Editar usuario', exact: true }).waitFor();
                check(await page.locator('#namePlayer').inputValue() === 'Carga fixture editada' && writes.length === 0, `${label}: Escape returns to draft without saving`);
                await visual(false);
                if (compact) await page.getByRole('button', { name: 'Titular asociado', exact: true }).click();
                else {
                    const desktopSearch = page.getByRole('combobox', { name: 'Titular asociado', exact: true });
                    await desktopSearch.waitFor(); await desktopSearch.fill('alvaro');
                    await visual(true); await search.waitFor();
                }
                await search.fill('alvaro'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
            } else {
                check(await page.locator('.option-picker').count() === 0, `${label}: desktop retains floating searchable control`);
                await screenshot('desktop');
                await page.getByRole('option', { name: 'Álvaro Titular Apellido Compuesto 1 — titular1@example.invalid', exact: true }).click();
            }
            await page.getByRole('dialog', { name: 'Editar usuario', exact: true }).waitFor();
            if (width <= 1024) await page.waitForFunction(() => document.activeElement?.id === 'edit-member-titular-trigger');
            check(await page.locator('#namePlayer').inputValue() === 'Carga fixture editada' && await page.getByRole('button', { name: 'Quitar titular asociado' }).isVisible() && writes.length === 0, `${label}: selection retains draft and does not PATCH`);
            await page.getByRole('button', { name: 'Actualizar', exact: true }).click(); await page.locator('.swal2-confirm').click();
            check(writes.length === 1 && writes[0].authenticated && JSON.stringify(writes[0].body) === JSON.stringify({ namePlayer: 'Carga fixture editada', partnerType: 'Carga', titularId: '3'.padStart(24, '0') }), `${label}: explicit save sends only reviewed changes with bearer`);
            check(errors.length === 0 && unexpected.length === 0, `${label}: no page errors or unexpected real requests`);
            report.views.push({ engine, browser: browser.version(), width, writes });
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
    await writeFile(resolve(output, 'admin-titular-picker.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ status: report.status, views: report.views.length, checkpoints: report.passed.length, error: report.error }));
}
