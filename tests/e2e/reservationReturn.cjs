/* Isolated browser/Nest/Mongo regression. Never load AppModule or real .env. */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const { createHash } = require('node:crypto');
const front = resolve(__dirname, '../..');
const backend = resolve(front, '../tennis-app-backend');
const r = createRequire(`${backend}/package.json`);
r('ts-node').register({ project: `${backend}/tsconfig.json` });
const { Test } = r('@nestjs/testing');
const { APP_GUARD } = r('@nestjs/core');
const { ConfigService } = r('@nestjs/config');
const { JwtModule, JwtService } = r('@nestjs/jwt');
const { PassportModule } = r('@nestjs/passport');
const { getModelToken } = r('@nestjs/mongoose');
const mongoose = r('mongoose');
const bcrypt = r('bcryptjs');
const load = name => r(`./src/${name}.ts`);
const { MpController } = load('mp/mp.controller');
const { MpService } = load('mp/mp.service');
const { ReservationSlotService } = load('court-reserve/reservation-slot.service');
const { CourtReserve, CourtReserveSchema } = load('court-reserve/entities/court-reserve.entity');
const { JwtStrategy } = load('auth/strategies/jwt.strategy');
const { AuthController } = load('auth/auth.controller');
const { AuthService } = load('auth/auth.service');
const { RegisterService } = load('register/register.service');
const { BillingPortalService } = load('membership-billing/billing-portal.service');
const { MembershipAccessGuard } = load('membership-billing/membership-access.guard');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE);
const expect = locator => ({
    toBeVisible: options => locator.waitFor({ state: 'visible', timeout: options?.timeout || 15000 }),
    async toHaveText(text, options) {
        const until = Date.now() + (options?.timeout || 15000);
        while (Date.now() < until) {
            if (await locator.textContent({ timeout: 15000 }) === text) return;
            await new Promise(done => setTimeout(done, 100));
        }
        assert.equal(await locator.textContent(), text);
    },
});
const origin = 'https://ctq.serviciosasm.cl';
const api = 'https://api.ctq-fixture.invalid';
const dist = process.env.RETURN_TEST_DIST;
const out = process.env.RETURN_TEST_OUTPUT;
const secret = 'isolated-reservation-return-fixture';
const owner = 'owner@example.invalid';
const restrictedEmail = 'restricted@example.invalid';
const report = { date: '2026-10-29', mode: 'isolated Nest/JWT/Mongo; no providers', passed: [], captures: [], bundle: {} };
let db, app, browser, currentPage;

(async () => {
    const uri = new URL(process.env.RETURN_TEST_MONGO_URI);
    assert.equal(uri.hostname, '127.0.0.1');
    assert.match(uri.pathname, /^\/ctq_return_test_[a-z\d_]+$/i);
    assert(dist && out, 'Explicit temporary build/output directories required');
    await mkdir(out, { recursive: true });
    const index = await readFile(`${dist}/index.html`);
    const materializeJs = await readFile(`${front}/node_modules/materialize-css/dist/js/materialize.min.js`);
    const materializeCss = await readFile(`${front}/node_modules/materialize-css/dist/css/materialize.min.css`);
    report.bundle.indexSha256 = createHash('sha256').update(index).digest('hex');
    db = await mongoose.createConnection(uri.href).asPromise();
    const reserves = db.model(CourtReserve.name, CourtReserveSchema);
    await reserves.createCollection();
    const fixture = (id, email = owner, extra = {}) => ({
        idCourtReserve: id, passCourtReserve: 'not-exposed', court: 'fixture', dateToPlay: '2026-10-29',
        turn: '20:15-22:00', ownerEmail: email, isPaidNight: true,
        wasPaid: false, state: false, reservationStatus: 'PENDING_PAYMENT', ...extra,
    });
    const approved = { wasPaid: true, paymentStatus: 'approved', state: true, reservationStatus: 'CONFIRMED' };
    await reserves.collection.insertMany([
        fixture('waiting'), fixture('confirmed', owner, approved),
        fixture('review', owner, { ...approved, state: false, reservationStatus: 'PAYMENT_REVIEW_REQUIRED' }),
        fixture('other', 'other@example.invalid', approved), fixture('legacy', null, approved),
        fixture('restricted', restrictedEmail, approved), fixture('late'),
    ]);
    const initialCount = await reserves.countDocuments();
    const password = 'isolated-fixture-password';
    const pwd = await bcrypt.hash(password, 4);
    const permission = email => ({
        financiallyRestricted: email === restrictedEmail, role: 'user', name: 'Usuario fixture', accountActive: true,
    });
    const portal = { enabled: () => true, permissions: async email => permission(email), access: async email => permission(email) };
    const settings = { get: key => key === 'SECRET_KEY' ? secret : undefined };
    const module = await Test.createTestingModule({
        imports: [PassportModule, JwtModule.register({ secret, signOptions: { expiresIn: '1h' } })],
        controllers: [MpController, AuthController],
        providers: [MpService, AuthService, JwtStrategy,
            { provide: ConfigService, useValue: settings },
            { provide: getModelToken(CourtReserve.name), useValue: reserves },
            { provide: ReservationSlotService, useValue: {
                beginCheckout() { throw Error('Return must not write slots'); },
                storeCheckout() { throw Error('Return must not write slots'); },
            } },
            { provide: RegisterService, useValue: { validatePlayerEmail: async email => [owner, restrictedEmail].includes(email)
                ? { email, pwd, namePlayer: 'Usuario fixture', role: 'user', statePlayer: true, updatePayment: true } : null } },
            { provide: BillingPortalService, useValue: portal },
            { provide: APP_GUARD, useClass: MembershipAccessGuard },
        ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    const local = await app.getUrl();
    const jwt = app.get(JwtService);
    const token = jwt.sign({ email: owner, role: 'user' });
    for (const [bearer, id, code] of [
        [null, 'confirmed', 401], [jwt.sign({ email: owner }, { expiresIn: -1 }), 'confirmed', 401],
        [token, 'other', 404], [token, 'missing', 404], [token, 'legacy', 404],
    ]) {
        const response = await fetch(`${local}/mp/reservations/${id}/status?status=approved`, {
            headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
        });
        assert.equal(response.status, code); report.passed.push(`HTTP ${id}: ${code}`);
    }
    const valid = await fetch(`${local}/mp/reservations/confirmed/status`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(valid.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await valid.json(), { reservationId: 'confirmed', status: 'CONFIRMED' });
    report.passed.push('HTTP authoritative read, no cache or secret fields');

    for (const engine of ['chromium', 'webkit']) {
        browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium'
            ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
        for (const width of [390, 820, 1440]) {
            const context = await browser.newContext({ viewport: { width, height: 1000 } });
            const page = await context.newPage();
            currentPage = page;
            const errors = [], writes = [];
            report.current = { engine, width, errors };
            let reads = 0, outage = false;
            page.on('pageerror', error => errors.push(error.message));
            await context.route('**/*', async route => {
                const request = route.request(), url = new URL(request.url());
                if (url.origin === api) {
                    const headers = { 'access-control-allow-origin': origin,
                        'access-control-allow-headers': 'Content-Type,Authorization',
                        'access-control-allow-methods': 'GET,POST,OPTIONS' };
                    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
                    if (request.method() !== 'GET') writes.push(url.pathname);
                    if (url.pathname.startsWith('/mp/reservations/')) {
                        reads++;
                        if (outage === 'network') return route.abort();
                        if (outage) return route.fulfill({ status: outage === 401 ? 401 : 503, headers, json: { message: 'fixture outage' } });
                    }
                    if (url.pathname === '/membership-billing/me/access') {
                        const payload = jwt.verify(request.headers().authorization.split(' ')[1]);
                        return route.fulfill({ headers, json: permission(payload.email) });
                    }
                    const response = await fetch(`${local}${url.pathname}${url.search}`, {
                        method: request.method(), headers: { 'Content-Type': 'application/json',
                            ...(request.headers().authorization ? { Authorization: request.headers().authorization } : {}) },
                        ...(request.postData() ? { body: request.postData() } : {}),
                    });
                    return route.fulfill({ status: response.status, headers, contentType: 'application/json', body: await response.text() });
                }
                if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
                if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materializeCss });
                if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
                if (url.origin !== origin) return route.abort();
                const file = resolve(dist, url.pathname.startsWith('/assets/') || /\.(png|jpg|svg|ico|woff2?)$/.test(url.pathname)
                    ? `.${url.pathname}` : 'index.html');
                assert(file.startsWith(resolve(dist) + sep));
                try {
                    const contentType = ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(file)];
                    return route.fulfill({ body: await readFile(file), contentType });
                } catch { return route.fulfill({ status: 404, body: '' }); }
            });
            const check = label => report.passed.push(`${engine}/${width}: ${label}`);
            const noConfirmation = async () => assert.equal(await page.locator('.payment-status-card--success').count(), 0);
            const fit = async () => {
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
                const controls = page.locator('.payment-status-card button');
                for (const box of await controls.evaluateAll(nodes => nodes.map(node => {
                    const r = node.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, height: r.height };
                }))) assert(box.x >= 0 && box.right <= width + 1 && box.height >= 44);
            };
            const login = async (email = owner) => {
                await page.locator('#email').fill(email); await page.locator('#password').fill(password);
                await page.locator('button[type=submit]').click();
                await page.waitForURL(/\/payment\//); await page.locator('.payment-status-card').waitFor();
            };
            await page.goto(`${origin}/payment/success?external_reference=waiting&status=approved&payment_id=forged`);
            await page.waitForURL('**/login'); await login();
            await expect(page.getByRole('heading', { name: 'Confirmación pendiente' })).toBeVisible({ timeout: 15000 });
            await noConfirmation(); assert.equal(reads, 4); await fit();
            check('anonymous login restores reference; forged approved stays waiting; four bounded reads');
            await page.screenshot({ path: `${out}/return-waiting-${engine}-${width}.png`, fullPage: true });
            report.captures.push(`return-waiting-${engine}-${width}.png`);

            outage = true; await page.getByRole('button', { name: 'Volver a verificar' }).click();
            await expect(page.getByRole('heading', { name: 'No pudimos verificar la reserva' })).toBeVisible();
            await noConfirmation(); outage = false; check('503 read never confirms or creates another checkout');
            outage = 'network'; await page.getByRole('button', { name: 'Volver a verificar' }).click();
            await expect(page.getByRole('heading', { name: 'No pudimos verificar la reserva' })).toBeVisible();
            await noConfirmation(); outage = false; check('network failure never becomes approval or rejection');

            for (const kind of ['success', 'failure', 'pending']) {
                await page.goto(`${origin}/payment/${kind}?reservation=confirmed&status=rejected`);
                await expect(page.locator('.payment-status-card--success h1')).toHaveText('Reserva confirmada');
                await expect(page.locator('.swal2-title')).toHaveText('Reserva confirmada');
                await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
                await page.locator('.swal2-container').waitFor({ state: 'hidden' }); await fit();
                check(`${kind} trusts persisted confirmation, not rejected query; SweetAlert2`);
            }
            await page.screenshot({ path: `${out}/return-confirmed-${engine}-${width}.png`, fullPage: true });
            report.captures.push(`return-confirmed-${engine}-${width}.png`);
            await page.goto(`${origin}/payment/success?reservation=review&status=approved`);
            await expect(page.getByRole('heading', { name: 'Pago recibido, reserva en revisión' })).toBeVisible();
            await noConfirmation(); await fit(); check('approved payment with slot review is not a confirmed reservation');
            for (const id of ['other', 'missing', 'legacy']) {
                await page.goto(`${origin}/payment/success?reservation=${id}&status=approved`);
                await expect(page.getByRole('heading', { name: 'No pudimos verificar la reserva' })).toBeVisible();
                await noConfirmation(); check(`${id} inaccessible: no false success`);
            }
            const before = reads;
            await page.goto(`${origin}/payment/success?status=approved&payment_id=forged`);
            await expect(page.getByRole('heading', { name: 'No pudimos verificar la reserva' })).toBeVisible();
            assert.equal(reads, before); await noConfirmation(); check('missing reference cannot query or confirm');

            await reserves.collection.updateOne({ idCourtReserve: 'late' }, { $set: { wasPaid: false, state: false, reservationStatus: 'PENDING_PAYMENT', paymentStatus: 'pending' } });
            const firstLateRead = page.waitForResponse(response => response.url().includes('/late/status'));
            await page.goto(`${origin}/payment/pending?reservation=late`);
            await firstLateRead;
            await reserves.collection.updateOne({ idCourtReserve: 'late' }, { $set: approved });
            await expect(page.locator('.payment-status-card--success h1')).toHaveText('Reserva confirmada', { timeout: 15000 });
            await page.getByRole('button', { name: 'Aceptar', exact: true }).click(); check('late persisted confirmation is observed on next read');

            await page.evaluate(expired => localStorage.setItem('token', expired), jwt.sign({ email: owner }, { expiresIn: -1 }));
            await page.goto(`${origin}/payment/failure?reservation=waiting&status=approved`);
            await page.waitForURL('**/login');
            await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
            await login(restrictedEmail);
            // Login restores the old reference, but this different owner cannot read it.
            await expect(page.getByRole('heading', { name: 'No pudimos verificar la reserva' })).toBeVisible();
            await page.goto(`${origin}/payment/success?reservation=restricted`);
            await expect(page.locator('.payment-status-card--success h1')).toHaveText('Reserva confirmada');
            await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
            await expect(page.getByRole('button', { name: 'Ir a mensualidades' })).toBeVisible();
            check('expired session restores login; restricted member can read only own return');
            outage = 401;
            await page.goto(`${origin}/payment/pending?reservation=restricted`);
            await page.waitForURL('**/login');
            await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
            outage = false; await login(restrictedEmail);
            await expect(page.locator('.payment-status-card--success h1')).toHaveText('Reserva confirmada');
            await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
            await page.locator('.swal2-container').waitFor({ state: 'hidden' });
            check('server 401 routes immediately to login and restores the reservation reference');
            assert.deepEqual(errors, []); assert(writes.every(path => path === '/auth/login'));
            assert.equal(await reserves.countDocuments(), initialCount);
            check('no page errors, unexpected writes or created reservations');
            await context.close();
        }
        await browser.close(); browser = null;
    }
    report.status = 'passed';
})().catch(async error => {
    report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
    if (currentPage && !currentPage.isClosed()) {
        report.failedUrl = currentPage.url();
        report.failedText = (await currentPage.locator('body').innerText()).slice(0, 2500);
        await currentPage.screenshot({ path: `${out}/failure.png`, fullPage: true });
    }
}).finally(async () => {
    if (browser) await browser.close();
    if (app) await app.close();
    if (db) { await db.dropDatabase(); await db.close(); }
    await writeFile(`${out}/reservation-return-e2e.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, passed: report.passed.length, error: report.error }));
});
