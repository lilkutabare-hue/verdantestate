// Трассировка логотипа brand/logo-ve.jpg → brand/vector/{logo-full.svg, mark.svg}
import sharp from 'sharp';
import potrace from 'potrace';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'brand/logo-ve.jpg');
const OUT = resolve(ROOT, 'brand/vector');
await mkdir(OUT, { recursive: true });

function trace(buf, opts) {
  return new Promise((res, rej) => potrace.trace(buf, { threshold: 150, turdSize: 6, optTolerance: 0.4, color: '#2F3B24', background: 'transparent', ...opts }, (e, svg) => e ? rej(e) : res(svg)));
}
const meta = await sharp(SRC).metadata();
console.log('src', meta.width, meta.height);
// полный логотип
const full = await sharp(SRC).greyscale().normalise().png().toBuffer();
let svgFull = await trace(full);
await writeFile(resolve(OUT, 'logo-full.svg'), svgFull);
// монограмма: круг + ветвь + VE (область по картинке 1254²: x 300..930, y 210..790)
const mark = await sharp(SRC).extract({ left: 300, top: 210, width: 640, height: 590 }).greyscale().normalise().png().toBuffer();
let svgMark = await trace(mark);
await writeFile(resolve(OUT, 'mark.svg'), svgMark);
console.log('full', svgFull.length, 'mark', svgMark.length);
