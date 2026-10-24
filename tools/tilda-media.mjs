#!/usr/bin/env node
// Медиа сайта в хранилище Тильды (план медиа docs/plan-media-hosting-2026-10-21.md §3): Cloudflare в России режут после ~16 КБ,
// static.tildacdn.com открывается всегда. Тильда сохраняет имя файла, но кладёт каждый в свою папку-код:
//   https://static.tildacdn.com/tild<код>/<имя>  — поэтому имена делаем плоскими и уникальными, а ссылки собираем в карту.
//
//   node tools/tilda-media.mjs --pack            docs/site/{media,fonts} → dist/tilda-media/ (плоские имена) + СПИСОК.txt (что грузить, что нельзя)
//   node tools/tilda-media.mjs --map <файл.txt>  вытащить из текста все ссылки static.tildacdn.com → docs/media-map.json (путь → ссылка); печатает, чего не хватает
//   node tools/tilda-media.mjs --check           прогнать все ссылки карты HEAD-запросом: код, размер, CORS
//
// Плоское имя: путь без «media/», «/» → «-»: media/scene/tall-00.jpg → scene-tall-00.jpg, fonts/x.woff2 → fonts-x.woff2.
// Та же функция в сборке (tools/build.mjs flatName) и в VE.url (src/head.html) — менять только все три вместе.
// Файлы > 5 МБ (цельные видео пролёта) Тильда не примет — в список они идут с пометкой «не грузить», сайт их не ждёт (сцена берёт куски ≤ 4,8 МиБ).
import { readdir, stat, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'docs/site'), OUT = join(ROOT, 'dist/tilda-media'), MAP = join(ROOT, 'docs/media-map.json');
const args = process.argv.slice(2);
const LIMIT = 5 * 1000 * 1000; // «до 5 МБ» у Тильды — считаем по-честному десятичными, с запасом
export const flatName = (p) => p.replace(/^media\//, '').replace(/\//g, '-');

async function walk(dir, base = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...(await walk(join(dir, e.name), rel)));
    else if (!e.name.startsWith('.')) out.push(rel);
  }
  return out;
}
// что нужно сайту на Тильде: медиа и шрифты; скрипт сцены и манифесты идут внутрь блоков (сборка), отдельными файлами не нужны
async function siteFiles() {
  const all = (await walk(SITE)).filter((p) => /^(media|fonts)\//.test(p));
  return all.filter((p) => !/manifest\.json$/.test(p)).sort();
}
const sha = async (f) => createHash('sha1').update(await readFile(f)).digest('hex').slice(0, 10);
const mb = (n) => (n / 1048576).toFixed(2) + ' МБ';

if (args.includes('--pack')) {
  await rm(OUT, { recursive: true, force: true }); await mkdir(OUT, { recursive: true });
  const prev = existsSync(MAP) ? JSON.parse(await readFile(MAP, 'utf8')) : {};
  const prevSha = prev.__sha || {};
  const files = await siteFiles(); const rows = [], shas = {}; let total = 0, skip = 0, fresh = 0;
  for (const p of files) {
    const src = join(SITE, p), st = await stat(src), flat = flatName(p), h = await sha(src); shas[p] = h;
    const over = st.size > LIMIT, isNew = prevSha[p] !== h || !prev[p];
    if (!over) { await copyFile(src, join(OUT, flat)); total += st.size; if (isNew) fresh++; } else skip++;
    rows.push({ p, flat, size: st.size, over, isNew });
  }
  await writeFile(join(OUT, 'pack.json'), JSON.stringify({ when: new Date().toISOString(), files: rows.map((r) => ({ path: r.p, flat: r.flat, size: r.size, sha: shas[r.p], over: r.over })) }, null, 1));
  const list = [
    `Медиа сайта Verdant Estate для хранилища Тильды — ${rows.length - skip} файлов, ${mb(total)} (собрано ${new Date().toLocaleString('ru-RU')})`,
    '',
    'Куда: Тильда → Настройки сайта → Ещё → «Загрузка файлов» (Files). Грузить ВСЕ файлы из этой папки (кроме этого списка и pack.json), можно пачками.',
    'После заливки: открыть список файлов, выделить всё (Cmd+A) и скопировать текст со ссылками в файл → node tools/tilda-media.mjs --map <файл>.',
    'Если Тильда не приняла какой-то тип (.webp, .woff2, .mp4) — написать, какие именно: пересоберём в принятый формат.',
    '',
    `Новых или изменённых с прошлой карты: ${fresh}${Object.keys(prev).length ? '' : ' (карты ещё нет — грузить всё)'}`,
    '',
    'ИМЯ ФАЙЛА\tРАЗМЕР\tЧТО ЭТО\tСТАТУС',
    ...rows.map((r) => `${r.flat}\t${mb(r.size)}\t${r.p}\t${r.over ? 'НЕ ГРУЗИТЬ — больше 5 МБ, сайту не нужен' : r.isNew ? 'новый' : 'как в карте'}`),
  ];
  await writeFile(join(OUT, 'СПИСОК.txt'), list.join('\n') + '\n');
  console.log(`dist/tilda-media/: ${rows.length - skip} файлов, ${mb(total)}; пропущено > 5 МБ: ${skip}; новых: ${fresh}. Список — dist/tilda-media/СПИСОК.txt`);
}

if (args.includes('--map')) {
  const f = args[args.indexOf('--map') + 1]; if (!f) { console.error('--map <файл со ссылками>'); process.exit(1); }
  const text = await readFile(resolve(f), 'utf8');
  const any = args.includes('--any'); // --any: любые адреса (эмуляция хранилища на стенде: http://localhost:5181/dist/tilda-media/<имя>)
  const urls = [...new Set(text.match(any ? /https?:\/\/[^\s"'<>)\]]+/g : /https?:\/\/static\d*\.tildacdn\.com\/[A-Za-z0-9_-]+\/[^\s"'<>)\]]+/g) || [])];
  const byFlat = {}; for (const u of urls) { const name = decodeURIComponent(u.split('/').pop().split('?')[0]); byFlat[name] = any ? u : u.replace(/^https?:\/\/static\d*\./, 'https://static.'); }
  const files = await siteFiles(); const map = {}, shas = {}; const missing = [];
  for (const p of files) { const flat = flatName(p); shas[p] = await sha(join(SITE, p)); if (byFlat[flat]) map[p] = byFlat[flat]; else { const st = await stat(join(SITE, p)); if (st.size <= LIMIT) missing.push(flat); } }
  const prev = existsSync(MAP) ? JSON.parse(await readFile(MAP, 'utf8')) : {};
  for (const k of Object.keys(prev)) if (k !== '__sha' && !map[k] && files.includes(k)) map[k] = prev[k]; // старые ссылки остаются, пока файл не изменился
  const out = { ...map, __sha: shas };
  await writeFile(MAP, JSON.stringify(out, null, 1) + '\n');
  console.log(`ссылок в тексте: ${urls.length}; в карте: ${Object.keys(map).length} из ${files.length}; не хватает: ${missing.length}${missing.length ? '\n  ' + missing.slice(0, 40).join('\n  ') + (missing.length > 40 ? `\n  … ещё ${missing.length - 40}` : '') : ''}`);
  console.log('карта: docs/media-map.json → node tools/build.mjs (dist/ для Тильды соберётся с этими адресами)');
}

if (args.includes('--check')) {
  if (!existsSync(MAP)) { console.error('нет docs/media-map.json'); process.exit(1); }
  const map = JSON.parse(await readFile(MAP, 'utf8')); let bad = 0, n = 0;
  for (const [p, u] of Object.entries(map)) {
    if (p === '__sha') continue; n++;
    try {
      const r = await fetch(u, { method: 'HEAD' });
      const len = +r.headers.get('content-length') || 0, cors = r.headers.get('access-control-allow-origin'), type = r.headers.get('content-type');
      const local = (await stat(join(SITE, p))).size;
      const ok = r.ok && (!len || len === local) && cors === '*';
      if (!ok) { bad++; console.log(`✗ ${p} → ${r.status} ${type} ${len}/${local} CORS=${cors}`); }
    } catch (e) { bad++; console.log(`✗ ${p} → ${e.message}`); }
  }
  console.log(bad ? `проблем: ${bad} из ${n}` : `все ${n} ссылок отвечают 200, размер совпадает, CORS *`);
}
