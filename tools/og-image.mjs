#!/usr/bin/env node
// Картинка превью для мессенджеров и соцсетей: node tools/og-image.mjs → docs/site/og-1200x630.jpg
// Фото — постер хиро (дом и сад в сосновом лесу), мягкое затемнение к центру, полный логотип (знак + надпись, светлый, brand/logo/verdant-logo-light.svg)
// по центру с тенью: WhatsApp и часть мессенджеров обрезают превью до квадрата посередине — логотип целиком в центральном квадрате 630×630.
// Владелец 08.11: «на картинке превью соц сетей надо чтоб лого тоже пиздато было показано»; «давай по русски под лого».
// Подпись под логотипом по-русски — «УХОД ЗА ЧАСТНЫМИ САДАМИ» (бриф: «уход за частными садами»): тот же Montserrat 400, та же высота и ширина,
// что у английской строки в tools/logo.mjs (x 295…969, заглавная 21); разбивка выходит +7,3 против +5,9 у оригинала — длинные фразы уходили в минус.
// Заодно пишет brand/logo/verdant-logo-ru.svg (зелёный) и verdant-logo-ru-light.svg (светлый). Другая подпись: node tools/og-image.mjs --tag='…'
import sharp from 'sharp';
import opentype from 'opentype.js';
import { writeFileSync } from 'node:fs';
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
// логотип из частей tools/logo.mjs (brand/vector/logo-v2-parts.json) + русская подпись тем же шрифтом
const P = JSON.parse(readFileSync(join(ROOT, 'brand/vector/logo-v2-parts.json'), 'utf8'));
const TAG_RU = (process.argv.find((a) => a.startsWith('--tag=')) || '--tag=УХОД ЗА ЧАСТНЫМИ САДАМИ').slice(6);
const font = (f) => { const b = readFileSync(join(ROOT, 'node_modules/@fontsource/montserrat/files', f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const FONTS = [font('montserrat-cyrillic-400-normal.woff'), font('montserrat-latin-400-normal.woff')]; // в кириллическом наборе Fontsource нет пробела — берём из латинского
function lineMixed(text, x0, x1, top, capH) { // как lineAt в tools/logo.mjs: заглавная capH, края x0…x1, разбивка под ширину
  const H = FONTS[1].getPath('H', 0, 0, 100).getBoundingBox(), size = (100 * capH) / (H.y2 - H.y1);
  const gl = [...text].map((ch) => { for (const f of FONTS) { const g = f.charToGlyph(ch); if (g.index > 0) return { f, g }; } throw new Error('нет глифа: ' + ch); });
  const em = (x) => (x * size) / gl[0].f.unitsPerEm, adv = gl.reduce((a, q) => a + em(q.g.advanceWidth), 0);
  const lsb = em(gl[0].g.getBoundingBox().x1), last = gl[gl.length - 1].g, rsb = em(last.advanceWidth - last.getBoundingBox().x2);
  const track = (x1 - x0 - (adv - lsb - rsb)) / (gl.length - 1); let x = x0 - lsb, d = '';
  for (const q of gl) { d += q.g.getPath(x, top + capH, size).toPathData(1); x += em(q.g.advanceWidth) + track; }
  return { d, track };
}
const TAG = lineMixed(TAG_RU, 295, 969, 968, 21);
const logoBody = P.ring + P.branch + P.letters + P.word + P.rules + P.leaf + TAG.d;
const wrap = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${P.vbFull}" fill="${fill}" role="img" aria-label="Verdant Estate — ${TAG_RU.toLowerCase()}"><path d="${logoBody}" fill-rule="nonzero"/></svg>\n`;
writeFileSync(join(ROOT, 'brand/logo/verdant-logo-ru.svg'), wrap('#1B462A'));
writeFileSync(join(ROOT, 'brand/logo/verdant-logo-ru-light.svg'), wrap('#F4F0E6'));
const logoSvg = Buffer.from(wrap('#F4F0E6'));
const logo = await sharp(logoSvg, { density: 600 }).resize({ height: LOGO_H }).png().toBuffer();
const lm = await sharp(logo).metadata();
// тень: альфа логотипа, тёмная, размытая
const shadow = await sharp(logo).ensureAlpha().extractChannel(3).toColourspace('b-w').toBuffer()
  .then((a) => sharp({ create: { width: lm.width, height: lm.height, channels: 3, background: '#06100A' } }).joinChannel(a).png().toBuffer())
  .then((b) => sharp(b).extend({ top: 30, bottom: 30, left: 30, right: 30, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(14).linear(0.55, 0).png().toBuffer());
const x = Math.round((W - lm.width) / 2), y = Math.round((H - lm.height) / 2);
const out = join(ROOT, 'docs/site/og-1200x630.jpg');
await sharp(photo).composite([{ input: shade }, { input: shadow, left: x - 30, top: y - 30 + 4 }, { input: logo, left: x, top: y }]).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
console.log(`подпись «${TAG_RU}», разбивка ${TAG.track.toFixed(1)} · og-1200x630.jpg: ${W}×${H}, логотип ${lm.width}×${lm.height}, ${Math.round(statSync(out).size / 1024)} КБ`);
