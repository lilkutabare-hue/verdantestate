#!/usr/bin/env node
// Стиллы карточек из первого кадра лупа (и стиллы осени/зимы из последнего кадра клипа смены сезона):
// media-src/loop-*.mp4, season-*.mp4 → docs/site/media/stills/<still>-l.webp / -s.webp.
// Зачем: страница кладёт <video> поверх <img> той же рамки; первый кадр Kling отличается от исходного рендера на 4–6/255
// (пересжатие и ресайз), и в момент старта лупа кадр «прыгает». Стилл из самого лупа совпадает с его первым кадром.
// Размер и пропорция берутся у существующего стилла (кроп по центру), качество как в tools/stills.mjs (78 / 74).
// Флаги: --only=t1,b2
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'media-src'), STILLS = join(ROOT, 'docs/site/media/stills'), TMP = join(ROOT, 'tools/.cache/loop-stills');
const args = process.argv.slice(2);
const opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; };
const ONLY = opt('only') ? opt('only').split(',') : null;

// луп → стилл карточки (имена из src/*.html)
const MAP = { t1: 'tariff-basic', t2: 'tariff-premium', t3: 'tariff-estate', b2: 'ba-after', z1: 'season-summer', ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`r${String(i + 1).padStart(2, '0')}`, `way-${String(i + 1).padStart(2, '0')}`])) };
// стиллы сезонов — из ПОСЛЕДНЕГО кадра клипа смены сезона: вкладка доигрывает клип и показывает стилл (src/11-seasons.html setPic),
// а последний кадр Kling отличается от рендера Z3/Z4 на ~7/255; первый кадр следующего клипа совпадает с ним (≈2/255)
const SEASONS = { 'season-autumn': 'season-summer-autumn', 'season-winter': 'season-autumn-winter' };

async function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { await run('ffmpeg', ['-version']); return 'ffmpeg'; } catch {}
  try { const { stdout } = await run('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']); return stdout.trim(); } catch {}
  throw new Error('ffmpeg не найден: поставь FFMPEG=/путь/к/ffmpeg');
}
const ff = await findFfmpeg();
await mkdir(TMP, { recursive: true });
const files = existsSync(SRC) ? await readdir(SRC) : [];
const jobs = [...Object.entries(MAP).map(([key, still]) => ({ key, still, file: `loop-${key}.mp4`, last: false })),
  ...Object.entries(SEASONS).map(([still, clip]) => ({ key: still, still, file: `${clip}.mp4`, last: true }))];
for (const { key, still, file, last } of jobs) {
  const inFile = join(SRC, file);
  if (!files.includes(file) || (ONLY && !ONLY.includes(key))) continue;
  const lPath = join(STILLS, `${still}-l.webp`), sPath = join(STILLS, `${still}-s.webp`);
  if (!existsSync(lPath)) { console.warn(`нет стилла ${still}-l.webp — пропуск`); continue; }
  const { width: W, height: H } = await sharp(lPath).metadata();
  const sw = (await sharp(sPath).metadata().catch(() => ({ width: W > H ? 720 : 560 }))).width;
  const png = join(TMP, `${key}.png`);
  await run(ff, ['-y', '-v', 'error', ...(last ? ['-sseof', '-0.08', '-i', inFile, '-update', '1'] : ['-i', inFile, '-frames:v', '1']), png]);
  const m = await sharp(png).metadata();
  // кроп по центру под пропорцию стилла, затем ресайз в его размер
  let cw = m.width, ch = Math.round((m.width * H) / W);
  if (ch > m.height) { ch = m.height; cw = Math.round((m.height * W) / H); }
  const crop = { left: Math.round((m.width - cw) / 2), top: Math.round((m.height - ch) / 2), width: cw, height: ch };
  const l = await sharp(png).extract(crop).resize(W, H, { kernel: 'lanczos3' }).webp({ quality: 88, effort: 5 }).toBuffer();
  const s = await sharp(png).extract(crop).resize({ width: sw, kernel: 'lanczos3' }).webp({ quality: 84, effort: 5 }).toBuffer();
  await writeFile(lPath, l); await writeFile(sPath, s);
  console.log(`${still}: из ${file}${last ? ' (последний кадр)' : ''} ${m.width}×${m.height} → ${W}×${H} (${(l.length / 1024).toFixed(0)} КБ) + ${sw}w (${(s.length / 1024).toFixed(0)} КБ)`);
}
