#!/usr/bin/env node
// Картинка превью для мессенджеров и соцсетей: node tools/og-image.mjs → docs/site/og-1200x630.jpg
// Фото — постер хиро (дом и сад в сосновом лесу), мягкое затемнение к центру, полный логотип (знак + надпись, светлый, brand/logo/verdant-logo-light.svg)
// по центру с тенью: WhatsApp и часть мессенджеров обрезают превью до квадрата посередине — логотип целиком в центральном квадрате 630×630.
// Владелец 08.11: «на картинке превью соц сетей надо чтоб лого тоже пиздато было показано».
import sharp from 'sharp';
import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200, H = 630, LOGO_H = Math.round(H * 0.64);
const photo = await sharp(join(ROOT, 'docs/site/media/scene/poster-wide.webp')).resize(W, H, { fit: 'cover', position: 'centre' }).modulate({ saturation: 0.92 }).toBuffer();
// затемнение: к центру плотнее (под логотипом), края — фото почти как есть
const shade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
<radialGradient id="r" cx="50%" cy="50%" r="62%"><stop offset="0" stop-color="#0E1A12" stop-opacity=".72"/><stop offset=".55" stop-color="#0E1A12" stop-opacity=".52"/><stop offset="1" stop-color="#0E1A12" stop-opacity=".22"/></radialGradient>
<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1A12" stop-opacity=".18"/><stop offset=".6" stop-color="#0E1A12" stop-opacity="0"/><stop offset="1" stop-color="#0E1A12" stop-opacity=".28"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#r)"/><rect width="100%" height="100%" fill="url(#v)"/></svg>`);
const logoSvg = readFileSync(join(ROOT, 'brand/logo/verdant-logo-light.svg'));
const logo = await sharp(logoSvg, { density: 600 }).resize({ height: LOGO_H }).png().toBuffer();
const lm = await sharp(logo).metadata();
// тень: альфа логотипа, тёмная, размытая
const shadow = await sharp(logo).ensureAlpha().extractChannel(3).toColourspace('b-w').toBuffer()
  .then((a) => sharp({ create: { width: lm.width, height: lm.height, channels: 3, background: '#06100A' } }).joinChannel(a).png().toBuffer())
  .then((b) => sharp(b).extend({ top: 30, bottom: 30, left: 30, right: 30, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(14).linear(0.55, 0).png().toBuffer());
const x = Math.round((W - lm.width) / 2), y = Math.round((H - lm.height) / 2);
const out = join(ROOT, 'docs/site/og-1200x630.jpg');
await sharp(photo).composite([{ input: shade }, { input: shadow, left: x - 30, top: y - 30 + 4 }, { input: logo, left: x, top: y }]).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
console.log(`og-1200x630.jpg: ${W}×${H}, логотип ${lm.width}×${lm.height}, ${Math.round(statSync(out).size / 1024)} КБ`);
