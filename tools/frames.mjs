#!/usr/bin/env node
// Кадры сцены хиро: media-src/ → docs/site/media/scene/ (webp, две серии: wide 16:9 и tall 9:16) + manifest.json v2.
//
// Вход (media-src/):
//   k1.mp4 k2.mp4 k3.mp4   клипы Kling пролёта (S1→S2, S2→S3, S3→S4); нет клипов — сцена из стиллов (путь A)
//   k4.mp4                 ночной луп (start = end = S5) → scene/loop.mp4, играет поверх финального кадра
//   k4v.mp4                ночной луп 9:16 (start = end = S5v) → scene/loop-tall.mp4, на вертикальных экранах вместо loop.mp4
//   k1v k2v k3v.mp4 + s4v s5av s5v   вертикальная серия 9:16 для телефона (prompts §6.1); нет — tall кропом из 16:9
//   s1 s2 s3 s4 s5a s5     стиллы (.png/.jpg/.webp); s4 закрывает пролёт, s5a и s5 — превращение «до → после»
//   focus.json             по желанию: ведение кропа 9:16, [[t, x], …], t и x от 0 до 1 (по умолчанию x = .5 весь пролёт)
// Флаги: --src=папка  вход не из media-src/
//        --stills  собрать только из стиллов, даже если клипы есть
//        --per=24  кадров на клип (по умолчанию 24 → 73 кадра на пролёт: меньше — слайд-шоу)
//        --fmt=avif|webp  формат кадров (avif вдвое легче при том же виде; по умолчанию avif)
//        --q=72  качество webp (tall на 2 ниже); перевалило за бюджет — снижать
//        --tallw=720  ширина tall-кадра (600 для лёгкой серии телефона)
//        --placeholder  пометить серию как временную (превью покажет это в манифесте)
//        --no-video  не собирать видео пролёта (flight-tall.mp4: все кадры клипов 24 к/с одним файлом для телефона, ?hero=video)
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
const PER = +opt('per', 24);
const FMT = opt('fmt', 'avif');
const TFMT = opt('tallfmt', FMT); // формат tall-серии отдельно: jpg — аппаратный декод на iPhone (WebP в WebKit декодируется программно)
const Q = +opt('q', FMT === 'avif' ? 52 : 72);
const TW = +opt('tallw', 720); // ширина tall-кадра: на телефоне холст не крупнее 1.5× ширины экрана, 600 хватает и весит на треть меньше
const WIDE = { w: 1440, h: 810, q: Q }, TALL = { w: TW, h: Math.round((TW * 16) / 9), q: Q - 2 };

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

// пролёт: список исходных картинок по порядку.
// Из клипов: PER кадров на клип + финальный стилл; последние RAMP кадров каждого клипа растворяются
// в первый кадр следующего (или в финальный стилл) — Kling доезжает до энд-кадра неточно (К3 → S4 ≈ 7/255).
async function extractFlight(ff, clipList, tag, size, finalStill) {
  const out = [], firstOf = [], RAMP = 4;
  for (let c = 0; c < clipList.length; c++) {
    const d = await duration(ff, clipList[c]);
    for (let i = 0; i < PER; i++) { const p = join(TMP, `${tag}${c + 1}-${String(i).padStart(2, '0')}.png`); await grab(ff, clipList[c], (d * i) / PER, p); out.push(p); if (i === 0) firstOf.push(p); }
  }
  out.push(finalStill);
  for (let c = 0; c < clipList.length; c++) {
    const target = c < clipList.length - 1 ? firstOf[c + 1] : finalStill;
    const tgt = await sharp(target).resize(size[0], size[1], { fit: 'fill' }).png().toBuffer();
    for (let k = 1; k <= RAMP; k++) {
      const idx = (c + 1) * PER - k, alpha = 1 - k / (RAMP + 1);
      const base = await sharp(out[idx]).resize(size[0], size[1], { fit: 'fill' }).png().toBuffer();
      const over = await sharp(tgt).ensureAlpha(alpha).png().toBuffer();
      const o = join(TMP, `${tag}${c + 1}-${String(PER - k).padStart(2, '0')}-r.png`);
      await sharp(base).composite([{ input: over }]).png().toFile(o);
      out[idx] = o;
    }
  }
  return out;
}
const flight = []; let manLoop = null, manLoopTall = null, tallFlight = null, tallAfter = null;
if (useClips) {
  const ff = await findFfmpeg();
  flight.push(...(await extractFlight(ff, clips, 'k', [1928, 1072], still('s4'))));
  console.log(`клипы: ${PER} кадров на клип + S4 = ${flight.length}, стыки сглажены`);
  // вертикальная серия для телефона: k1v..k3v.mp4 (9:16) + стиллы s4v, s5av, s5v — вместо кропа из 16:9
  const vclips = ['k1v', 'k2v', 'k3v'].map((k) => (files.includes(k + '.mp4') ? join(SRC, k + '.mp4') : null));
  if (vclips.every(Boolean) && still('s4v') && still('s5av') && still('s5v')) {
    tallFlight = await extractFlight(ff, vclips, 'v', [1080, 1920], still('s4v'));
    tallAfter = [still('s5av'), still('s5v')];
    console.log(`вертикальные клипы: ${tallFlight.length} кадров 9:16 — телефон получает полный кадр`);
  } else console.log('вертикальных клипов нет — tall-серия кропом из 16:9 (см. prompts-magnific.md §6.1)');
  // ночной луп поверх финала
  if (files.includes('k4.mp4')) {
    await run(ff, ['-y', '-v', 'error', '-i', join(SRC, 'k4.mp4'), '-an', '-vf', 'scale=1440:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, 'loop.mp4')]);
    manLoop = 'loop.mp4';
  }
  // вертикальный ночной луп для телефона (prompts-vertical §5): k4v.mp4 → scene/loop-tall.mp4, 720 по ширине
  if (files.includes('k4v.mp4')) {
    await run(ff, ['-y', '-v', 'error', '-i', join(SRC, 'k4v.mp4'), '-an', '-vf', 'scale=720:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, 'loop-tall.mp4')]);
    manLoopTall = 'loop-tall.mp4';
    console.log('луп телефона: scene/loop-tall.mp4');
    console.log('луп: scene/loop.mp4', ((await import('node:fs/promises')).stat(join(OUT, 'loop.mp4')).then((s) => (s.size / 1024).toFixed(0) + ' КБ').then(console.log), ''));
  }
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

const man = { v: 2, n: flight.length, placeholder: flag('placeholder'), source: useClips ? 'clips' : 'stills', loop: manLoop, loopTall: manLoopTall, sets: { wide: { w: WIDE.w, h: WIDE.h, frames: [], after: [] }, tall: { w: TALL.w, h: TALL.h, frames: [], after: [] } }, poster: { wide: 'poster-wide.webp', tall: 'poster-tall.webp' } };
let total = 0; const bySet = { wide: 0, tall: 0 };
const extOf = (f) => (f === 'avif' ? 'avif' : f === 'jpg' ? 'jpg' : 'webp');
const EXT = extOf(FMT), TEXT = extOf(TFMT);
const encAs = (f, pipe, q) => (f === 'avif' ? pipe.avif({ quality: q, effort: 4 }) : f === 'jpg' ? pipe.jpeg({ quality: q + 8, mozjpeg: true, chromaSubsampling: '4:2:0' }) : pipe.webp({ quality: q, effort: 5 }));
const enc = (pipe, q) => encAs(FMT, pipe, q);
const put = async (pipe, name, q) => { const buf = await (name.startsWith('tall') || name.endsWith('-tall.' + TEXT) ? encAs(TFMT, pipe, q) : enc(pipe, q)).toBuffer(); await writeFile(join(OUT, name), buf); total += buf.length; for (const k in bySet) if (name.includes(k)) bySet[k] += buf.length; return buf.length; };

for (let i = 0; i < flight.length; i++) {
  const k = String(i).padStart(2, '0');
  await put(await render(flight[i], WIDE, 0.5), `wide-${k}.${EXT}`, WIDE.q); man.sets.wide.frames.push(`wide-${k}.${EXT}`);
}
const tSrc = tallFlight || flight;
for (let i = 0; i < tSrc.length; i++) {
  const t = tSrc.length > 1 ? i / (tSrc.length - 1) : 0, k = String(i).padStart(2, '0');
  await put(await render(tSrc[i], TALL, tallFlight ? 0.5 : fx(t)), `tall-${k}.${TEXT}`, TALL.q); man.sets.tall.frames.push(`tall-${k}.${TEXT}`);
}
for (const [j, src] of after.entries()) {
  const k = ['a', 'b'][j];
  await put(await render(src, WIDE, 0.5), `after-${k}-wide.${EXT}`, WIDE.q); man.sets.wide.after.push(`after-${k}-wide.${EXT}`);
}
for (const [j, src] of (tallAfter || after).entries()) {
  const k = ['a', 'b'][j];
  await put(await render(src, TALL, tallAfter ? 0.5 : fx(1)), `after-${k}-tall.${TEXT}`, TALL.q); man.sets.tall.after.push(`after-${k}-tall.${TEXT}`);
}
// у sharp один resize на конвейер: постер — из готового кропа вторым проходом
const small = async (set, x, w) => sharp(await (await render(flight[0], set, x)).png().toBuffer()).resize(w);
await put(await small(WIDE, 0.5, 960), 'poster-wide.webp', 70);
await put(sharp(await (await render(tSrc[0], TALL, tallFlight ? 0.5 : fx(0))).png().toBuffer()).resize(540), 'poster-tall.webp', 70);
// ---------- видео пролёта для телефона: все кадры клипов (24 к/с) одним H.264 ----------
// Картинками телефон получает 97 кадров из 723 (≈3 к/с движения камеры, 4.4 МБ); видео — все 723 за ~4 МБ, декод аппаратный.
// Ключевой кадр каждые 8 кадров, без B-кадров: перемотка декодирует не больше 7 кадров. Стыки клипов и выход в S4 — растворением 0.5 с.
let manVideo = null;
if (useClips && !flag('no-video')) {
  const ff = await findFfmpeg();
  const vc = tallFlight ? ['k1v', 'k2v', 'k3v'].map((k) => join(SRC, k + '.mp4')) : clips;
  const fin = tallFlight ? still('s4v') : still('s4');
  const X = 0.5, FPS = 24, VW = 480, VH = 854;
  const durs = []; for (const c of vc) durs.push(await duration(ff, c));
  // кроп как у кадров (render): вписать по высоте и взять середину — иначе на стыке видео → стилл S4 кадр сдвигается
  const norm = `scale=-2:${VH}:flags=lanczos,crop=${VW}:${VH}`;
  const prep = (i) => `[${i}:v]fps=${FPS},${norm},setsar=1,format=yuv420p,settb=AVTB[v${i}]`;
  const parts = [0, 1, 2, 3].map(prep);
  let len = durs[0], prev = 'v0';
  for (let i = 1; i <= 3; i++) {
    const d = i < 3 ? durs[i] : X + 2 / FPS;
    parts.push(`[${prev}][v${i}]xfade=transition=fade:duration=${X}:offset=${(len - X).toFixed(4)}[x${i}]`);
    len = len + d - X; prev = 'x' + i;
  }
  const out = join(OUT, 'flight-tall.mp4');
  await run(ff, ['-y', '-v', 'error', ...vc.flatMap((c) => ['-i', c]), '-loop', '1', '-framerate', String(FPS), '-t', (X + 2 / FPS).toFixed(4), '-i', fin,
    '-filter_complex', parts.join(';'), '-map', `[${prev}]`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-g', '8', '-keyint_min', '8', '-bf', '0', '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { maxBuffer: 1e7 });
  const st = await (await import('node:fs/promises')).stat(out);
  manVideo = { tall: { src: 'flight-tall.mp4', fps: FPS, dur: +len.toFixed(4), w: VW, h: VH } };
  console.log(`видео пролёта: scene/flight-tall.mp4 · ${Math.round(len * FPS)} кадров · ${(st.size / 1048576).toFixed(2)} МБ${existsSync(join(SRC, 'focus.json')) && !tallFlight ? ' · ⚠ focus.json в видео не учтён — кроп по центру' : ''}`);
  if (st.size > 5 * 1048576) console.warn('⚠ видео тяжелее 5 МБ — лимит Тильды на файл; поднять --crf или ужать');
}
if (manVideo) man.video = manVideo;
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');

// старые кадры, которых нет в манифесте, убираем
const keep = new Set([...man.sets.wide.frames, ...man.sets.tall.frames, ...man.sets.wide.after, ...man.sets.tall.after, man.poster.wide, man.poster.tall, 'manifest.json', manLoop, manLoopTall, manVideo && manVideo.tall.src].filter(Boolean));
for (const f of await readdir(OUT)) if (!keep.has(f)) await unlink(join(OUT, f));
const mb = (n) => (n / 1048576).toFixed(2) + ' МБ';
console.log(`сцена: ${man.n} кадров пролёта + 2 превращения; wide ${mb(bySet.wide)} (бюджет 4.5), tall ${mb(bySet.tall)} (бюджет 2.2)`);
if (bySet.wide > 4.5 * 1048576 || bySet.tall > 2.2 * 1048576) console.warn('⚠ серия тяжелее бюджета PLAN §5 — перегнать с --q ниже (например --q=60) или --per меньше');
