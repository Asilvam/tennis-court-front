import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [buildArg, outputArg, playwrightArg] = process.argv.slice(2);
assert(buildArg && outputArg && playwrightArg, 'Usage: node dashboardStatus.mjs BUILD OUTPUT PLAYWRIGHT');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const build = resolve(buildArg), output = resolve(outputArg);
const origin = 'https://ctq-dashboard.example.invalid', api = 'https://api.ctq-dashboard.example.invalid';
const { chromium, webkit } = await import(pathToFileURL(resolve(playwrightArg)).href);
const now = new Date('2026-11-04T12:00:00Z');
const token = ['e30', Buffer.from(JSON.stringify({ exp: Math.floor(now.getTime() / 1000) + 86400 })).toString('base64url'), 'fixture'].join('.');
const notice = 'Campeonato - Finalísima Copa Davis Chile vs Nueva Zelanda';
const commaNotice = 'Campeonato - Primera, Segunda, Tercera, Cuarta';
const fullNames = ['Alejandro Nombre Compuesto Apellido Largo', 'José Christian Ordenes Vegas', 'María Lourdes Oyarzun', 'Vicente ApellidoSinEspaciosMuyLargo'];
const court = (number, data = '', extra = {}) => ({ court: `Cancha ${number}`, data, available: !data, isPayed: false, isBlockedByAdmin: false, ...extra });
const fixtures = [
  { time: '08:15-10:00', slots: [court(1, notice, { isBlockedByAdmin: true }), court(2), court(3)] },
  { time: '10:15-12:00', slots: [court(1, commaNotice, { isBlockedByAdmin: true }), court(2), court(3)] },
  { time: '12:15-14:00', slots: [court(1, 'Mantencion - ' + 'SectorSinEspacios'.repeat(6), { isBlockedByAdmin: true }), court(2, 'Pendiente de pago', { isPendingPayment: true }), court(3, 'Clima - Lluvia intensa, canchas cerradas', { isBlockedByAdmin: true })] },
  { time: '16:15-18:00', slots: [court(1, 'Clases - José Christian Ordenes Vegas', { isBlockedByAdmin: true }), court(2, 'J. Millar, B. Millar'), court(3, 'V. Bugueño, J. Ordenes, M. Fonseca, V. Illesca')] },
  { time: '18:15-20:00', slots: [court(1, fullNames.join(', ')), court(2, 'Jugador Nombre Completo, Rival Apellido Compuesto'), court(3)] },
  { time: '20:15-22:00', slots: [court(1), court(2), court(3)] },
];
const css = await readFile(resolve(root, 'node_modules/materialize-css/dist/css/materialize.min.css'));
const js = await readFile(resolve(root, 'node_modules/materialize-css/dist/js/materialize.min.js'));
const report = { executedAt: new Date().toISOString(), scope: 'Built frontend, synthetic read-only dashboard APIs; no club data, bookings, payments or email', status: 'running', checks: [], views: [], errors: [], writes: [], unexpected: [] };
const check = (value, message) => { assert(value, message); report.checks.push(message); };
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
await mkdir(output, { recursive: true });
let browser, page;
try {
  for (const engine of ['webkit', 'chromium']) {
    browser = await ({ webkit, chromium }[engine]).launch(engine === 'chromium' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true } : { headless: true });
    for (const width of [320, 390, 430, 768, 820, 1024, 1157, 1440]) {
      const label = `${engine}/${width}`;
      const ctx = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'es-CL', timezoneId: 'America/Santiago', hasTouch: width <= 820 });
      await ctx.addInitScript(token => {
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({ name: 'Socio Fixture', email: 'member@example.invalid', role: 'user', canReserve: true }));
      }, token);
      await ctx.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === api) {
          if (request.method() !== 'GET' && url.pathname !== '/auth/checkBlocked') report.writes.push({ method: request.method(), path: url.pathname });
          const data = url.pathname.endsWith('/me/access') ? { name: 'Socio Fixture', role: 'user', canReserve: true, financiallyRestricted: false }
            : url.pathname === '/auth/checkBlocked' ? { blocked: false }
            : url.pathname.startsWith('/court-reserve/available/') ? fixtures
            : url.pathname.startsWith('/court-reserve/active/') ? null
            : url.pathname === '/register/names' ? fullNames
            : url.pathname === '/match-ranking' ? [] : undefined;
          if (data !== undefined) return route.fulfill({ json: data });
          report.unexpected.push(`${request.method()} ${url.pathname}`); return route.abort();
        }
        if (url.pathname.endsWith('materialize.min.css')) return route.fulfill({ contentType: 'text/css', body: css });
        if (url.pathname.endsWith('materialize.min.js')) return route.fulfill({ contentType: 'text/javascript', body: js });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.fulfill({ contentType: 'text/css', body: '' });
        if (url.origin !== origin) { report.unexpected.push(url.origin); return route.abort(); }
        const path = url.pathname.includes('.') ? resolve(build, '.' + url.pathname) : resolve(build, 'index.html');
        assert(path.startsWith(build + '/'));
        return route.fulfill({ contentType: mime[extname(path)] || 'text/html', body: await readFile(path) });
      });
      page = await ctx.newPage(); page.setDefaultTimeout(15000);
      await page.clock.install({ time: now });
      page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
      await page.goto(origin + '/dashboard');
      await page.locator('.time-row').last().waitFor();
      await page.locator('.swal2-container').waitFor({ state: 'hidden' });
      await page.locator('.date-input').fill('2026-11-05');
      await page.locator('.swal2-container').waitFor({ state: 'hidden' });
      await page.mouse.move(0, 0); await page.clock.runFor(300);
      const metrics = await page.evaluate(() => {
        const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        return {
          width: innerWidth, documentWidth: document.documentElement.scrollWidth,
          legend: [...document.querySelectorAll('.legend-item')].map(rect),
          rows: [...document.querySelectorAll('.time-row')].map(row => ({ courts: [...row.querySelectorAll('.court-card')].map(rect), width: row.querySelector('.courts-container').clientWidth, scrollWidth: row.querySelector('.courts-container').scrollWidth })),
          texts: [...document.querySelectorAll('.status-text,.status-player')].map(el => ({ text: el.textContent, ...rect(el), width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight, fontSize: parseFloat(getComputedStyle(el).fontSize), overflow: getComputedStyle(el).textOverflow })),
          mobileCards: [...document.querySelectorAll('.court-card:not(.available)')].map(el => ({ code: rect(el.querySelector('.court-name')), content: rect(el.querySelector('.status-text,.status-matchup')), doubles: !!el.querySelector('.status-matchup-doubles') })),
          cardContents: [...document.querySelectorAll('.court-card')].map(el => ({ card: rect(el), contents: [...el.querySelectorAll('.court-name,.status-text,.status-player,.status-vs')].map(rect) })),
          doubles: [...document.querySelectorAll('.status-matchup-doubles')].map(el => ({ ...rect(el), card: rect(el.closest('.court-card')), teams: [...el.querySelectorAll('.status-team')].map(team => ({ ...rect(team), players: [...team.querySelectorAll('.status-player')].map(player => { const range = document.createRange(); range.selectNodeContents(player); return { ...rect(player), text: rect(range) }; }) })), versus: rect(el.querySelector('.status-vs')) })),
        };
      });
      check(metrics.documentWidth <= width + 1, `${label}: page fits viewport`);
      check(metrics.rows.every(row => row.scrollWidth <= row.width + 1), `${label}: no court-row horizontal scrolling`);
      check(metrics.texts.every(text => text.scrollWidth <= text.width + 1 && text.scrollHeight <= text.height + 1 && text.fontSize >= 14 && text.overflow !== 'ellipsis'), `${label}: complete readable text without clipping or ellipsis`);
      check(metrics.cardContents.every(({ card, contents }) => contents.every(content => content.x >= card.x && content.right <= card.right && content.y >= card.y && content.bottom <= card.bottom)), `${label}: every text and versus stays inside its court card`);
      check(metrics.rows.every(row => row.courts.every((card, index) => index === 0 || (width <= 768 && row.courts[index - 1].y !== card.y ? row.courts[index - 1].bottom <= card.y : row.courts[index - 1].right <= card.x))), `${label}: court cards do not overlap`);
      check(await page.locator('.status-text').filter({ hasText: notice }).innerText() === notice, `${label}: full championship notice retained`);
      check(await page.locator('.status-text').filter({ hasText: commaNotice }).innerText() === commaNotice, `${label}: comma notice remains text, not players`);
      check(metrics.doubles.length === 2 && metrics.doubles.every(match => match.teams.length === 2 && match.teams.every(team => team.players.length === 2 && team.players[0].bottom <= team.players[1].y + 1 && Math.abs(team.players[0].x - team.players[1].x) < 1) && match.teams[0].right <= match.versus.x + 1 && match.versus.right <= match.teams[1].x + 1 && Math.abs(match.teams[0].y + match.teams[0].height / 2 - (match.teams[1].y + match.teams[1].height / 2)) < 1), `${label}: two stacked players per team, versus between teams`);
      check(metrics.doubles.every(match => Math.abs(match.teams[0].width - match.teams[1].width) < 1 && Math.abs(match.versus.width - 32) < 1 && Math.abs(match.versus.x + match.versus.width / 2 - (match.card.x + match.card.width / 2)) < 1 && match.teams.every(team => team.players.every(player => Math.abs(player.text.x + player.text.width / 2 - (team.x + team.width / 2)) < 1))), `${label}: actual player text centered in equal teams, fixed versus centered in the card`);
      if (width <= 768) check(metrics.mobileCards.every(card => card.doubles ? card.code.bottom <= card.content.y - 8 : card.code.right <= card.content.x - 8), `${label}: doubles uses full width below court code; other statuses keep their dedicated column`);
      if (width >= 1024) check(metrics.legend.length === 7 && metrics.legend.every(item => Math.abs(item.y - metrics.legend[0].y) < 1), `${label}: all seven legend options share one row`);
      if (width > 768 && width < 1024) check(metrics.legend.slice(0, 4).every(item => item.y === metrics.legend[0].y) && metrics.legend.slice(4).every(item => item.y === metrics.legend[4].y) && metrics.legend[4].y > metrics.legend[0].y, `${label}: tablet legend has balanced rows of four and three`);
      const available = metrics.rows.at(-1).courts;
      check(available.length === 3 && available.every(item => Math.abs(item.y - available[0].y) < 1), `${label}: fully available courts remain compact on one row`);
      await page.screenshot({ path: resolve(output, `${engine}-${width}-dashboard.png`), fullPage: true, animations: 'disabled' });
      await page.locator('.time-row').nth(3).screenshot({ path: resolve(output, `${engine}-${width}-matchups.png`), animations: 'disabled' });
      await page.locator('.court-card.championship').first().click();
      check(await page.locator('[role=dialog]').count() === 0, `${label}: blocked notice does not open booking`);
      await page.locator('.time-row').last().locator('.court-card').first().click();
      await page.getByRole('dialog', { name: 'Reserva de Cancha' }).waitFor();
      check(true, `${label}: available court still opens the existing reservation form`);
      report.views.push({ engine, width, metrics });
      await ctx.close();
    }
    await browser.close(); browser = null;
  }
  check(report.errors.length === 0, 'No JavaScript runtime errors');
  check(report.writes.length === 0, 'No reservation, payment or member writes');
  check(report.unexpected.length === 0, 'No unexpected API or external requests');
  report.status = 'passed';
} catch (error) {
  report.failure = error.stack; report.status = 'failed'; process.exitCode = 1;
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, views: report.views.length, checks: report.checks.length, failure: report.failure }));
}
