import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = process.argv[2];
if (!modulePath) throw new Error('Usage: node scripts/build-site-identity.mjs /path/to/sharp/lib/index.js');
const { default: sharp } = await import(pathToFileURL(resolve(modulePath)).href);
const publicDir = resolve(root, 'public');
const source = resolve(publicDir, 'images/logo_circ_ctq.jpeg');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const emblemCrop = { left: 132, top: 132, width: 304, height: 304 };
const emblemMask = { centre: 152, radius: 148 };
const background = '#f8f8f6';
const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304"><circle cx="152" cy="152" r="148" fill="white"/></svg>');
const emblem = await sharp(source).extract(emblemCrop).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

async function icon(size) {
    const padding = size === 16 ? 1 : Math.round(size / 16);
    return sharp(emblem)
        .resize(size - padding * 2, size - padding * 2, { fit: 'contain', background })
        .flatten({ background })
        .extend({ top: padding, bottom: padding, left: padding, right: padding, background })
        .png({ compressionLevel: 9 }).toBuffer();
}

const frames = [];
for (const size of [16, 32, 48]) frames.push({ size, bytes: await icon(size) });
// ICO directory entries point to PNG frames, preserving the same emblem at every size.
const directory = Buffer.alloc(6 + frames.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(frames.length, 4);
let offset = directory.length;
frames.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    directory[entry] = size;
    directory[entry + 1] = size;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(bytes.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += bytes.length;
});

const outputs = new Map([
    ['ctq-favicon-v1.ico', Buffer.concat([directory, ...frames.map(frame => frame.bytes)])],
    ['ctq-favicon-v1-32.png', frames[1].bytes],
    ['ctq-apple-touch-v1.png', await icon(180)],
    ['images/ctq-compartir-v1.png', await sharp(resolve(publicDir, 'images/new_logo_ctq.png'))
        .resize(1200, 630, { fit: 'cover', position: 'centre' }).png({ compressionLevel: 9 }).toBuffer()],
]);
const report = {
    method: 'Deterministic crop/resize of existing CTQ identity; no generated or redrawn logo',
    tool: { sharp: sharp.versions.sharp, vips: sharp.versions.vips },
    sources: {
        'images/logo_circ_ctq.jpeg': hash(await readFile(source)),
        'images/new_logo_ctq.png': hash(await readFile(resolve(publicDir, 'images/new_logo_ctq.png'))),
    },
    emblemCrop, emblemMask, background, icoSizes: frames.map(frame => frame.size), outputs: {},
};
for (const [file, bytes] of outputs) {
    await writeFile(resolve(publicDir, file), bytes);
    const metadata = file.endsWith('.ico') ? { format: 'ico', sizes: [16, 32, 48] }
        : await sharp(bytes).metadata().then(({ format, width, height, hasAlpha }) => ({ format, width, height, hasAlpha }));
    report.outputs[file] = { ...metadata, bytes: bytes.length, sha256: hash(bytes) };
}
const evidence = resolve(root, 'docs/evidence/site-identity');
await mkdir(evidence, { recursive: true });
await writeFile(resolve(evidence, 'assets.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.outputs, null, 2));
