#!/usr/bin/env node
// Сборка: src/ → dist/ (блоки T123 для Тильды) + docs/index.html (превью на GitHub Pages).
// Проверяет: node --check инлайн-скриптов, баланс скобок CSS, размер блока против 84 КБ, HEAD против 64 КБ.
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src'), DIST = join(ROOT, 'dist'), DOCS = join(ROOT, 'docs'), SITE = join(DOCS, 'site');
const PAGES_BASE = 'https://lilkutabare-hue.github.io/verdantestate/site/';
const LIMIT_BLOCK = 84 * 1024, LIMIT_HEAD = 64 * 1024;
await mkdir(DIST, { recursive: true });

// ---------- версия сборки: хэш исходников и ассетов ----------
async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p);
  }
  return out;
}
const h = createHash('sha1');
for (const f of [...(await walk(SRC)), ...(await walk(SITE))].sort()) { h.update(f); h.update(await readFile(f)); }
const V = h.digest('hex').slice(0, 8);

// ---------- логотип: минификация трассировки ----------
function minSvg(svg, { fill = 'currentColor' } = {}) {
  return svg.replace(/<\?xml[^>]*>/, '').replace(/\s(width|height|version)="[^"]*"/g, '')
    .replace(/(\d+\.\d{2,})/g, (m) => (Math.round(parseFloat(m) * 10) / 10).toString())
    .replace(/stroke="none"/g, '').replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="${fill}"`)
    .replace(/\n|\t/g, '').replace(/\s{2,}/g, ' ').replace(/> </g, '><');
}
const MARK = minSvg(await readFile(join(ROOT, 'brand/vector/mark.svg'), 'utf8'));
// подвал: ветвь/дуга и буквы — отдельные под-пути, чтобы дорисовывать
function splitMark(svg) {
  const d = svg.match(/ d="([^"]+)"/)[1];
  const subs = d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
  const vb = svg.match(/viewBox="([^"]+)"/)[1];
  const paths = subs.map((s, i) => `<path class="p${i}" d="${s}"/>`).join('');
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${paths}</svg>`;
}
const MARK_SPLIT = splitMark(MARK);

// ---------- проверки ----------
async function checkScripts(html, name) {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html))) {
    const code = m[1];
    if (!code.trim()) continue;
    const tmp = join(tmpdir(), `ve-${name}-${i++}.mjs`);
    await writeFile(tmp, code);
    try { await run('node', ['--check', tmp]); } catch (e) { throw new Error(`[${name}] скрипт #${i} не прошёл node --check:\n${e.stderr || e.message}`); }
  }
}
function checkCss(html, name) {
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) {
    const css = m[1];
    const open = (css.match(/{/g) || []).length, close = (css.match(/}/g) || []).length;
    if (open !== close) throw new Error(`[${name}] CSS: скобки не сходятся (${open} { vs ${close} })`);
  }
}
const kb = (n) => (n / 1024).toFixed(1) + ' КБ';

// ---------- сборка ----------
const files = (await readdir(SRC)).filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
const headSrc = await readFile(join(SRC, 'head.html'), 'utf8');
const fill = (s, base) => s.replace(/__V__/g, V).replace(/__BASE__/g, base).replace(/__MARK_SPLIT__/g, MARK_SPLIT).replace(/__MARK__/g, MARK);

const headDist = fill(headSrc, PAGES_BASE);
await checkScripts(headDist, 'head'); checkCss(headDist, 'head');
if (Buffer.byteLength(headDist) > LIMIT_HEAD) throw new Error(`HEAD ${kb(Buffer.byteLength(headDist))} > 64 КБ`);
await writeFile(join(DIST, 'head.html'), headDist);
console.log(`head.html  ${kb(Buffer.byteLength(headDist))} / 64 КБ`);

const blocksDist = [], blocksPreview = [];
for (const f of files) {
  const n = f.slice(0, 2);
  const src = await readFile(join(SRC, f), 'utf8');
  const dist = `<!-- VE · ${f} · сборка ${V} -->\n` + fill(src, PAGES_BASE);
  await checkScripts(dist, f); checkCss(dist, f);
  const size = Buffer.byteLength(dist);
  if (size > LIMIT_BLOCK) throw new Error(`[${f}] блок ${kb(size)} > 84 КБ`);
  await writeFile(join(DIST, `t123-${n}.html`), dist);
  blocksDist.push({ n, f, size, html: dist });
  blocksPreview.push({ n, f, html: fill(src, 'site/') });
  console.log(`t123-${n}.html  ${kb(size)} / 84 КБ  ← ${f}`);
}

// ---------- стенд Тильды: обёртки .t-body > .t-records > .t-rec > .t123 ----------
const stand = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>стенд Тильды · Verdant Estate</title>
<script>window.VE_BASE=new URL("/site/",location.href).href</script>
${headDist.replace(new RegExp(PAGES_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '/site/')}
<style>body{margin:0}.t-rec{position:relative}</style></head>
<body class="t-body" style="margin:0"><div id="allrecords" class="t-records">
${blocksDist.map((b) => `<div id="rec-${b.n}" class="r t-rec" style="padding:0"><div class="t123"><div class="t-container_100"><div class="t-width t-width_100">${b.html.replace(new RegExp(PAGES_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '/site/')}</div></div></div></div>`).join('\n')}
</div></body></html>`;
await writeFile(join(DIST, 'preview.html'), stand);

// ---------- превью для заказчика: docs/index.html ----------
const page = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Verdant Estate — уход за частными садами в Москве и области</title>
<meta name="description" content="Постоянное управление садом: один договор, один ответственный, весь сад под контролем. Москва и Московская область.">
<meta property="og:title" content="Verdant Estate — Private Garden Service">
<meta property="og:description" content="Сад, за которым не нужно следить. Постоянный уход за частными садами в Москве и Московской области.">
<meta property="og:image" content="site/media/scene/poster-wide.webp?v=${V}">
<meta name="robots" content="noindex">
<link rel="icon" href="site/favicon.svg" type="image/svg+xml">
<script>window.VE_BASE=new URL('site/',location.href).href</script>
${fill(headSrc, 'site/')}
<style>html,body{margin:0;padding:0;background:#F7F4EC}body{overflow-x:hidden}.ve-preview-note{font:11px/1.5 -apple-system,system-ui,sans-serif;color:#5E6E45;text-align:center;padding:18px 20px 28px;background:#F7F4EC}</style>
</head>
<body>
${blocksPreview.map((b) => `<!-- ${b.f} -->\n${b.html}`).join('\n\n')}
<div class="ve-preview-note">превью сборки ${V} · изображения временные, до генераций · контакты в подвале — заглушки</div>
</body>
</html>
`;
await writeFile(join(DOCS, 'index.html'), page);
await writeFile(join(SITE, 'version.txt'), V + '\n');
console.log(`docs/index.html  ${kb(Buffer.byteLength(page))}   сборка ${V}`);
