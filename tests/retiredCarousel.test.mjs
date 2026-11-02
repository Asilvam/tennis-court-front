import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

test('retired image administration is neither imported nor routed in the app', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /ImageUploadForm|path=["']\/items["']/);
  assert.match(app, /path="\*"[\s\S]*?<NotFound/);
});

test('retired component and its private stylesheet are removed', async () => {
  for (const file of ['src/components/ImageUploadForm.tsx', 'src/styles/ImageUploadForm.css'])
    await assert.rejects(access(new URL('../' + file, import.meta.url)), { code: 'ENOENT' });
});

test('home retains both static club images without consuming the retired API', async () => {
  const home = await readFile(new URL('../src/components/Home.tsx', import.meta.url), 'utf8');
  for (const asset of ['/images/new_logo_ctq.png', '/images/logo_circ_ctq.jpeg']) {
    assert.ok(home.includes(asset));
    await access(new URL('../public' + asset, import.meta.url));
  }
  assert.doesNotMatch(home, /info-items|ImageUploadForm/);
});
