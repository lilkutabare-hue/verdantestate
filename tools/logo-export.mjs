#!/usr/bin/env node
// Логотип Verdant Estate для отправки и загрузки куда угодно: node tools/logo-export.mjs → brand/logo/
//   verdant-logo.svg / .png        знак + надпись, тёмно-зелёный #1B462A, без фона
//   verdant-logo-light.svg / .png  то же кремовым #F4F0E6 — для тёмного фона
//   verdant-mark.svg / .png        только знак (кольцо, ветка, VE), зелёный
//   verdant-mark-light.svg / .png  знак кремовым
// Источник — вектор, обведённый по картинке заказчика: brand/vector/logo-v2.svg и mark-v2.svg (fill="currentColor").
// PNG — 2000 точек по длинной стороне, прозрачный фон.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'brand/logo');
mkdirSync(OUT, { recursive: true });
const SRC = { logo: 'brand/vector/logo-v2.svg', mark: 'brand/vector/mark-v2.svg' };
const COLORS = { '': '#1B462A', '-light': '#F4F0E6' };
for (const [name, file] of Object.entries(SRC)) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  if (!src.includes('fill="currentColor"')) throw new Error(file + ': нет fill="currentColor"');
  for (const [suf, color] of Object.entries(COLORS)) {
    const svg = src.replace('fill="currentColor"', `fill="${color}"`);
    const base = join(OUT, `verdant-${name}${suf}`);
    writeFileSync(base + '.svg', svg);
    const [, , w, h] = (svg.match(/viewBox="([^"]+)"/)[1]).split(/\s+/).map(Number);
    const W = w >= h ? 2000 : Math.round(2000 * w / h), H = w >= h ? Math.round(2000 * h / w) : 2000;
    await sharp(Buffer.from(svg), { density: 300 }).resize(W, H).png().toFile(base + '.png');
  }
}
console.log('brand/logo: verdant-logo(-light).svg/.png, verdant-mark(-light).svg/.png');
