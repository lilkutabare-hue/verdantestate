#!/usr/bin/env node
// Лупы секций и клипы смены сезонов: media-src/ → docs/site/media/loops/ + manifest.json.
//
// Вход (media-src/, prompts-magnific.md §6.2–6.4):
//   loop-t1.mp4 loop-t2.mp4 loop-t3.mp4   тарифы (карточка 4:5)
//   loop-b2.mp4                           «после» в шторке (16:10)
//   loop-z1.mp4                           лето в «Круглый год» (16:10)
//   loop-r02.mp4 loop-r04.mp4 loop-r07.mp4   «10 способов» (карточка 4:5)
//   season-summer-autumn.mp4, season-autumn-winter.mp4   смена сезонов — не луп, а серия кадров (как хиро): вкладка тянет её по кадрам
//
// Выход: loops/<name>.mp4 (1080 по длинной стороне, crf от 24, ≤ 400 КБ — иначе crf выше или 720), loops/<name>.webp (постер = первый кадр),
//        loops/season-<a>-<b>-NN.avif (24 кадра 1280×800) и manifest.json: { loops:{name:{mp4,poster,w,h}}, seasons:{ 'summer-autumn':{frames:[…],w,h} } }
// Страница: VE.loops() в HEAD вставляет <video> под той же рамкой .ve-px у [data-loop], играет только в поле зрения;
//           при prefers-reduced-motion и Save-Data — остаётся стилл.
// Флаги: --src=папка, --only=t1,b2  (пересобрать часть), --crf=24
import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SRC = opt('src') ? resolve(opt('src')) : join(ROOT, 'media-src'), OUT = join(ROOT, 'docs/site/media/loops'), TMP = join(ROOT, 'tools/.cache/loops');
const ONLY = opt('only') ? opt('only').split(',') : null;
const CRF0 = +opt('crf', 24), LIMIT = 400 * 1024;

// имя → пропорция кадра на странице (кроп по центру при кодировании, чтобы не возить лишние пиксели)
const LOOPS = { t1: [4, 5], t2: [4, 5], t3: [4, 5], r02: [4, 5], r04: [4, 5], r07: [4, 5], b2: [16, 10], z1: [16, 10] };
const SEASONS = { 'summer-autumn': [16, 10], 'autumn-winter': [16, 10] };
const SEASON_FRAMES = 24, SEASON_W = 1280, SEASON_Q = 42;

async function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { await run('ffmpeg', ['-version']); return 'ffmpeg'; } catch {}
  try { const { stdout } = await run('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']); return stdout.trim(); } catch {}
  throw new Error('ffmpeg не найден: поставь FFMPEG=/путь/к/ffmpeg');
}
async function probe(ff, file) {
  const r = await run(ff, ['-i', file]).catch((e) => e);
  const s = String(r.stderr || '');
  const d = s.match(/Duration: (\d+):(\d+):([\d.]+)/), wh = s.match(/, (\d{3,5})x(\d{3,5})[,\s]/);
  if (!d || !wh) throw new Error('не прочитал ' + file);
  return { dur: +d[1] * 3600 + +d[2] * 60 + +d[3], w: +wh[1], h: +wh[2] };
}
// кроп по центру под пропорцию и масштаб до long по длинной стороне (чётные размеры)
function cropScale(src, aspect, long) {
  const [aw, ah] = aspect; let cw = src.w, ch = Math.round((src.w * ah) / aw);
  if (ch > src.h) { ch = src.h; cw = Math.round((src.h * aw) / ah); }
  const s = long / Math.max(cw, ch); let w = Math.round(cw * s), h = Math.round(ch * s); w -= w % 2; h -= h % 2;
  return { crop: `crop=${cw}:${ch}:${Math.round((src.w - cw) / 2)}:${Math.round((src.h - ch) / 2)}`, w, h };
}

const ff = await findFfmpeg();
await mkdir(OUT, { recursive: true }); await mkdir(TMP, { recursive: true });
const manPath = join(OUT, 'manifest.json');
const man = existsSync(manPath) ? JSON.parse(await readFile(manPath, 'utf8')) : { v: 1, loops: {}, seasons: {} };
const files = existsSync(SRC) ? await readdir(SRC) : [];
const kb = (n) => (n / 1024).toFixed(0) + ' КБ';

// ---------- лупы ----------
for (const [name, aspect] of Object.entries(LOOPS)) {
  const inFile = join(SRC, `loop-${name}.mp4`);
  if (!files.includes(`loop-${name}.mp4`) || (ONLY && !ONLY.includes(name))) continue;
  const src = await probe(ff, inFile);
  let long = 1080, crf = CRF0, size = Infinity, outFile = join(OUT, `${name}.mp4`), g;
  for (let i = 0; i < 6; i++) {
    g = cropScale(src, aspect, long);
    await run(ff, ['-y', '-v', 'error', '-i', inFile, '-an', '-vf', `${g.crop},scale=${g.w}:${g.h}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
    size = (await stat(outFile)).size;
    if (size <= LIMIT) break;
    if (crf < 33) crf += 3; else long = 720;
  }
  // постер — первый кадр, webp
  const png = join(TMP, `${name}.png`);
  await run(ff, ['-y', '-v', 'error', '-i', outFile, '-frames:v', '1', png]);
  await sharp(png).webp({ quality: 72 }).toFile(join(OUT, `${name}.webp`));
  man.loops[name] = { mp4: `${name}.mp4`, poster: `${name}.webp`, w: g.w, h: g.h, dur: +src.dur.toFixed(2) };
  console.log(`луп ${name}: ${g.w}×${g.h}, crf ${crf}, ${kb(size)}${size > LIMIT ? ' ⚠ тяжелее 400 КБ' : ''}`);
}

// ---------- смена сезонов: серия кадров ----------
for (const [name, aspect] of Object.entries(SEASONS)) {
  const inFile = join(SRC, `season-${name}.mp4`);
  if (!files.includes(`season-${name}.mp4`) || (ONLY && !ONLY.includes(name))) continue;
  const src = await probe(ff, inFile), g = cropScale(src, aspect, SEASON_W);
  const frames = []; let total = 0;
  for (let i = 0; i < SEASON_FRAMES; i++) {
    const t = i === SEASON_FRAMES - 1 ? null : (src.dur * i) / (SEASON_FRAMES - 1);
    const png = join(TMP, `season-${name}-${i}.png`);
    const a = t == null ? ['-sseof', '-0.08', '-i', inFile, '-update', '1'] : ['-ss', t.toFixed(3), '-i', inFile, '-frames:v', '1'];
    await run(ff, ['-y', '-v', 'error', ...a, '-vf', `${g.crop},scale=${g.w}:${g.h}`, png]);
    const out = `season-${name}-${String(i).padStart(2, '0')}.avif`;
    const buf = await sharp(png).avif({ quality: SEASON_Q, effort: 4 }).toBuffer();
    await writeFile(join(OUT, out), buf); total += buf.length; frames.push(out);
  }
  man.seasons[name] = { frames, w: g.w, h: g.h };
  console.log(`сезон ${name}: ${frames.length} кадров ${g.w}×${g.h}, ${kb(total)}`);
}

await writeFile(manPath, JSON.stringify(man, null, 1) + '\n');
await rm(TMP, { recursive: true, force: true });
console.log('→', manPath, 'лупов', Object.keys(man.loops).length, 'сезонов', Object.keys(man.seasons).length);
