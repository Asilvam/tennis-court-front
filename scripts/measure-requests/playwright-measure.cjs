#!/usr/bin/env node
// Playwright script para medir requests XHR/fetch por endpoint (CommonJS)
// Uso:
// 1) Instalar dependencias: npm install --save-dev playwright
// 2) Instalar navegadores: npx playwright install chromium
// 3) Ejecutar: node scripts/measure-requests/playwright-measure.cjs --appUrl=http://localhost:5173 --output=measure.json

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    const [k, v] = a.split('=');
    if (k.startsWith('--')) out[k.slice(2)] = v || true;
  });
  return out;
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    return url.pathname + (url.search || '');
  } catch (e) {
    return u;
  }
}

(async () => {
  const args = parseArgs();
  const APP_URL = args.appUrl || 'http://localhost:5173';
  const OUTPUT = args.output || 'measure-requests.json';
  const ITERATIONS = parseInt(args.iterations || '1', 10);
  const CAPTURE_BODIES = !!args.captureBodies;
  const AUTH_CREDENTIALS = args.auth || null; // format username:password
  const AUTH_URL = args.authUrl || null; // full auth endpoint
  const AUTH_TOKEN_KEY = args.authTokenKey || 'token';
  const AUTH_USER_KEY = args.authUserKey || 'userInfo';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // If auth provided, perform auth via API and seed localStorage for pages
  if (AUTH_CREDENTIALS && AUTH_URL) {
    const [username, password] = AUTH_CREDENTIALS.split(':');
    try {
      console.log('Performing auth request to', AUTH_URL);
      const authResp = await context.request.post(AUTH_URL, { data: { username, password } });
      const authJson = await authResp.json().catch(() => null);
      if (authJson && authJson[AUTH_TOKEN_KEY]) {
        const token = authJson[AUTH_TOKEN_KEY];
        const userObj = authJson[AUTH_USER_KEY] || authJson.user || null;
        // Seed localStorage for future pages
        await context.addInitScript(({ tokenKey, tokenVal, userKey, userVal }) => {
          try {
            localStorage.setItem(tokenKey, tokenVal);
            if (userVal) localStorage.setItem(userKey, userVal);
          } catch (e) {}
        }, { tokenKey: 'token', tokenVal: token, userKey: AUTH_USER_KEY, userVal: userObj ? JSON.stringify(userObj) : null });
        console.log('Auth token set in context localStorage via init script');
      } else {
        console.warn('Auth response did not include token at key', AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Auth request failed:', e.message || e);
    }
  }

  const page = await context.newPage();

  // Collector
  const requests = [];

  // Capture request and response info for XHR/fetch
  page.on('request', request => {
    try {
      const r = {
        id: request._guid || request.url(),
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
        postData: CAPTURE_BODIES ? request.postData() : undefined,
      };
      // Only track fetch/xhr or JSON endpoints (resourceType might be 'xhr' or 'fetch')
      if (r.resourceType === 'xhr' || r.resourceType === 'fetch' || r.url.includes('/api') || r.url.includes('/auth') || r.url.includes('/court-reserve')) {
        requests.push({ request: r, response: null });
      }
    } catch (e) {
      // ignore
    }
  });

  page.on('requestfinished', async request => {
    try {
      const resp = request.response();
      const entry = requests.find(r => r.request.url === request.url() && r.request.method === request.method());
      const info = {
        status: resp ? resp.status() : null,
        headers: resp ? resp.headers() : null,
        body: null,
      };
      if (CAPTURE_BODIES && resp) {
        try {
          info.body = await resp.text();
        } catch (e) {
          info.body = null;
        }
      }
      if (entry) entry.response = info;
      else requests.push({ request: { url: request.url(), method: request.method(), resourceType: request.resourceType(), timestamp: Date.now() }, response: info });
    } catch (e) {}
  });

  page.on('requestfailed', request => {
    try {
      const entry = requests.find(r => r.request.url === request.url() && r.request.method === request.method());
      const info = { status: null, errorText: request.failure ? request.failure() : null };
      if (entry) entry.response = info;
      else requests.push({ request: { url: request.url(), method: request.method(), resourceType: request.resourceType(), timestamp: Date.now() }, response: info });
    } catch (e) {}
  });

  // Perform interactive flows
  for (let iter = 0; iter < ITERATIONS; iter++) {
    console.log(`Iteration ${iter + 1}/${ITERATIONS} — visiting ${APP_URL}`);
    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.warn('Initial navigation failed:', e.message || e);
    }

    // small wait to allow background requests
    await page.waitForTimeout(1500);

    // If dashboard date nav exists, try to click it 3 times
    try {
      const navButtons = await page.$$('.nav-btn');
      if (navButtons && navButtons.length > 0) {
        for (let i = 0; i < 3; i++) {
          await navButtons[navButtons.length - 1].click().catch(() => {});
          await page.waitForTimeout(800);
        }
      } else {
        // try changing any date input if present
        const dateInput = await page.$('input[type="date"]');
        if (dateInput) {
          await dateInput.evaluate((el) => {
            try {
              const d = new Date(); d.setDate(d.getDate() + 1);
              el.value = d.toISOString().slice(0, 10);
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {}
          });
          await page.waitForTimeout(800);
        }
      }
    } catch (e) {
      // ignore
    }

    // Try to open first profile link (common patterns)
    try {
      const profileLink = await page.$('a[href*=profile], a[href*=perfil], a[data-test*=profile]');
      if (profileLink) {
        await profileLink.click().catch(() => {});
        await page.waitForTimeout(1200);
      }
    } catch (e) {}

    // Try to open a court card to trigger modal/reservation flow
    try {
      const courtCard = await page.$('.court-card.available, .court-card');
      if (courtCard) {
        await courtCard.click().catch(() => {});
        await page.waitForTimeout(1200);
        // Avoid clicking confirm/pay buttons that may create reservations
        // We will not submit forms to keep this measurement read-only
      }
    } catch (e) {}

    // Small pause between iterations
    await page.waitForTimeout(800);
  }

  // Aggregate results: group by pathname (remove host)
  const summary = {};
  for (const entry of requests) {
    const url = entry.request.url;
    const normalized = normalizeUrl(url);
    const key = `${entry.request.method} ${normalized}`;
    if (!summary[key]) summary[key] = { count: 0, methods: {}, statuses: {} };
    summary[key].count += 1;
    summary[key].methods[entry.request.method] = (summary[key].methods[entry.request.method] || 0) + 1;
    const status = entry.response && entry.response.status ? String(entry.response.status) : 'unknown';
    summary[key].statuses[status] = (summary[key].statuses[status] || 0) + 1;
  }

  const result = {
    collectedAt: new Date().toISOString(),
    appUrl: APP_URL,
    iterations: ITERATIONS,
    totalRequests: requests.length,
    summary,
    raw: requests,
  };

  const outPath = path.resolve(process.cwd(), OUTPUT);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('Done. Results written to', outPath);

  await browser.close();
})();
