import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import handler from 'serve-handler';
import { parse } from 'parse5';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [distArg, outArg, playwrightArg] = process.argv.slice(2);
assert(distArg && outArg && playwrightArg, 'Usage: node tests/e2e/siteMetadata.mjs BUILD OUTPUT PLAYWRIGHT_MODULE');
const dist = resolve(distArg), output = resolve(outArg);
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const origins = ['https://ctq.serviciosasm.cl', 'https://app-tenis-qtro-2-be6b838be293.herokuapp.com'];
const report = { date: '2026-10-29', mode: 'Local build and serve-handler; public origins emulated; no live CTQ APIs',
    deployed: false, passed: [], captures: [], http: [], browsers: {} };
let server, browser, page;
const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
const attr = (node, name) => node.attrs?.find(value => value.name === name)?.value;
const fixtureUrls = [];

try {
    await mkdir(output, { recursive: true });
    const assets = JSON.parse(await readFile(resolve(root, 'docs/evidence/site-identity/assets.json'), 'utf8'));
    const index = await readFile(resolve(dist, 'index.html'));
    assert(index.includes('Club de Tenis Quintero'));
    report.bundleSha256 = hash(index);
    const unsafeMethods = [];
    server = createServer((request, response) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) unsafeMethods.push(request.method);
        return handler(request, response, { public: dist, rewrites: [{ source: '**', destination: '/index.html' }] });
    });
    await new Promise(done => server.listen(0, '127.0.0.1', done));
    const local = `http://127.0.0.1:${server.address().port}`;
    for (const ua of ['CTQ-fixture-check', 'WhatsApp/2.24 CTQ-fixture', 'facebookexternalhit/1.1 CTQ-fixture']) {
        for (const path of ['/', '/login', '/profile?private-marker=never-in-metadata', '/monthlypayments/return?reference=private-marker&payment_id=private-marker']) {
            const response = await fetch(`${local}${path}`, { headers: { 'User-Agent': ua } });
            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type'), /text\/html/);
            const html = await response.text(), nodes = walk(parse(html));
            const head = nodes.find(node => node.tagName === 'head');
            const metadata = walk(head).filter(node => node.tagName === 'meta');
            const og = Object.fromEntries(metadata.filter(node => attr(node, 'property')?.startsWith('og:'))
                .map(node => [attr(node, 'property'), attr(node, 'content')]));
            assert.equal(og['og:title'], 'Club de Tenis Quintero');
            assert.equal(og['og:image'], `${origins[0]}/images/ctq-compartir-v1.png`);
            assert.equal(og['og:url'], `${origins[0]}/`);
            assert(!JSON.stringify(og).includes('private-marker'));
            report.http.push({ path, userAgent: ua, status: response.status, contentType: response.headers.get('content-type') });
            report.passed.push(`HTML initial metadata without JS or login: ${ua} ${path}`);
        }
    }
    for (const [file, metadata] of Object.entries(assets.outputs)) {
        const response = await fetch(`${local}/${file}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(response.status, 200);
        assert.equal(hash(bytes), metadata.sha256);
        const type = response.headers.get('content-type');
        assert.match(type, file.endsWith('.ico') ? /^image\/(vnd\.microsoft\.icon|x-icon)/ : /^image\/png/);
        const head = await fetch(`${local}/${file}`, { method: 'HEAD' });
        assert.equal(head.status, 200);
        assert.equal(Number(head.headers.get('content-length')), bytes.length);
        report.http.push({ path: `/${file}`, status: response.status, headStatus: head.status,
            contentType: type, bytes: bytes.length, sha256: hash(bytes) });
        fixtureUrls.push({ file, data: `data:${type};base64,${bytes.toString('base64')}`, metadata });
        report.passed.push(`Public binary GET/HEAD, MIME and hash: ${file}`);
    }
    const materializeJs = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
    const materializeCss = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
    for (const engine of ['chromium', 'webkit']) {
        browser = await ({ chromium, webkit }[engine]).launch(engine === 'chromium'
            ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
        report.browsers[engine] = browser.version();
        for (const width of [390, 820, 1440]) {
            for (const [originIndex, origin] of origins.entries()) {
                const context = await browser.newContext({ viewport: { width, height: 1000 } });
                page = await context.newPage();
                const errors = [], apiCalls = [];
                page.on('pageerror', error => errors.push(error.message));
                await context.route('**/*', async route => {
                    const request = route.request(), url = new URL(request.url());
                    if (origins.includes(url.origin)) {
                        assert.equal(request.method(), 'GET');
                        const response = await route.fetch({ url: `${local}${url.pathname}${url.search}` });
                        return route.fulfill({ response });
                    }
                    if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: materializeJs });
                    if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: materializeCss });
                    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
                    apiCalls.push(url.origin); return route.abort();
                });
                await page.goto(`${origin}/login`);
                await page.locator('#email').waitFor();
                assert.equal(await page.title(), 'Club de Tenis Quintero');
                assert.equal(await page.locator('html').getAttribute('lang'), 'es-CL');
                assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),
                    `${origins[0]}/images/ctq-compartir-v1.png`);
                report.passed.push(`${engine}/${width}/${originIndex}: app login retains institutional metadata`);
                const pixels = await page.evaluate(async inputs => {
                    const decoded = [];
                    for (const { file, data } of inputs) {
                        const image = new Image(); image.src = data; await image.decode();
                        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
                        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
                        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                        let blue = 0, yellow = 0;
                        for (let i = 0; i < rgba.length; i += 4) {
                            if (rgba[i + 2] > rgba[i] + 20 && rgba[i + 2] > 70) blue++;
                            if (rgba[i] > 170 && rgba[i + 1] > 150 && rgba[i + 2] < 150) yellow++;
                        }
                        decoded.push({ file, width: image.naturalWidth, height: image.naturalHeight, blue, yellow });
                    }
                    return decoded;
                }, fixtureUrls);
                for (const item of pixels) {
                    const expected = assets.outputs[item.file];
                    if (item.file.endsWith('.ico')) assert([16, 32, 48].includes(item.width));
                    else assert.deepEqual([item.width, item.height], [expected.width, expected.height]);
                    assert(item.blue > 0 && item.yellow > 0, `${item.file} must be nonblank and retain brand colors`);
                }
                report.passed.push(`${engine}/${width}/${originIndex}: all four image formats decode with brand pixels`);
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
                if (originIndex === 0 && width === 390) {
                    const capture = `login-${engine}-${width}.png`;
                    await page.screenshot({ path: resolve(output, capture), fullPage: true }); report.captures.push(capture);
                }
                if (originIndex === 0) {
                    const icon = name => fixtureUrls.find(item => item.file === name).data;
                    // Asset inspection sheet, not a simulation or claim of a real WhatsApp preview.
                    await page.setContent(`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>CTQ: inspeccion local de activos</title>
                        <style>body{margin:0;background:#fff;color:#122a43;font:16px Arial,sans-serif}main{max-width:1200px;margin:auto;padding:24px;box-sizing:border-box}h1{font-size:22px}h2{font-size:16px}figure{margin:0}header{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin:24px 0}figure img{display:block}figcaption{font-size:13px;margin-top:8px}.share{display:block;width:100%;height:auto;border:1px solid #d8e1ea;box-sizing:border-box}</style></head><body><main>
                        <h1>Club de Tenis Quintero</h1><header>
                        ${[16, 32, 48].map(size => `<figure><img src="${icon('ctq-favicon-v1.ico')}" width="${size}" height="${size}" alt="Favicon CTQ"><figcaption>${size} px</figcaption></figure>`).join('')}
                        <figure><img src="${icon('ctq-apple-touch-v1.png')}" width="90" height="90" alt="Icono CTQ iOS"><figcaption>iOS: 180 px</figcaption></figure></header>
                        <h2>Imagen institucional para compartir</h2><img class="share" src="${icon('images/ctq-compartir-v1.png')}" width="1200" height="630" alt="Logo del Club de Tenis Quintero"></main></body></html>`);
                    await page.locator('.share').evaluate(image => image.decode());
                    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
                    const capture = `assets-${engine}-${width}.png`;
                    await page.screenshot({ path: resolve(output, capture), fullPage: true }); report.captures.push(capture);
                }
                assert.deepEqual(errors, []); assert.deepEqual(apiCalls, []);
                report.passed.push(`${engine}/${width}/${originIndex}: no overflow, page errors or API requests`);
                await context.close();
            }
        }
        const context = await browser.newContext({ javaScriptEnabled: false });
        const noJs = await context.newPage();
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== new URL(local).origin) return route.abort();
            return route.continue();
        });
        await noJs.goto(`${local}/login`);
        assert.equal(await noJs.title(), 'Club de Tenis Quintero');
        assert.equal(await noJs.locator('meta[property="og:image"]').getAttribute('content'),
            `${origins[0]}/images/ctq-compartir-v1.png`);
        report.passed.push(`${engine}: initial metadata exists with JavaScript disabled`);
        await context.close(); await browser.close(); browser = null;
    }
    assert.deepEqual(unsafeMethods, []);
    report.passed.push('No writes or live CTQ/provider API traffic');
    report.status = 'passed';
} catch (error) {
    report.status = 'failed'; report.error = error.stack; process.exitCode = 1;
    if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
} finally {
    if (browser) await browser.close();
    if (server) await new Promise(done => server.close(done));
    await writeFile(resolve(output, 'site-metadata-e2e.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ status: report.status, checkpoints: report.passed.length, error: report.error }));
}
