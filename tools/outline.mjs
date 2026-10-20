#!/usr/bin/env node
// Силуэт из рендера → короткий SVG-путь (≤ 2 КБ) для «линии Dan Pearson» между секциями.
// Идея: один контур на картинку — горизонт сосен, кромка газона, линия террасы. По каждому столбцу
// ищем один y: либо первый «тёмный» пиксель сверху (горизонт против неба), либо самый сильный
// вертикальный перепад яркости в полосе [a, b] (кромка). Потом медианный фильтр и упрощение Дугласа–Пекера.
//
// node tools/outline.mjs                       — собрать все из SIL ниже → brand/vector/silhouettes.json
// node tools/outline.mjs --preview             — плюс PNG-превью контуров в tools/.cache/outline/
// Мастера читаются из «все рендеры/» (только чтение, ничего не пишем туда).
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'все рендеры');
const OUT = join(ROOT, 'brand/vector/silhouettes.json');
const PREVIEW = process.argv.includes('--preview');

// ключ → файл, способ, полоса поиска (доли высоты), порог «тёмного» для skyline, допуск упрощения (в долях ширины)
const SIL = {
  ba: { file: 'B2.png', mode: 'edge', band: [0.6, 0.92], blur: 1.2, med: 3, eps: 0.004, note: 'линия террасы (до/после)' },
  // P3 (кромка газона) и Z1 (горизонт сосен) колоночным сканом чистого контура не дают (пробовал 21.10: skyline/lawn/edge) —
  // для них пока обычная линия; вернуться с другим источником (план участка) или ручной отрисовкой
};

const W = 480; // столбцов для анализа
async function lum(file, blur = 1.2) {
  const img = sharp(join(SRC, file));
  const { width, height } = await img.metadata();
  const h = Math.round((height / width) * W);
  const buf = await img.resize(W, h, { fit: 'fill' }).greyscale().blur(blur).raw().toBuffer();
  return { w: W, h, px: (x, y) => buf[y * W + x] };
}
function median(arr, r = 3) {
  return arr.map((_, i) => { const s = arr.slice(Math.max(0, i - r), i + r + 1).filter((v) => v != null).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; });
}
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let imax = 0, dmax = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; imax = i; } }
  if (dmax > eps) { const l = dp(pts.slice(0, imax + 1), eps), r = dp(pts.slice(imax), eps); return l.slice(0, -1).concat(r); }
  return [a, b];
}
async function trace(key, o) {
  const im = await lum(o.file, o.blur);
  const y0 = Math.round(o.band[0] * im.h), y1 = Math.round(o.band[1] * im.h);
  const ys = [];
  for (let x = 0; x < im.w; x++) {
    let best = null;
    if (o.mode === 'skyline') { for (let y = y0; y < y1; y++) if (im.px(x, y) < o.dark) { best = y; break; } if (best == null) best = y1; }
    else if (o.mode === 'lawn') { for (let y = y1 - 1; y >= y0; y--) if (im.px(x, y) < o.dark) { best = y; break; } if (best == null) best = y0; }
    else { let g = 0; for (let y = y0 + 2; y < y1 - 2; y++) { const d = Math.abs(im.px(x, y + 2) - im.px(x, y - 2)); if (d > g) { g = d; best = y; } } }
    ys.push(best);
  }
  const sm = median(median(ys, o.med || 4), 2);
  const pts = sm.map((y, x) => [x / im.w, y / im.h]);
  const simp = dp(pts, o.eps);
  // путь в viewBox 1000 × H, где H — размах контура с полями; stroke не масштабируется (vector-effect) — можно тянуть preserveAspectRatio=none
  const yv = simp.map((p) => p[1]); const ymin = Math.min(...yv), ymax = Math.max(...yv); const span = Math.max(0.02, ymax - ymin);
  const H = Math.round(1000 * span * (im.h / im.w));
  const d = simp.map((p, i) => (i ? 'L' : 'M') + (p[0] * 1000).toFixed(0) + ' ' + (((p[1] - ymin) / span) * H).toFixed(0)).join('');
  return { d, h: H, n: simp.length, note: o.note, src: o.file };
}
const out = {};
for (const [k, o] of Object.entries(SIL)) { out[k] = await trace(k, o); console.log(k.padEnd(8), o.file, 'точек', out[k].n, 'байт', out[k].d.length, 'H', out[k].h); }
await writeFile(OUT, JSON.stringify(out, null, 1));
console.log('→', OUT);
if (PREVIEW) {
  const dir = join(ROOT, 'tools/.cache/outline'); await mkdir(dir, { recursive: true });
  for (const [k, v] of Object.entries(out)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${v.h + 40}" viewBox="0 -20 1000 ${v.h + 40}"><rect x="0" y="-20" width="1000" height="${v.h + 40}" fill="#fff"/><path d="${v.d}" fill="none" stroke="#1F4D2E" stroke-width="1.5"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(join(dir, k + '.png'));
  }
  console.log('превью →', dir);
}
