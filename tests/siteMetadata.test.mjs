import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'parse5';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const document = parse(html);
const descendants = node => [node, ...(node.childNodes || []).flatMap(descendants)];
const nodes = descendants(document);
const attr = (node, name) => node.attrs?.find(attribute => attribute.name === name)?.value;
const head = nodes.find(node => node.tagName === 'head');
const headNodes = descendants(head);
const metas = headNodes.filter(node => node.tagName === 'meta');
const property = name => metas.filter(node => attr(node, 'property') === name);
const content = name => attr(property(name)[0], 'content');
const title = 'Club de Tenis Quintero';
const description = 'Reservas de canchas, ranking y mensualidades del Club de Tenis Quintero.';
const expected = {
    'og:title': title, 'og:description': description, 'og:type': 'website', 'og:site_name': title,
    'og:locale': 'es_CL', 'og:url': 'https://ctq.serviciosasm.cl/',
    'og:image': 'https://ctq.serviciosasm.cl/images/ctq-compartir-v1.png',
    'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630',
    'og:image:alt': 'Logo del Club de Tenis Quintero',
};
const publicFile = file => new URL(`public/${file}`, root);
const pngSize = bytes => {
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('initial HTML identifies CTQ in Spanish before React or authentication', () => {
    assert.equal(attr(nodes.find(node => node.tagName === 'html'), 'lang'), 'es-CL');
    const titles = headNodes.filter(node => node.tagName === 'title');
    assert.equal(titles.length, 1);
    assert.equal(titles[0].childNodes[0].value, title);
    const descriptions = metas.filter(node => attr(node, 'name') === 'description');
    assert.equal(descriptions.length, 1);
    assert.equal(attr(descriptions[0], 'content'), description);
});

test('Open Graph has one complete institutional value per field in the original head', () => {
    for (const [name, value] of Object.entries(expected)) {
        assert.equal(property(name).length, 1, name);
        assert.equal(content(name), value, name);
    }
    assert.equal(nodes.filter(node => node.tagName === 'meta' && attr(node, 'property')?.startsWith('og:')).length,
        Object.keys(expected).length);
});

test('shared URLs use the public HTTPS origin without private path, query, credentials or fragment', () => {
    for (const name of ['og:url', 'og:image']) {
        const url = new URL(content(name));
        assert.equal(url.origin, 'https://ctq.serviciosasm.cl');
        assert.equal(url.username + url.password + url.search + url.hash, '');
        assert.doesNotMatch(url.pathname, /monthlypayments|payment\/|profile|admin|login/);
    }
});

test('icon alternatives form one CTQ family, with correct formats and no competing legacy links', () => {
    const icons = headNodes.filter(node => node.tagName === 'link' && attr(node, 'rel') === 'icon');
    assert.deepEqual(icons.map(node => [attr(node, 'href'), attr(node, 'type'), attr(node, 'sizes')]), [
        ['/ctq-favicon-v1.ico', 'image/x-icon', '16x16 32x32 48x48'],
        ['/ctq-favicon-v1-32.png', 'image/png', '32x32'],
    ]);
    const touch = headNodes.filter(node => node.tagName === 'link' && attr(node, 'rel') === 'apple-touch-icon');
    assert.equal(touch.length, 1);
    assert.equal(attr(touch[0], 'href'), '/ctq-apple-touch-v1.png');
    assert.equal(attr(touch[0], 'sizes'), '180x180');
    assert(!headNodes.some(node => ['/icon.svg', '/tennis_ball_fill_icon.svg', '/icon.png'].includes(attr(node, 'href'))));
});

for (const [file, size] of [
    ['ctq-favicon-v1-32.png', [32, 32]], ['ctq-apple-touch-v1.png', [180, 180]],
    ['images/ctq-compartir-v1.png', [1200, 630]],
]) test(`${file} is an actual PNG with the declared dimensions`, async () => {
    assert.deepEqual(pngSize(await readFile(publicFile(file))), size);
});

test('ICO contains all three correctly bounded PNG frames, identical to the standalone 32px asset', async () => {
    const bytes = await readFile(publicFile('ctq-favicon-v1.ico'));
    assert.equal(bytes.readUInt16LE(0), 0);
    assert.equal(bytes.readUInt16LE(2), 1);
    assert.equal(bytes.readUInt16LE(4), 3);
    let next = 54;
    for (const [index, size] of [16, 32, 48].entries()) {
        const entry = 6 + index * 16;
        assert.equal(bytes[entry], size); assert.equal(bytes[entry + 1], size);
        assert.equal(bytes.readUInt16LE(entry + 4), 1);
        assert.equal(bytes.readUInt16LE(entry + 6), 32);
        const length = bytes.readUInt32LE(entry + 8), offset = bytes.readUInt32LE(entry + 12);
        assert.equal(offset, next); assert(offset + length <= bytes.length);
        const frame = bytes.subarray(offset, offset + length);
        assert.deepEqual(pngSize(frame), [size, size]);
        if (size === 32) assert.deepEqual(frame, await readFile(publicFile('ctq-favicon-v1-32.png')));
        next += length;
    }
    assert.equal(next, bytes.length);
});

test('asset provenance hashes match outputs and unchanged official source images', async () => {
    const evidence = JSON.parse(await readFile(new URL('docs/evidence/site-identity/assets.json', root), 'utf8'));
    for (const [file, metadata] of Object.entries(evidence.outputs))
        assert.equal(hash(await readFile(publicFile(file))), metadata.sha256, file);
    for (const [file, value] of Object.entries(evidence.sources))
        assert.equal(hash(await readFile(publicFile(file))), value, file);
    assert.equal(hash(await readFile(publicFile('images/new_logo_ctq.png'))),
        '9338cbe3ddef0fddc6f441d73047956dccd719a8a71cfa5616b6081238577c6d');
    assert.equal(hash(await readFile(publicFile('images/logo_circ_ctq.jpeg'))),
        '50010ec380a62635556e70d2884ce5c6929ba9f08bfbc24cc37d95fa91b3d73b');
    assert.equal(hash(await readFile(publicFile('icon.png'))),
        '66ce678ece554cdfd43cb618a0faa73207c73b646947c597f2bb3eeb63e1a857');
});

test('each image/icon reference resolves to a real public asset, independent of SPA routing', async () => {
    const paths = [new URL(content('og:image')).pathname,
        ...headNodes.filter(node => node.tagName === 'link' && ['icon', 'apple-touch-icon'].includes(attr(node, 'rel')))
            .map(node => attr(node, 'href'))];
    for (const path of paths) {
        assert(!path.includes('..'));
        const bytes = await readFile(publicFile(path.slice(1)));
        assert(bytes.length > 0, fileURLToPath(publicFile(path.slice(1))));
        assert.notEqual(bytes.subarray(0, 15).toString(), '<!doctype html>');
    }
});
