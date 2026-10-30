import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PROFILE_TEST_URL || 'http://127.0.0.1:5182';
const email = 'profile@test.invalid';
const rivals = [
    'Amin Globetti Kafati Jadue',
    'María José de la Fuente González',
    'MaximilianodelosAngelesApellidoCompuesto',
];
const doubles = 'Amin Globetti Kafati Jadue , José Ignacio de la Fuente González , María Soledad Oyarzun';
const history = [...rivals, doubles].map((rival, index) => ({
    id: `match-${index}`, jugadorId: email, fecha: '2026-10-15', rival,
    score: '7:6, 7:6', ganador: index % 2 === 0, isDouble: index === rivals.length,
}));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    for (const viewport of [
        { name: 'iphone-small', width: 320, height: 568 },
        { name: 'iphone', width: 390, height: 844 },
        { name: 'ipad', width: 820, height: 1180 },
        { name: 'ipad-landscape', width: 1180, height: 820 },
        { name: 'desktop', width: 1440, height: 900 },
    ]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (request.method() !== 'GET') return route.abort();
            if (url.pathname.includes('/register/profile/')) return route.fulfill({ json: {
                namePlayer: 'Alejandro Silva M.', email, category: '3', points: 1635,
            } });
            if (url.pathname.endsWith('/match-ranking/ranking')) return route.fulfill({ json: {
                '3': [{ id: email, nombre: 'Alejandro Silva M.', puntos: 1635, categoria: '3', rank: 13 }],
                Dobles: [{ id: email, nombre: 'Alejandro Silva M.', puntos: 500, categoria: 'Dobles', rank: 5 }],
            } });
            if (url.pathname.includes('/match-ranking/history/')) return route.fulfill({ json: history });
            if (url.origin !== new URL(base).origin) return route.abort();
            if (url.pathname === '/fixture-profile') return route.fulfill({
                contentType: 'text/html',
                body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div><script type="module">import R from "/@react-refresh"; R.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.ready=true;</script></body></html>',
            });
            return route.continue();
        });
        await page.goto(base + '/fixture-profile');
        await page.waitForFunction(() => window.ready);
        await page.evaluate(async email => {
            const source = await (await fetch('/src/main.tsx?import')).text();
            const version = source.match(/\.js\?v=([^"']+)/)[1];
            const { default: React } = await import('/node_modules/.vite/deps/react.js?v=' + version);
            const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js?v=' + version);
            const { BrowserRouter } = await import('/node_modules/.vite/deps/react-router-dom.js?v=' + version);
            await import('/node_modules/materialize-css/dist/css/materialize.min.css');
            await import('/src/index.css');
            const { default: Profile } = await import('/src/components/PlayerProfile.tsx');
            localStorage.setItem('userInfo', JSON.stringify({ name: 'Alejandro Silva M.', email, role: 'user' }));
            ReactDOM.createRoot(document.getElementById('fixture')).render(
                React.createElement(BrowserRouter, {}, React.createElement(Profile)),
            );
        }, email);
        await page.getByText(rivals[0], { exact: true }).waitFor();
        const checkLayout = async expected => {
            assert.deepEqual(await page.locator('.match-rival strong').allTextContents(), expected);
            assert.equal(await page.getByText('A. Jadue', { exact: true }).count(), 0);
            const layout = await page.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > innerWidth,
                rows: [...document.querySelectorAll('.match-row')].map(row => {
                    const nodes = ['.match-date', '.match-rival', '.match-score', '.match-result-pill']
                        .map(selector => row.querySelector(selector));
                    const boxes = nodes.map(node => node.getBoundingClientRect());
                    const rival = nodes[1];
                    return {
                        clipped: rival.scrollHeight > rival.clientHeight + 1 || rival.scrollWidth > rival.clientWidth + 1,
                        overlaps: boxes.some((box, index) => boxes.slice(index + 1).some(other =>
                            Math.min(box.right, other.right) - Math.max(box.left, other.left) > 1
                            && Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > 1)),
                    };
                }),
            }));
            assert.equal(layout.overflow, false);
            assert(layout.rows.every(row => !row.clipped && !row.overlaps));
        };
        await checkLayout(rivals);
        await page.screenshot({ path: '/tmp/ctq-profile-full-names-' + viewport.name + '.png', fullPage: true });
        await page.getByRole('button', { name: 'Dobles', exact: true }).click();
        await page.getByText(doubles, { exact: true }).waitFor();
        await checkLayout([doubles]);
        await page.screenshot({ path: '/tmp/ctq-profile-full-names-doubles-' + viewport.name + '.png', fullPage: true });
        assert.deepEqual(errors, []);
        console.log('PASS full names, singles/doubles, no clipping or overlaps: ' + viewport.name);
        await page.close();
    }
} finally {
    await browser.close();
}
