#!/usr/bin/env node
// PNG из tools/.cache/stills/ (их кладёт tools/stills.html через стенд) → webp в docs/site/media/stills/ и кадры сцены в media/scene/.
// Имена: <name>-l.webp / <name>-s.webp для секций; scene-wide-NN → wide-NN.webp, scene-tall-NN → tall-NN.webp, постеры из кадра 00.
// «Сад к празднику» (4.12): media-src/hw-dark|hw-lit|ny-dark|ny-lit.png → holiday-<name>-l/-s.webp; флаг --holiday — только их.
// Стиллы карточек с лупами потом перебивает tools/loop-stills.mjs (первый кадр лупа) — его запускать после этого скрипта.
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'tools/.cache/stills'), STILLS = join(ROOT, 'docs/site/media/stills'), SCENE = join(ROOT, 'docs/site/media/scene');
await mkdir(STILLS, { recursive: true }); await mkdir(SCENE, { recursive: true });
const HOLIDAY_ONLY = process.argv.includes('--holiday');
const files = HOLIDAY_ONLY || !existsSync(SRC) ? [] : (await readdir(SRC)).filter((f) => f.endsWith('.png')).sort();
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
  // мастера 2K: большой вариант ужимаем до 1440 по длинной стороне, иначе карточка весит мегабайт
  const l = await sharp(src).resize(wide ? { width: 1440, withoutEnlargement: true } : { height: 1440, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer();
  const s = await sharp(src).resize({ width: wide ? 720 : 560 }).webp({ quality: 74, effort: 5 }).toBuffer();
  await writeFile(join(STILLS, `${name}-l.webp`), l); await writeFile(join(STILLS, `${name}-s.webp`), s); total += l.length + s.length;
  console.log(name, (l.length / 1024).toFixed(0), '+', (s.length / 1024).toFixed(0), 'KB');
}
// «Сад к празднику»: вертикальные карточки 4:5, те же размеры, что у тарифов
const MS = join(ROOT, 'media-src');
for (const n of ['hw-dark', 'hw-lit', 'ny-dark', 'ny-lit']) {
  const src = join(MS, `${n}.png`); if (!existsSync(src)) continue;
  const l = await sharp(src).resize({ height: 1440, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer();
  const s = await sharp(src).resize({ width: 560 }).webp({ quality: 74, effort: 5 }).toBuffer();
  await writeFile(join(STILLS, `holiday-${n}-l.webp`), l); await writeFile(join(STILLS, `holiday-${n}-s.webp`), s); total += l.length + s.length;
  console.log(`holiday-${n}`, (l.length / 1024).toFixed(0), '+', (s.length / 1024).toFixed(0), 'KB');
}
console.log(`всего ${files.length} файлов, ${(total / 1024).toFixed(0)} KB`);
