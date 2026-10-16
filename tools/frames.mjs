#!/usr/bin/env node
// Кадры сцены хиро: media-src/ → docs/site/media/scene/ (webp, две серии: wide 16:9 и tall 9:16) + manifest.json v2.
//
// Вход (media-src/):
//   k1.mp4 k2.mp4 k3.mp4   клипы Kling пролёта (S1→S2, S2→S3, S3→S4); нет клипов — сцена из стиллов (путь A)
//   s1 s2 s3 s4 s5a s5     стиллы (.png/.jpg/.webp); s4 закрывает пролёт, s5a и s5 — превращение «до → после»
//   focus.json             по желанию: ведение кропа 9:16, [[t, x], …], t и x от 0 до 1 (по умолчанию x = .5 весь пролёт)
// Флаги: --src=папка  вход не из media-src/
//        --stills  собрать только из стиллов, даже если клипы есть
//        --per=16  кадров на клип (по умолчанию 16 → 49 кадров на пролёт)
//        --q=72  качество webp (tall на 2 ниже); перевалило за бюджет — снижать
//        --placeholder  пометить серию как временную (превью покажет это в манифесте)
import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile, unlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv.find((x) => x.startsWith('--src=')) ? resolve(process.argv.find((x) => x.startsWith('--src=')).slice(6)) : join(ROOT, 'media-src'), OUT = join(ROOT, 'docs/site/media/scene'), TMP = join(ROOT, 'tools/.cache/frames');
const args = process.argv.slice(2);
const flag = (k) => args.includes('--' + k);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const PER = +opt('per', 16);
const Q = +opt('q', 72);
const WIDE = { w: 1440, h: 810, q: Q }, TALL = { w: 720, h: 1280, q: Q - 2 };

// ---------- ffmpeg: системный, из FFMPEG или из imageio-ffmpeg ----------
async function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { await run('ffmpeg', ['-version']); return 'ffmpeg'; } catch {}
  try { const { stdout } = await run('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']); return stdout.trim(); } catch {}
  throw new Error('ffmpeg не найден: поставь FFMPEG=/путь/к/ffmpeg');
}
async function duration(ff, file) {
  const r = await run(ff, ['-i', file]).catch((e) => e);
  const m = String(r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!m) throw new Error('не прочитал длину ' + file);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}
async function grab(ff, file, t, out, last = false) {
  const a = last ? ['-sseof', '-0.08', '-i', file, '-update', '1'] : ['-ss', t.toFixed(3), '-i', file, '-frames:v', '1'];
  await run(ff, ['-y', '-v', 'error', ...a, out]);
}

// ---------- входные файлы ----------
const files = existsSync(SRC) ? await readdir(SRC) : [];
const still = (name) => { const f = files.find((x) => new RegExp(`^${name}\\.(png|jpe?g|webp)$`, 'i').test(x)); return f ? join(SRC, f) : null; };
const clips = ['k1', 'k2', 'k3'].map((k) => (files.includes(k + '.mp4') ? join(SRC, k + '.mp4') : null));
const useClips = !flag('stills') && clips.every(Boolean);
const need = useClips ? ['s4', 's5a', 's5'] : ['s1', 's2', 's3', 's4', 's5a', 's5'];
const missing = need.filter((n) => !still(n));
if (missing.length) { console.error('нет в media-src/: ' + missing.join(', ')); process.exit(1); }

await rm(TMP, { recursive: true, force: true }); await mkdir(TMP, { recursive: true }); await mkdir(OUT, { recursive: true });

// пролёт: список исходных картинок по порядку
const flight = [];
if (useClips) {
  const ff = await findFfmpeg();
  for (let c = 0; c < 3; c++) {
    const d = await duration(ff, clips[c]);
    for (let i = 0; i < PER; i++) { const p = join(TMP, `k${c + 1}-${String(i).padStart(2, '0')}.png`); await grab(ff, clips[c], (d * i) / PER, p); flight.push(p); }
  }
  flight.push(still('s4')); // финал пролёта — сам стилл S4: на него ровно ложится S5a
  console.log(`клипы: ${PER} кадров на клип + S4 = ${flight.length}`);
} else {
  for (const n of ['s1', 's2', 's3', 's4']) flight.push(still(n));
  console.log('стиллы: S1–S4 (путь A)');
}
const after = [still('s5a'), still('s5')];

// ---------- кроп ----------
let focus = [[0, 0.5], [1, 0.5]];
if (existsSync(join(SRC, 'focus.json'))) focus = JSON.parse(await readFile(join(SRC, 'focus.json'), 'utf8'));
const fx = (t) => { for (let i = 1; i < focus.length; i++) if (t <= focus[i][0]) { const [t0, x0] = focus[i - 1], [t1, x1] = focus[i]; return x0 + ((x1 - x0) * (t - t0)) / Math.max(1e-6, t1 - t0); } return focus[focus.length - 1][1]; };

async function render(src, set, x) {
  const img = sharp(src), m = await img.metadata();
  const s = Math.max(set.w / m.width, set.h / m.height), w = Math.round(m.width * s), h = Math.round(m.height * s);
  const left = Math.round(Math.min(w - set.w, Math.max(0, x * w - set.w / 2))), top = Math.round((h - set.h) / 2);
  return img.resize(w, h, { kernel: 'lanczos3' }).extract({ left, top, width: set.w, height: set.h });
}

const man = { v: 2, n: flight.length, placeholder: flag('placeholder'), source: useClips ? 'clips' : 'stills', sets: { wide: { w: WIDE.w, h: WIDE.h, frames: [], after: [] }, tall: { w: TALL.w, h: TALL.h, frames: [], after: [] } }, poster: { wide: 'poster-wide.webp', tall: 'poster-tall.webp' } };
let total = 0; const bySet = { wide: 0, tall: 0 };
const put = async (pipe, name, q) => { const buf = await pipe.webp({ quality: q, effort: 5 }).toBuffer(); await writeFile(join(OUT, name), buf); total += buf.length; for (const k in bySet) if (name.includes(k)) bySet[k] += buf.length; return buf.length; };

for (let i = 0; i < flight.length; i++) {
  const t = flight.length > 1 ? i / (flight.length - 1) : 0, k = String(i).padStart(2, '0');
  await put(await render(flight[i], WIDE, 0.5), `wide-${k}.webp`, WIDE.q); man.sets.wide.frames.push(`wide-${k}.webp`);
  await put(await render(flight[i], TALL, fx(t)), `tall-${k}.webp`, TALL.q); man.sets.tall.frames.push(`tall-${k}.webp`);
}
for (const [j, src] of after.entries()) {
  const k = ['a', 'b'][j];
  await put(await render(src, WIDE, 0.5), `after-${k}-wide.webp`, WIDE.q); man.sets.wide.after.push(`after-${k}-wide.webp`);
  await put(await render(src, TALL, fx(1)), `after-${k}-tall.webp`, TALL.q); man.sets.tall.after.push(`after-${k}-tall.webp`);
}
// у sharp один resize на конвейер: постер — из готового кропа вторым проходом
const small = async (set, x, w) => sharp(await (await render(flight[0], set, x)).png().toBuffer()).resize(w);
await put(await small(WIDE, 0.5, 960), 'poster-wide.webp', 70);
await put(await small(TALL, fx(0), 540), 'poster-tall.webp', 70);
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');

// старые кадры, которых нет в манифесте, убираем
const keep = new Set([...man.sets.wide.frames, ...man.sets.tall.frames, ...man.sets.wide.after, ...man.sets.tall.after, man.poster.wide, man.poster.tall, 'manifest.json']);
for (const f of await readdir(OUT)) if (!keep.has(f)) await unlink(join(OUT, f));
const mb = (n) => (n / 1048576).toFixed(2) + ' МБ';
console.log(`сцена: ${man.n} кадров пролёта + 2 превращения; wide ${mb(bySet.wide)} (бюджет 4.5), tall ${mb(bySet.tall)} (бюджет 2.2)`);
if (bySet.wide > 4.5 * 1048576 || bySet.tall > 2.2 * 1048576) console.warn('⚠ серия тяжелее бюджета PLAN §5 — перегнать с --q ниже (например --q=60) или --per меньше');
