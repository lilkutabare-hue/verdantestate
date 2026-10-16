#!/usr/bin/env node
// Логотип Verdant Estate v2 — перерисовка оригинала заказчика brand/logo-ve.jpg (1254²), а не автотрейс целиком:
//   дуга       — формулой: окружность по замеру (центр 638.8/506.2, r 254.6) с профилем толщины по углу;
//   V и E       — контуры Cormorant Garamond 600 на местах букв оригинала;
//   надпись    — VERDANT ESTATE, Cormorant Garamond 600, трекинг под ширину оригинала;
//   подпись    — LANDSCAPING & GARDEN DESIGN, Montserrat 400;
//   разделитель — две линии формулой + листик;
//   ветвь, листья, листик — трассировка: маска без букв и дуги, ×4 Lanczos, сглаживание, potrace.
// Выход: brand/vector/mark-v2.svg (монограмма), brand/vector/logo-v2.svg (целиком), currentColor.
//        --check → tools/.cache/logo-check.png: оригинал серым, новый вектор зелёным поверх.
import sharp from 'sharp';
import potrace from 'potrace';
import opentype from 'opentype.js';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'brand/logo-ve.jpg'), OUT = join(ROOT, 'brand/vector');
const FS = join(ROOT, 'node_modules/@fontsource');
const load = async (p) => { const b = await readFile(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const serif = await load(join(FS, 'cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff'));
const sans = await load(join(FS, 'montserrat/files/montserrat-latin-400-normal.woff'));
const N = 1254, f1 = (n) => Math.round(n * 10) / 10;

// ---------- буквы и строки ----------
// глиф/строка → путь, вписанный по высоте заглавной в [top, bottom], по центру cx
function glyphAt(font, ch, top, bottom, cx) {
  const p0 = font.getPath(ch, 0, 0, 100), bb = p0.getBoundingBox();
  const s = (bottom - top) / (bb.y2 - bb.y1);
  const p = font.getPath(ch, 0, 0, 100 * s), b = p.getBoundingBox();
  const dx = cx - (b.x1 + b.x2) / 2, dy = top - b.y1;
  return font.getPath(ch, dx, dy, 100 * s).toPathData(1);
}
// строка капсом: высота заглавной capH, левый край x0, правый x1 — трекинг подбираем под ширину
function lineAt(font, text, x0, x1, top, capH) {
  const H = font.getPath('H', 0, 0, 100).getBoundingBox();
  const size = (100 * capH) / (H.y2 - H.y1);
  const glyphs = font.stringToGlyphs(text);
  const adv = glyphs.reduce((a, g) => a + (g.advanceWidth * size) / font.unitsPerEm, 0);
  const first = glyphs[0].getBoundingBox(), last = glyphs[glyphs.length - 1];
  const lsb = (first.x1 * size) / font.unitsPerEm, rsb = ((last.advanceWidth - last.getBoundingBox().x2) * size) / font.unitsPerEm;
  const track = (x1 - x0 - (adv - lsb - rsb)) / (glyphs.length - 1);
  let x = x0 - lsb, d = '';
  const base = top + capH;
  for (const g of glyphs) { d += g.getPath(x, base, size).toPathData(1); x += (g.advanceWidth * size) / font.unitsPerEm + track; }
  lineAt.track = track;
  return d;
}
// та же строка, но по центру cx с готовым трекингом (вторая подпись в той же типографике)
function lineCentered(font, text, cx, top, capH, track) {
  const H = font.getPath('H', 0, 0, 100).getBoundingBox(), size = (100 * capH) / (H.y2 - H.y1);
  const gl = font.stringToGlyphs(text), em = size / font.unitsPerEm;
  const ink = gl.reduce((a, g) => a + g.advanceWidth * em, 0) + track * (gl.length - 1) - gl[0].getBoundingBox().x1 * em - (gl[gl.length - 1].advanceWidth - gl[gl.length - 1].getBoundingBox().x2) * em;
  return lineAt(font, text, cx - ink / 2, cx + ink / 2, top, capH);
}

// глиф, вписанный в рамку буквы оригинала по ширине и высоте (растяжение — проценты, на глаз не читается)
function glyphBox(font, ch, x0, y0, x1, y1) {
  const p = font.getPath(ch, 0, 0, 1000), b = p.getBoundingBox();
  const sx = (x1 - x0) / (b.x2 - b.x1), sy = (y1 - y0) / (b.y2 - b.y1);
  const X = (x) => f1(x0 + (x - b.x1) * sx), Y = (y) => f1(y0 + (y - b.y1) * sy);
  return p.commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'M' || c.type === 'L' ? `${c.type}${X(c.x)} ${Y(c.y)}` : c.type === 'Q' ? `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}` : `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`).join('');
}
const V = glyphBox(serif, 'V', 485, 368, 744, 633);
const E = glyphBox(serif, 'E', 652, 464, 825, 674);
const WORD = lineAt(serif, 'VERDANT ESTATE', 166, 1087, 813, 65);
const TAG = lineAt(sans, 'LANDSCAPING & GARDEN DESIGN', 295, 969, 968, 21);
const TAG2 = lineCentered(sans, 'PRIVATE GARDEN SERVICE', 632, 962, 30, (lineAt.track * 30) / 21); // для первого экрана сайта

// ---------- дуга: окружность с профилем толщины (замер по оригиналу, градусы → полная толщина px) ----------
const C = [638.84, 506.15, 254.6];
const PROF = [[-92, 0], [-88, 1.4], [-60, 4.6], [-30, 6.6], [0, 8], [30, 8.3], [60, 9.3], [90, 6.2], [110, 4.5], [130, 1.9], [136, 0]];
const thick = (a) => { for (let i = 1; i < PROF.length; i++) if (a <= PROF[i][0]) { const [a0, w0] = PROF[i - 1], [a1, w1] = PROF[i]; return w0 + ((w1 - w0) * (a - a0)) / (a1 - a0); } return 0; };
function ring() {
  const out = [], inn = [];
  for (let a = -92; a <= 136; a += 1) {
    const t = (a * Math.PI) / 180, w = thick(a) / 2, cx = Math.cos(t), sy = Math.sin(t);
    out.push([C[0] + (C[2] + w) * cx, C[1] + (C[2] + w) * sy]); inn.push([C[0] + (C[2] - w) * cx, C[1] + (C[2] - w) * sy]);
  }
  const pts = out.concat(inn.reverse());
  return 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
}
const RING = ring();
// линии разделителя: y 924.5, толщина 1.6, слева 341–578, справа 675–911, концы сходят на нет
const rule = (x0, x1) => { const y = 924.5, h = 0.8; return `M${x0} ${y}L${x0 + 20} ${y - h}L${x1 - 20} ${y - h}L${x1} ${y}L${x1 - 20} ${y + h}L${x0 + 20} ${y + h}Z`; };
const RULES = rule(341, 578) + rule(675, 911);

// ---------- трассировка ветви ----------
const svgOf = (d, w = N, h = N, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${N} ${N}"><path d="${d}" fill="#000" ${extra}/></svg>`;
async function maskOf(d, stroke = 0) {
  const svg = svgOf(d, N, N, stroke ? `stroke="#000" stroke-width="${stroke}" stroke-linejoin="round"` : '');
  return sharp({ create: { width: N, height: N, channels: 3, background: '#fff' } }).composite([{ input: Buffer.from(svg) }]).greyscale().raw().toBuffer();
}
const src = await sharp(SRC).greyscale().raw().toBuffer();
const noLetters = await maskOf(V + E + WORD + TAG, 14), noRing = await maskOf(RING, 12);
const W4 = 4;
async function traceBox(x0, y0, x1, y1) {
  const w = x1 - x0, h = y1 - y0, buf = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y + y0) * N + (x + x0);
    // чернила оригинала, кроме мест, где стоят наши буквы и дуга
    buf[y * w + x] = noLetters[i] < 128 || (noRing[i] < 128 && !(x + x0 < 470 && y + y0 > 640)) ? 255 : src[i];
  }
  const big = await sharp(buf, { raw: { width: w, height: h, channels: 1 } }).resize(w * W4, h * W4, { kernel: 'lanczos3' }).blur(3.2).threshold(150).png().toBuffer();
  const svg = await new Promise((ok, no) => potrace.trace(big, { threshold: 128, turdSize: 220, optTolerance: 0.8, alphaMax: 1.1, color: '#000' }, (e, s) => (e ? no(e) : ok(s))));
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  // из пикселей ×4 обратно в координаты оригинала
  return d.replace(/-?\d+(\.\d+)?/g, (n, _, off) => n).replace(/([MLC])?\s*(-?[\d.]+)[ ,](-?[\d.]+)/g, (m, c, x, y) => `${c || ''}${f1(+x / W4 + x0)} ${f1(+y / W4 + y0)} `).replace(/\s+/g, ' ').trim();
}
const BRANCH = await traceBox(300, 220, 640, 790);
const LEAF = await traceBox(585, 900, 672, 948);

// ---------- сборка ----------
const MARK = RING + BRANCH + V + E;
const vbMark = '300 220 610 560'; // x 300…910, y 220…780
const wrap = (vb, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="currentColor" role="img" aria-label="${label}"><path d="${body}" fill-rule="nonzero"/></svg>\n`;
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'mark-v2.svg'), wrap(vbMark, MARK, 'Verdant Estate'));
await writeFile(join(OUT, 'logo-v2.svg'), wrap('150 220 954 784', MARK + WORD + RULES + LEAF + TAG, 'Verdant Estate — Landscaping &amp; Garden Design'));
// части по отдельности — для анимации в подвале (дуга, ветвь, буквы, надпись)
await writeFile(join(OUT, 'logo-v2-parts.json'), JSON.stringify({ vbMark, vbFull: '150 220 954 784', ring: RING, branch: BRANCH, letters: V + E, word: WORD, rules: RULES, leaf: LEAF, tag: TAG, tag2: TAG2 }));
console.log('mark-v2.svg', (MARK.length / 1024).toFixed(1), 'КБ путей; logo-v2.svg', ((MARK + WORD + RULES + LEAF + TAG).length / 1024).toFixed(1), 'КБ');

if (process.argv.includes('--check')) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}"><path d="${MARK + WORD + RULES + LEAF + TAG}" fill="#00a050" fill-opacity=".55"/></svg>`;
  await mkdir(join(ROOT, 'tools/.cache'), { recursive: true });
  await sharp(SRC).greyscale().linear(0.5, 128).toColourspace('srgb').composite([{ input: Buffer.from(svg) }]).png().toFile(join(ROOT, 'tools/.cache/logo-check.png'));
  console.log('проверка: tools/.cache/logo-check.png');
}
