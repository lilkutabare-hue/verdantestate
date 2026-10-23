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
const PAGES_BASE = 'https://verdant-assets.lilkutabare.workers.dev/'; // медиа для Тильды: node tools/deploy.mjs --assets (публичный воркер со статикой, CORS *); при своём домене — media.<домен>
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
for (const f of [...(await walk(SRC)), ...(await walk(SITE)), ...(await walk(join(ROOT, 'brand/vector')))].sort()) { if (/version\.txt$|apple-touch-icon\.png$/.test(f)) continue; h.update(f); h.update(await readFile(f)); } // то, что пишет сама сборка, в хэш не входит — иначе он менялся от сборки к сборке
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
// знак шапки: сам логотип как объёмный предмет в спектральной обводке (без подложки): свечение + кромка — градиент, который крутит VE.spectral (data-spin = центр), тело currentColor, блик по верху
const MARK = `<svg class="ve-mark" viewBox="${LP.vbMark}" overflow="visible" aria-hidden="true" focusable="false">
<defs><linearGradient id="ve-mg" gradientUnits="userSpaceOnUse" x1="300" y1="220" x2="910" y2="780" data-spin="605 500"><stop offset="0" stop-color="hsl(110,18%,76%)"/><stop offset=".2" stop-color="hsl(80,22%,88%)"/><stop offset=".4" stop-color="#fff"/><stop offset=".55" stop-color="hsl(44,60%,82%)"/><stop offset=".72" stop-color="hsl(34,45%,66%)"/><stop offset=".88" stop-color="hsl(120,14%,80%)"/><stop offset="1" stop-color="hsl(110,18%,76%)"/></linearGradient>
<linearGradient id="ve-mgl" gradientUnits="userSpaceOnUse" x1="0" y1="220" x2="0" y2="780"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<use class="ve-mark__glow" href="#ve-l-mark" fill="none" stroke="url(#ve-mg)" stroke-width="34" stroke-linejoin="round"/>
<use class="ve-mark__rim" href="#ve-l-mark" fill="none" stroke="url(#ve-mg)" stroke-width="11" stroke-linejoin="round"/>
<use class="ve-mark__body" href="#ve-l-mark" fill="currentColor"/>
<use class="ve-mark__gloss" href="#ve-l-mark" fill="url(#ve-mgl)"/></svg>`;

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
// данные заказчика для политики, согласия и подвала: docs/client-data.json (образец — client-data.example.json)
let CD = {};
try { CD = JSON.parse(await readFile(join(DOCS, 'client-data.json'), 'utf8')); } catch {}
const today = new Date().toLocaleDateString('ru-RU');
const OPT = { METRICS_LINE: '', METRICS_COOKIE: '', TRANSFER_LINE: '', MAILING_LINE: 'Рекламные и информационные рассылки мы не делаем.', RETENTION: '12 месяцев', OGRN_LABEL: 'ОГРНИП', DATE: today, SITE: 'verdantestate.ru' };
const legalFill = (s) => {
  let out = s.replace(/\[\[([A-Z_]+)\]\]/g, (m, k) => (CD[k] != null && CD[k] !== '' ? String(CD[k]) : k in OPT ? OPT[k] : m));
  if (CD.DRAFT === false) out = out.replace(/<p class="ve-legal__draft" data-ve-draft>[\s\S]*?<\/p>\s*/g, '');
  if (!CD.INN) out = out.replace(/<span class="ve-ft__req"[^>]*>[\s\S]*?<\/span>/g, ''); // реквизиты в подвале — только когда есть ИНН
  return out;
};
const fill = (s, base) => legalFill(s).replace(/__V__/g, V).replace(/__BASE__/g, base).replace(/__OFFERS__/g, JSON.stringify(CD.offers || null)).replace(/__LOGO_SPRITE__/g, LOGO_SPRITE).replace(/__VB_MARK__/g, LP.vbMark).replace(/__VB_FULL__/g, LP.vbFull).replace(/__MARK__/g, MARK).replace(/__ARC_MASK__/g, ARC_MASK).replace(/__ARC_CX__/g, ARC_CX).replace(/__ARC_CY__/g, ARC_CY).replace(/__SIL:(\w+)__/g, (_, k) => SIL[k].d).replace(/__SILH:(\w+)__/g, (_, k) => SIL[k].h);

const headDist = fill(headSrc, PAGES_BASE);
await checkScripts(headDist, 'head'); checkCss(headDist, 'head');
if (Buffer.byteLength(headDist) > LIMIT_HEAD) throw new Error(`HEAD ${kb(Buffer.byteLength(headDist))} > 64 КБ`);
await writeFile(join(DIST, 'head.html'), headDist);
console.log(`head.html  ${kb(Buffer.byteLength(headDist))} / 64 КБ`);

// блоки, которых больше нет в src (после перенумерации), из dist убираем
const keep = new Set(files.map((f) => `t123-${f.slice(0, 2)}.html`));
for (const f of await readdir(DIST)) if (/^t123-\d\d\.html$/.test(f) && !keep.has(f)) await unlink(join(DIST, f));

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

// ---------- отдельные страницы: политика и согласие (свой T123 на страницах /policy и /consent) ----------
const legalStyle = await readFile(join(SRC, 'legal/_style.html'), 'utf8');
const LEGAL = [['policy', 'Политика обработки персональных данных'], ['consent', 'Согласие на обработку персональных данных']];
for (const [name, title] of LEGAL) {
  const src = legalStyle + (await readFile(join(SRC, `legal/${name}.html`), 'utf8'));
  const dist = `<!-- VE · legal/${name}.html · сборка ${V} -->\n` + fill(src, PAGES_BASE);
  checkCss(dist, name);
  await writeFile(join(DIST, `t123-${name}.html`), dist);
  console.log(`t123-${name}.html  ${kb(Buffer.byteLength(dist))} / 84 КБ  ← legal/${name}.html`);
  const prev = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title} — Verdant Estate</title><meta name="robots" content="noindex"><link rel="icon" href="site/favicon.svg" type="image/svg+xml"><script>window.VE_BASE=new URL('site/',location.href).href;window.VE_LEGAL={policy:'policy.html',consent:'consent.html',home:'./'}</script>${fill(headSrc, 'site/')}<style>html,body{margin:0;background:#fff}</style></head><body>${fill(src, 'site/')}</body></html>`;
  await writeFile(join(DOCS, `${name}.html`), prev);
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
<link rel="apple-touch-icon" href="site/apple-touch-icon.png">
<meta name="theme-color" content="#1B462A">
<script>window.VE_BASE=new URL('site/',location.href).href;window.VE_LEGAL={policy:'policy.html',consent:'consent.html',home:'./'}</script>
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
// иконка для «на экран Домой»: знак на бумаге, 180×180
{ const sharp = (await import('sharp')).default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700"><rect width="700" height="700" fill="#FFFFFF"/><g transform="translate(45 70) translate(-300 -220)" fill="#1B462A"><path d="${LP.ring}"/><path d="${LP.branch}"/><path d="${LP.letters}"/></g></svg>`;
  await writeFile(join(SITE, 'apple-touch-icon.png'), await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer()); }
await writeFile(join(SITE, 'version.txt'), V + '\n');
console.log(`docs/index.html  ${kb(Buffer.byteLength(page))}   сборка ${V}`);
