import assert from 'node:assert/strict';

// Isolated browser fixture: every API request is intercepted, including writes.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.RESULTS_TEST_URL || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const profiles = [
    { name: 'iphone-small', width: 320, height: 568 },
    { name: 'iphone', width: 390, height: 844 },
    { name: 'ipad', width: 820, height: 1180 },
    { name: 'ipad-landscape', width: 1180, height: 820 },
    { name: 'desktop', width: 1440, height: 900 },
];
const players = ['Ana Apellido Paterno Materno', 'Beto Apellido Paterno Materno', 'Carolina Apellido Paterno Materno', 'Diego Apellido Paterno Materno']
    .map((name, index) => ({ name, email: index + '@test.invalid', category: '4', points: 100 + index * 100 }));
const match = (id, extra = {}) => ({
    idCourtReserve: id, court: '3', dateToPlay: '2026-10-14', turn: '08:15-10:00',
    isDouble: false, players: players.slice(0, 2), canRegister: true, blockedCode: null, blockedReason: null, ...extra,
});
const queue = () => ({
    matches: [match('oldest'), match('next', { canRegister: false, blockedCode: 'PREVIOUS_RESULT_PENDING', blockedReason: 'Registra primero el resultado del partido anterior.' })],
    member: { name: players[0].name, email: players[0].email },
    totalPending: 2, serverNow: '2026-10-14T18:00:00Z',
});
try {
    for (const profile of profiles) {
        const page = await browser.newPage({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1200 });
        const errors = [];
        const writes = [];
        let state = queue();
        let delay = false;
        let release;
        let rejectSave = false;
        let rejectGet = false;
        let reviewingEmail;
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => { errors.push('Unexpected native dialog'); void dialog.dismiss(); });
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.pathname.endsWith('/match-ranking/pending')) {
                reviewingEmail = url.searchParams.get('playerEmail');
                assert.equal(route.request().headers().authorization, 'Bearer isolated-test');
                return rejectGet ? route.fulfill({ status: 503, json: { message: 'Servidor no disponible.' } }) : route.fulfill({ json: state });
            }
            if (url.pathname.endsWith('/register') && route.request().method() === 'GET') {
                return route.fulfill({ json: [{ namePlayer: players[0].name, email: players[0].email, cellular: '+56900000000', statePlayer: false, updatePayment: false, role: 'user', partnerType: 'Titular' }] });
            }
            if (url.pathname.endsWith('/match-ranking') && route.request().method() === 'POST') {
                assert.equal(route.request().headers().authorization, 'Bearer isolated-test');
                const body = route.request().postDataJSON();
                writes.push(body);
                if (delay) await new Promise(resolve => { release = resolve; });
                if (rejectSave) return route.fulfill({ status: 409, json: { code: 'POINTS_CHANGED', message: 'Los puntos cambiaron. Revisa nuevamente.' } });
                state.matches = state.matches.map(row => {
                    if (row.idCourtReserve === body.matchId) {
                        const size = row.isDouble ? 2 : 1;
                        return { ...row, phase: 'RECORDED', canRegister: false, blockedCode: 'RESULT_ALREADY_REGISTERED',
                            blockedReason: 'Uno de los participantes ya ingresó el resultado.',
                            result: { score: body.result, winners: row.players.slice(body.winnerSide === 'A' ? 0 : size, body.winnerSide === 'A' ? size : size * 2).map(player => player.name) } };
                    }
                    return row.phase === 'RECORDED' ? row : { ...row, canRegister: true, blockedCode: null, blockedReason: null };
                });
                state.totalPending = state.matches.filter(row => row.phase !== 'RECORDED').length;
                return route.fulfill({ status: 201, json: { pointChanges: [{ name: players[0].name, category: '4', delta: 300, after: 400 }] } });
            }
            if (url.origin !== new URL(base).origin) return route.abort();
            if (['/fixture', '/updatematch', '/adminregister'].includes(url.pathname)) return route.fulfill({
                contentType: 'text/html',
                body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="fixture"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.ready=true;</script></body></html>',
            });
            // A local backend is never permitted, even if VITE_API_URL points to localhost.
            if (url.port !== new URL(base).port) return route.abort();
            return route.continue();
        });
        const mount = async (admin = false) => {
            await page.goto(base + '/fixture');
            await page.waitForFunction(() => window.ready);
            await page.evaluate(async admin => {
                const source = await (await fetch('/src/main.tsx?import')).text();
                const version = source.match(/\.js\?v=([^"']+)/)[1];
                const { default: React } = await import('/node_modules/.vite/deps/react.js?v=' + version);
                const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js?v=' + version);
                const { BrowserRouter, Routes, Route, Link } = await import('/node_modules/.vite/deps/react-router-dom.js?v=' + version);
                await import('/node_modules/materialize-css/dist/css/materialize.min.css');
                await import('/src/index.css');
                const { default: Results } = await import('/src/components/MatchResultUpdate.tsx');
                const { default: Admin } = await import('/src/components/AdminRegister.tsx');
                localStorage.setItem('token', 'isolated-test');
                const schedule = window.setInterval.bind(window);
                window.setInterval = (callback, delay, ...args) => {
                    if (delay === 60000) window.backgroundRefresh = callback;
                    return schedule(callback, delay, ...args);
                };
                ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(BrowserRouter, {},
                    React.createElement('nav', { className: 'ctq-nav' }, 'CTQ'),
                    React.createElement('div', { className: 'app-content-wrapper' }, React.createElement(Routes, {},
                        React.createElement(Route, { path: '/fixture', element: React.createElement(Link, { to: admin ? '/adminregister' : '/updatematch' }, 'Abrir resultados') }),
                        React.createElement(Route, { path: '/adminregister', element: React.createElement(Admin) }),
                        React.createElement(Route, { path: '/updatematch', element: React.createElement(Results) })))));
            }, admin);
            await page.getByRole('link', { name: 'Abrir resultados' }).click();
        };
        await mount();
        await page.getByRole('button', { name: 'Ingresar resultado' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Ingresar resultado' }).count(), 1);
        assert.equal(await page.locator('.results-match').count(), 2);
        await page.getByRole('button', { name: 'Ver motivo del bloqueo' }).click();
        await page.getByRole('dialog', { name: 'Resultado bloqueado' }).waitFor();
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: '/tmp/ctq-results-list-' + profile.name + '.png', fullPage: true });
        await page.getByRole('button', { name: 'Ingresar resultado' }).click();
        const score = page.getByRole('textbox', { name: 'Marcador por sets' });
        await score.fill('invalid');
        await page.getByRole('radio', { name: /Player 1/ }).check();
        assert.equal(await page.getByRole('radio', { name: /Team [12]/ }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Guardar resultado', exact: true }).isDisabled(), true);
        await page.getByRole('button', { name: 'Revisar marcador', exact: true }).click();
        await page.getByRole('dialog', { name: 'Marcador inválido' }).waitFor();
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        assert.equal(await score.inputValue(), 'invalid');
        await score.fill('6:4, 6:3');
        assert(parseFloat(await score.evaluate(node => getComputedStyle(node).fontSize)) >= 16);
        assert.equal(await page.locator('input[type=radio]').first().evaluate(node => getComputedStyle(node).opacity), '1');
        await page.screenshot({ path: '/tmp/ctq-results-editor-' + profile.name + '.png', fullPage: true });
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.getByRole('dialog', { name: 'Cambios sin guardar' }).waitFor();
        await page.getByRole('button', { name: 'Seguir editando' }).click();
        assert.equal(await score.inputValue(), '6:4, 6:3');
        await page.evaluate(() => history.back());
        await page.getByRole('dialog', { name: 'Cambios sin guardar' }).waitFor();
        await page.getByRole('button', { name: 'Seguir editando' }).click();
        assert.equal(await score.inputValue(), '6:4, 6:3');
        await page.getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.getByRole('dialog', { name: 'Confirmar resultado' }).waitFor();
        await page.getByRole('button', { name: 'Revisar', exact: true }).click();
        assert.equal(writes.length, 0);
        delay = true;
        await page.getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.getByRole('dialog', { name: 'Confirmar resultado' }).getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.results-editor input')?.disabled === true);
        assert.equal(await page.getByRole('button', { name: 'Cancelar', exact: true }).isDisabled(), true);
        await page.evaluate(() => history.back());
        await page.waitForFunction(() => location.pathname === '/updatematch' && document.querySelector('.results-editor input')?.disabled === true);
        assert.equal(new URL(page.url()).pathname, '/updatematch');
        assert(release); release();
        await page.getByRole('dialog', { name: 'Resultado guardado' }).waitFor();
        assert.deepEqual(writes[0], { matchId: 'oldest', result: '6:4, 6:3', winnerSide: 'A' });
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        assert.equal(await page.locator('.results-match').count(), 2);
        assert.equal(await page.getByRole('button', { name: 'Resultado ingresado', exact: true }).isDisabled(), true);
        assert.equal(await page.locator('.results-recorded-result').getByText('6:4, 6:3', { exact: true }).count(), 1);
        assert.equal(await page.locator('.results-match--recorded input').count(), 0);
        await page.screenshot({ path: '/tmp/ctq-results-after-save-' + profile.name + '.png', fullPage: true });
        await page.getByRole('button', { name: 'Ingresar resultado' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Ingresar resultado' }).count(), 1);
        delay = false;
        rejectSave = true;
        await page.getByRole('button', { name: 'Ingresar resultado' }).click();
        await score.fill('6:2, 6:2');
        await page.getByRole('radio', { name: /Player 2/ }).check();
        await page.getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.getByRole('dialog', { name: 'Confirmar resultado' }).getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.getByRole('dialog', { name: 'No se guardó el resultado' }).waitFor();
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        assert.equal(await score.inputValue(), '6:2, 6:2', 'A conflict must retain the draft');
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.getByRole('button', { name: 'Descartar y salir', exact: true }).click();
        await score.waitFor({ state: 'detached' });
        rejectSave = false;
        const writesBeforePeer = writes.length;
        state = { ...queue(), matches: [match('peer-result', {
            phase: 'RECORDED', canRegister: false, blockedCode: 'RESULT_ALREADY_REGISTERED',
            result: { score: '6:2, 6:4', winners: [players[1].name] },
        })], totalPending: 0 };
        await mount();
        await page.getByRole('heading', { name: 'Resultado registrado', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Resultado ingresado', exact: true }).isDisabled(), true);
        assert.equal(await page.getByRole('button', { name: 'Ingresar resultado' }).count(), 0);
        assert.equal(await page.locator('.results-recorded-result').getByText('6:2, 6:4', { exact: true }).count(), 1);
        assert.equal(await page.locator('.results-recorded-result').getByText('Ganador: ' + players[1].name, { exact: true }).count(), 1);
        assert.equal(writes.length, writesBeforePeer);
        await page.screenshot({ path: '/tmp/ctq-results-peer-' + profile.name + '.png', fullPage: true });
        state = { ...queue(), matches: [
            match('expired', { dateToPlay: '2026-10-10', canRegister: false, blockedCode: 'RESULT_DEADLINE_EXPIRED' }),
            match('old-recorded', { dateToPlay: '2026-10-10', phase: 'RECORDED', canRegister: false, result: { score: '6:1, 6:1', winners: [players[0].name] } }),
            match('expired-phase', { phase: 'EXPIRED', canRegister: false }),
            match('expired-status', { rankingResultStatus: 'EXPIRED', canRegister: false }),
            match('expired-code', { blockedCode: 'RESULT_DEADLINE_EXPIRED', canRegister: false }),
        ], totalPending: 0 };
        await mount();
        await page.getByRole('heading', { name: 'Sin partidos en esta ventana' }).waitFor();
        assert.equal(await page.getByRole('button', { name: /Ver vencidos/ }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Ingresar resultado' }).count(), 0);
        assert.equal(await page.locator('.results-match').count(), 0, 'Expired games must not be pending');
        state.matches = [match('valid-next')];
        state.totalPending = 1;
        await page.getByRole('button', { name: 'Actualizar pendientes' }).click();
        await page.getByRole('button', { name: 'Ingresar resultado' }).click();
        await score.fill('6:4, 6:3');
        await page.getByRole('radio', { name: /Player 1/ }).check();
        await page.getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.getByRole('dialog', { name: 'Confirmar resultado' }).getByRole('button', { name: 'Guardar resultado', exact: true }).click();
        await page.getByRole('dialog', { name: 'Resultado guardado' }).waitFor();
        assert.equal(Object.hasOwn(writes.at(-1), 'allowExpired'), false);
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        await page.getByRole('heading', { name: 'Resultado registrado', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Resultado ingresado', exact: true }).isDisabled(), true);
        assert.equal(await page.getByRole('button', { name: 'Ingresar resultado' }).count(), 0);
        state = { ...queue(), matches: [match('doubles', { isDouble: true, players: players.map(row => ({ ...row, category: 'Dobles' })) })], totalPending: 1 };
        await mount();
        await page.getByRole('button', { name: 'Ingresar resultado' }).click();
        await page.getByRole('radio', { name: /Team 1/ }).waitFor();
        assert.equal(await page.getByRole('radio', { name: /Team [12]/ }).count(), 2);
        assert.equal(await page.getByRole('radio', { name: /Lado [AB]/ }).count(), 0);
        assert.equal(await page.getByRole('radio', { name: /Player [12]/ }).count(), 0);
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.equal(await page.locator('.results-player').count(), 4);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        rejectGet = true;
        await page.getByRole('button', { name: 'Actualizar pendientes' }).click();
        await page.getByRole('dialog', { name: 'No pudimos cargar los partidos' }).getByText('Servidor no disponible.').waitFor();
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        await page.getByRole('button', { name: 'Actualizar pendientes' }).waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.querySelector('.results-refresh')?.disabled);
        const backgroundGet = page.waitForResponse(response => response.url().includes('/match-ranking/pending'));
        await page.evaluate(() => window.backgroundRefresh());
        await backgroundGet;
        await page.waitForTimeout(100);
        assert.equal(await page.getByRole('dialog').count(), 0, 'Background refresh must not repeat the same alert');
        await page.getByRole('button', { name: 'Ver error de carga' }).click();
        await page.getByRole('dialog', { name: 'No pudimos cargar los partidos' }).waitFor();
        await page.getByRole('button', { name: 'Entendido', exact: true }).click();
        rejectGet = false;
        await mount(true);
        const reviewButton = page.getByRole('button', { name: 'Revisar resultados de ' + players[0].name });
        await reviewButton.waitFor();
        assert.equal(await reviewButton.isDisabled(), false, 'An inactive member can still require historical result review');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (profile.width <= 600) {
            const box = await reviewButton.boundingBox();
            assert(box.width >= 44 && box.height >= 44);
        }
        await page.screenshot({ path: '/tmp/ctq-results-admin-' + profile.name + '.png', fullPage: true });
        await reviewButton.click();
        await page.getByRole('heading', { name: 'Resultados', exact: true }).waitFor();
        await page.locator('.results-match').first().waitFor();
        assert.equal(reviewingEmail, players[0].email);
        assert.deepEqual(errors, []);
        console.log('PASS two-day window, shared read-only result, player labels and SweetAlert2: ' + profile.name);
        await page.close();
    }
} finally {
    await browser.close();
}
