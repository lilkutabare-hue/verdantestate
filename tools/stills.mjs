#!/usr/bin/env node
// PNG из tools/.cache/stills/ (их кладёт tools/stills.html через стенд) → webp в docs/site/media/stills/ и кадры сцены в media/scene/.
// Имена: <name>-l.webp / <name>-s.webp для секций; scene-wide-NN → wide-NN.webp, scene-tall-NN → tall-NN.webp, постеры из кадра 00.
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'tools/.cache/stills'), STILLS = join(ROOT, 'docs/site/media/stills'), SCENE = join(ROOT, 'docs/site/media/scene');
await mkdir(STILLS, { recursive: true }); await mkdir(SCENE, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.endsWith('.png')).sort();
let total = 0;
for (const f of files) {
  const name = f.slice(0, -4), src = join(SRC, f);
  if (name.startsWith('scene-')) {
    const m = name.match(/^scene-(wide|tall)-(\d\d)$/); if (!m) continue;
    const out = join(SCENE, `${m[1]}-${m[2]}.webp`);
    const buf = await sharp(src).webp({ quality: 80, effort: 5 }).toBuffer(); await writeFile(out, buf); total += buf.length;
    if (m[2] === '00') { const pw = m[1] === 'wide' ? 960 : 540; const pb = await sharp(src).resize({ width: pw }).webp({ quality: 72 }).toBuffer(); await writeFile(join(SCENE, `poster-${m[1]}.webp`), pb); total += pb.length; }
    console.log(name, (buf.length / 1024).toFixed(0), 'KB');
    continue;
  }
  const meta = await sharp(src).metadata();
  const wide = meta.width > meta.height;
  const l = await sharp(src).webp({ quality: 80, effort: 5 }).toBuffer();
  const s = await sharp(src).resize({ width: wide ? 720 : 560 }).webp({ quality: 76, effort: 5 }).toBuffer();
  await writeFile(join(STILLS, `${name}-l.webp`), l); await writeFile(join(STILLS, `${name}-s.webp`), s); total += l.length + s.length;
  console.log(name, (l.length / 1024).toFixed(0), '+', (s.length / 1024).toFixed(0), 'KB');
}
console.log(`всего ${files.length} файлов, ${(total / 1024).toFixed(0)} KB`);
