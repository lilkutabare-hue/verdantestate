#!/usr/bin/env node
// Фавикон Verdant Estate из вектора знака: node tools/favicon.mjs → brand/favicon/ и docs/site/
//
// Два вида (13.11.2026, владелец: «fav-icon на светлой теме выглядит очень блекло… давай и чёрную, и белую, чтобы от темы браузера зависело»):
//   favicon.svg          знак без фона, цвет меняется по теме браузера (prefers-color-scheme): тёмно-зелёный на светлой вкладке,
//                        светлый на тёмной. Его понимают Chrome, Edge, Firefox и Safari с версии 26; подключается ссылкой в HEAD (src/head.html)
//   favicon.ico          16 + 32 + 48: светлый знак на тёмно-зелёной плашке — виден на любой теме. Запасной для браузеров без SVG-иконок
//                        и для поиска (в выдаче фон белый). Его грузить в Тильду: «Настройки сайта → Главное → Favicon»
//   favicon-512.png      тот же знак на плашке, 512×512 (логотип организации в JSON-LD, запас для Тильды)
//   favicon-32.png       на плашке, 32×32 — запасная ссылка в HEAD
//   apple-touch-icon.png 180×180, плашка без скругления (iOS скругляет сам) — «на экран Домой»
//   preview.png          как оба вида выглядят на светлой и тёмной вкладке
//
// Прежний вид (бронза без фона, 22.10) на светлой вкладке читался бледно. Мелкие размеры утолщены оптически; на 16 — только кольцо и VE.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'brand/favicon');
mkdirSync(OUT, { recursive: true });
const LP = JSON.parse(readFileSync(join(ROOT, 'brand/vector/logo-v2-parts.json'), 'utf8'));
const GREEN = '#1B462A', CREAM = '#FBFAF6';
const VB_B = '205 100 800 800'; // плашка: знак занимает 76 % стороны
const VB = '285 180 640 640'; // квадрат вокруг знака (знак 610×560)

// знак под целевой размер: обводка того же цвета утолщает тонкие линии, кольцу — больше
function mark(sz, color) {
  const k = 610 / sz, simple = sz <= 16;
  const w = k * (simple ? 0.55 : 0.4), wr = k * (simple ? 0.9 : 0.7);
  const parts = simple ? [LP.ring, LP.letters] : [LP.ring, LP.branch, LP.letters];
  return parts.map((d, i) => `<path d="${d}" fill="${color}" stroke="${color}" stroke-linejoin="round" stroke-width="${(i === 0 ? wr : w).toFixed(1)}"/>`).join('');
}
const svg = (sz, color, bg = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="${sz}" height="${sz}">${bg}${mark(sz, color)}</svg>`;
// знак на плашке: виден на светлой и на тёмной вкладке; round — доля скругления (0 для apple-touch-icon)
const badge = (sz, round = 0.22) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB_B}" width="${sz}" height="${sz}"><rect x="205" y="100" width="800" height="800" rx="${(800 * round).toFixed(0)}" fill="${GREEN}"/>${mark(sz * 0.76, CREAM)}</svg>`;
// знак без фона, цвет по теме браузера
const adaptive = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><style>path{fill:${GREEN};stroke:${GREEN}}@media (prefers-color-scheme:dark){path{fill:${CREAM};stroke:${CREAM}}}</style>${mark(32, GREEN).replace(/ fill="#[0-9A-F]+" stroke="#[0-9A-F]+"/gi, '')}</svg>`;
const png = (s) => sharp(Buffer.from(s)).png().toBuffer();

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

const SITE = join(ROOT, 'docs/site');
const frames = [];
for (const sz of [16, 32, 48]) frames.push({ sz, buf: await png(badge(sz)) });
const icoBuf = ico(frames), b512 = await png(badge(512)), svgA = adaptive();
writeFileSync(join(OUT, 'favicon.ico'), icoBuf); writeFileSync(join(SITE, 'favicon.ico'), icoBuf);
writeFileSync(join(OUT, 'favicon.png'), frames[1].buf); writeFileSync(join(SITE, 'favicon-32.png'), frames[1].buf);
writeFileSync(join(OUT, 'favicon-512.png'), b512); writeFileSync(join(SITE, 'favicon-512.png'), b512);
writeFileSync(join(OUT, 'favicon.svg'), svgA); writeFileSync(join(SITE, 'favicon.svg'), svgA);
writeFileSync(join(OUT, 'apple-touch-icon.png'), await png(badge(180, 0)));

// лист проверки: светлая вкладка, серая вкладка, тёмная (Chrome), тёмная (Safari). Верхние три ряда — знак по теме (16/32/48),
// нижние три — плашка. В каждой плитке слева ×6, справа в натуральную величину
const bgs = ['#FFFFFF', '#DEE1E6', '#35363A', '#1C1C1E'];
const tiles = []; let x = 16;
for (const [bi, bg] of bgs.entries()) {
  let y = 16;
  const rows = [];
  for (const sz of [16, 32, 48]) rows.push({ sz, buf: await png(svg(sz, bi < 2 ? GREEN : CREAM)) });
  for (const f of frames) rows.push(f);
  for (const { sz, buf } of rows) {
    const big = await sharp(buf).resize(sz * 6, sz * 6, { kernel: 'nearest' }).png().toBuffer();
    tiles.push({ input: { create: { width: 48 * 6 + 24, height: sz * 6 + 24, channels: 4, background: bg } }, left: x, top: y });
    tiles.push({ input: big, left: x + 12, top: y + 12 });
    tiles.push({ input: buf, left: x + 48 * 6 - sz, top: y + 12 });
    y += sz * 6 + 36;
  }
  x += 48 * 6 + 40;
}
await sharp({ create: { width: x, height: 16 + (16 + 32 + 48) * 6 * 2 + 36 * 6 + 16, channels: 4, background: '#F2EFE6' } }).composite(tiles).png().toFile(join(OUT, 'preview.png'));
console.log('brand/favicon и docs/site: favicon.svg (по теме браузера), favicon.ico (16/32/48, плашка), favicon-32.png, favicon-512.png; brand/favicon: apple-touch-icon.png, preview.png');
