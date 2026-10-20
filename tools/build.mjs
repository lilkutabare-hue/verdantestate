#!/usr/bin/env node
// Сборка: src/ → dist/ (блоки T123 для Тильды) + docs/index.html (превью на GitHub Pages).
// Проверяет: node --check инлайн-скриптов, баланс скобок CSS, размер блока против 84 КБ, HEAD против 64 КБ.
import { readFile, writeFile, readdir, mkdir, stat, unlink } from 'node:fs/promises';
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
for (const f of [...(await walk(SRC)), ...(await walk(SITE)), ...(await walk(join(ROOT, 'brand/vector')))].sort()) { h.update(f); h.update(await readFile(f)); }
const V = h.digest('hex').slice(0, 8);

// ---------- логотип ----------
// логотип v2 (tools/logo.mjs): части — символами спрайта; спрайт кладётся один раз в блок шапки,
// шапка, хиро и подвал берут части через <use href="#ve-l-…">
const LP = JSON.parse(await readFile(join(ROOT, 'brand/vector/logo-v2-parts.json'), 'utf8'));
const sym = (id, d) => `<symbol id="ve-l-${id}" overflow="visible"><path d="${d}"/></symbol>`;
const LOGO_SPRITE = `<svg width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">`
  + ['ring', 'branch', 'letters', 'word', 'rules', 'leaf', 'tag', 'tag2'].map((k) => sym(k, LP[k])).join('')
  + `<symbol id="ve-l-mark" overflow="visible"><use href="#ve-l-ring"/><use href="#ve-l-branch"/><use href="#ve-l-letters"/></symbol></svg>`;
const SIL = JSON.parse(await readFile(join(ROOT, 'brand/vector/silhouettes.json'), 'utf8')); // tools/outline.mjs
// дуга логотипа как CSS-маска (data-URI) и её центр в долях viewBox — для спектрального свечения по дуге
const [vx, vy, vw, vh] = LP.vbFull.split(' ').map(Number);
const ARC_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${LP.vbFull}'><path d='${LP.ring}' fill='#000'/></svg>`)}")`;
const ARC_CX = (((638.8 - vx) / vw) * 100).toFixed(2) + '%', ARC_CY = (((506.2 - vy) / vh) * 100).toFixed(2) + '%';
const MARK = `<svg viewBox="${LP.vbMark}" fill="currentColor" aria-hidden="true" focusable="false"><use href="#ve-l-mark"/></svg>`;

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
const files = (await readdir(SRC)).filter((f) => /^\d\d[a-z]?-.*\.html$/.test(f)).sort(); // 04a-… — вставка между блоками без перенумерации
const headSrc = await readFile(join(SRC, 'head.html'), 'utf8');
const fill = (s, base) => s.replace(/__V__/g, V).replace(/__BASE__/g, base).replace(/__LOGO_SPRITE__/g, LOGO_SPRITE).replace(/__VB_MARK__/g, LP.vbMark).replace(/__VB_FULL__/g, LP.vbFull).replace(/__MARK__/g, MARK).replace(/__ARC_MASK__/g, ARC_MASK).replace(/__ARC_CX__/g, ARC_CX).replace(/__ARC_CY__/g, ARC_CY).replace(/__SIL:(\w+)__/g, (_, k) => SIL[k].d).replace(/__SILH:(\w+)__/g, (_, k) => SIL[k].h);

const headDist = fill(headSrc, PAGES_BASE);
await checkScripts(headDist, 'head'); checkCss(headDist, 'head');
if (Buffer.byteLength(headDist) > LIMIT_HEAD) throw new Error(`HEAD ${kb(Buffer.byteLength(headDist))} > 64 КБ`);
await writeFile(join(DIST, 'head.html'), headDist);
console.log(`head.html  ${kb(Buffer.byteLength(headDist))} / 64 КБ`);

// блоки, которых больше нет в src (после перенумерации), из dist убираем
const keep = new Set(files.map((f) => `t123-${f.split('-')[0]}.html`));
for (const f of await readdir(DIST)) if (/^t123-\d\d[a-z]?\.html$/.test(f) && !keep.has(f)) await unlink(join(DIST, f));

const blocksDist = [], blocksPreview = [];
for (const f of files) {
  const n = f.split('-')[0];
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
<style>html,body{margin:0;padding:0;background:#FFFFFF}body{overflow-x:hidden}.ve-preview-note{font:11px/1.5 -apple-system,system-ui,sans-serif;color:#5E6E45;text-align:center;padding:18px 20px 28px;background:#FFFFFF}</style>
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
