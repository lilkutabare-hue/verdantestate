#!/usr/bin/env node
// Фавикон Verdant Estate из вектора знака: node tools/favicon.mjs → brand/favicon/
//
//   favicon.ico          16 + 32 + 48 в одном файле — его загружать в Тильду:
//                        «Настройки сайта → SEO → Редактирование иконок (Favicons) → Загрузить файл», потом переопубликовать страницы
//   favicon.png          32×32 — если Тильда попросит PNG (имя без цифр — требование Тильды)
//   favicon.svg          для превью (docs/site/favicon.svg)
//   apple-touch-icon.png 180×180 на белом — «на экран Домой» (iOS прозрачность заливает чёрным)
//   preview.png          как значок выглядит на светлой и тёмной вкладке
//
// Без фона, цвет — бронза сайта #A8874F: тёмно-зелёный знак на тёмной вкладке (iPhone и Chrome в тёмной теме) не виден,
// бронза читается на обеих. Мелкие размеры утолщены оптически; на 16 — только кольцо и VE (ветка в 16 точек — каша).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'brand/favicon');
mkdirSync(OUT, { recursive: true });
const LP = JSON.parse(readFileSync(join(ROOT, 'brand/vector/logo-v2-parts.json'), 'utf8'));
const BRONZE = '#A8874F', GREEN = '#1B462A';
const VB = '285 180 640 640'; // квадрат вокруг знака (знак 610×560)

// знак под целевой размер: обводка того же цвета утолщает тонкие линии, кольцу — больше
function mark(sz, color) {
  const k = 610 / sz, simple = sz <= 16;
  const w = k * (simple ? 0.55 : 0.4), wr = k * (simple ? 0.9 : 0.7);
  const parts = simple ? [LP.ring, LP.letters] : [LP.ring, LP.branch, LP.letters];
  return parts.map((d, i) => `<path d="${d}" fill="${color}" stroke="${color}" stroke-linejoin="round" stroke-width="${(i === 0 ? wr : w).toFixed(1)}"/>`).join('');
}
const svg = (sz, color = BRONZE, bg = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="${sz}" height="${sz}">${bg}${mark(sz, color)}</svg>`;
const png = (sz, color, bg) => sharp(Buffer.from(svg(sz, color, bg))).png().toBuffer();

// ICO из PNG-кадров (так умеют все браузеры с Vista/IE9)
function ico(frames) {
  const head = Buffer.alloc(6 + 16 * frames.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(frames.length, 4);
  let off = head.length;
  frames.forEach(({ sz, buf }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(sz >= 256 ? 0 : sz, e); head.writeUInt8(sz >= 256 ? 0 : sz, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12); off += buf.length;
  });
  return Buffer.concat([head, ...frames.map((f) => f.buf)]);
}

const frames = [];
for (const sz of [16, 32, 48]) frames.push({ sz, buf: await png(sz, BRONZE) });
writeFileSync(join(OUT, 'favicon.ico'), ico(frames));
writeFileSync(join(OUT, 'favicon.png'), frames[1].buf);
writeFileSync(join(OUT, 'favicon.svg'), svg(32).replace(/ width="32" height="32"/, ''));
writeFileSync(join(ROOT, 'docs/site/favicon.svg'), svg(32).replace(/ width="32" height="32"/, ''));
// «на экран Домой»: зелёный знак на белом, с полем — как у build.mjs, но крупнее
const touch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="240 135 730 730" width="180" height="180"><rect x="240" y="135" width="730" height="730" fill="#FFFFFF"/><g fill="${GREEN}"><path d="${LP.ring}"/><path d="${LP.branch}"/><path d="${LP.letters}"/></g></svg>`;
writeFileSync(join(OUT, 'apple-touch-icon.png'), await sharp(Buffer.from(touch)).png().toBuffer());

// лист проверки: светлая вкладка, серая вкладка, тёмная (Chrome), тёмная (Safari); 16/32/48 в натуральную величину и ×6
const bgs = ['#FFFFFF', '#DEE1E6', '#35363A', '#1C1C1E'];
const tiles = []; let x = 16;
for (const bg of bgs) {
  let y = 16;
  for (const { sz, buf } of frames) {
    const big = await sharp(buf).resize(sz * 6, sz * 6, { kernel: 'nearest' }).png().toBuffer();
    tiles.push({ input: { create: { width: 48 * 6 + 24, height: sz * 6 + 24, channels: 4, background: bg } }, left: x, top: y });
    tiles.push({ input: big, left: x + 12, top: y + 12 });
    tiles.push({ input: buf, left: x + 48 * 6 - sz, top: y + 12 });
    y += sz * 6 + 36;
  }
  x += 48 * 6 + 40;
}
await sharp({ create: { width: x, height: 16 + (16 + 32 + 48) * 6 + 36 * 3 + 16, channels: 4, background: '#F2EFE6' } }).composite(tiles).png().toFile(join(OUT, 'preview.png'));
console.log('brand/favicon: favicon.ico (16/32/48), favicon.png, favicon.svg, apple-touch-icon.png, preview.png; docs/site/favicon.svg');
