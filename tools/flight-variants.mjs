#!/usr/bin/env node
// Варианты видео пролёта по кодекам (07.11; владелец: «загрузка до 30 с, качество моушна не терять»).
// Из тех же клипов, что frames.mjs (k1..k3 + финальный стилл s4, k1v..k3v + s4v), в родном размере собирает:
//   hevc — x265, тег hvc1 (Safari и iPhone все, Chrome на Mac/Windows с аппаратным декодом) — первый выбор: перемотка скроллом ровнее всех (60 смен кадра/с)
//   hevcm — тот же HEVC, crf 25 (на 45 % легче): средняя ступень для линий ~15 Мбит/с, её декодируют все iPhone (AV1 — только 15 Pro и новее);
//           1080p на 38,0 дБ лучше 720p-запасного, который растягивается на экран (замер на К2 — журнал 07.11, ночь)
//   av1  — SVT-AV1 crf 24 (аппаратный декод: Apple M3+/A17 Pro+, свежие ПК) — для устройств без HEVC (Firefox с аппаратным AV1 и т. п.)
//   h264 — x264 (декодирует всё)
//   lite — x264 720p: запасной для медленной линии, сцена переходит на него сама, если основной не успевает к 27-й секунде
//   mini — x264 540p (12.11; владелец: «поч так долго грузится сайт, это не норм»): лёгкая копия всего пролёта для быстрого входа — сцена открывает страницу
//          на ней и на фоне подменяет её качественным вариантом (scene.js upgrade); ключевой кадр каждые 24: на 540p декод дешёвый
// и пишет их в media/scene/manifest.json → video.<tall|wide>.variants (сцена выбирает лучший декодируемый, scene.js chooseVariants).
// Запуск после frames.mjs (тот пересобирает манифест):  node tools/flight-variants.mjs [--only=tall|wide] [--clean] [--ids=hevc,hevcm,av1,h264,lite,mini] [--crf-av1=24] [--crf-hevc=21] [--crf-hevcm=25] [--crf-h264=20] [--crf-lite=22]
// Ключевой кадр: телефон каждые 12 кадров, компьютер — 24 (перемотка скроллом декодирует не больше GOP−1 кадров); B-кадров у x264/x265 нет.
import { readFile, writeFile, stat, unlink, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'media-src'), OUT = join(ROOT, 'docs/site/media/scene');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const FF = process.env.FFMPEG || (await run('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'])).stdout.trim();
const FPS = 24;
async function duration(f) { const r = await run(FF, ['-i', f]).catch((e) => e); const m = String(r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3]; }
const CRF = { av1: +opt('crf-av1', 24), hevc: +opt('crf-hevc', 21), hevcm: +opt('crf-hevcm', 25), h264: +opt('crf-h264', 20), lite: +opt('crf-lite', 22), mini: +opt('crf-mini', 25) };
const SETS = {
  tall: { clips: ['k1v', 'k2v', 'k3v'], fin: 's4v', w: 1080, h: 1920, lw: 720, lh: 1280, mw: 540, mh: 960, g: 12 },
  wide: { clips: ['k1', 'k2', 'k3'], fin: 's4', w: 1920, h: 1080, lw: 1280, lh: 720, mw: 960, mh: 540, g: 24 },
};
const enc = {
  av1: (g, crf) => ['-c:v', 'libsvtav1', '-preset', '5', '-crf', String(crf), '-g', String(g), '-svtav1-params', 'tune=0:scd=0'],
  hevc: (g, crf) => ['-c:v', 'libx265', '-preset', 'slow', '-crf', String(crf), '-tag:v', 'hvc1', '-x265-params', `keyint=${g}:min-keyint=${g}:bframes=0:scenecut=0:log-level=error`],
  h264: (g, crf) => ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'film', '-crf', String(crf), '-g', String(g), '-keyint_min', String(g), '-bf', '0', '-sc_threshold', '0'],
};
// строки кодеков для MediaCapabilities/canPlayType (профиль и уровень с запасом для 1080p24)
const MIME = { av1: 'video/mp4; codecs="av01.0.08M.08"', hevc: 'video/mp4; codecs="hvc1.1.6.L123.90"', hevcm: 'video/mp4; codecs="hvc1.1.6.L123.90"', h264: 'video/mp4; codecs="avc1.640028"', lite: 'video/mp4; codecs="avc1.64001F"', mini: 'video/mp4; codecs="avc1.64001F"' };
const manPath = join(OUT, 'manifest.json'); const man = JSON.parse(await readFile(manPath, 'utf8'));
const only = opt('only', ''), IDS = opt('ids', 'hevc,hevcm,av1,h264,lite,mini').split(','); // --ids=av1 — перекодировать только эти, остальные варианты в манифесте не трогать
for (const [name, S] of Object.entries(SETS)) {
  if (only && only !== name) continue;
  const clips = S.clips.map((c) => join(SRC, c + '.mp4')), fin = ['png', 'jpg', 'webp'].map((e) => join(SRC, `${S.fin}.${e}`)).find(existsSync);
  if (!clips.every(existsSync) || !fin) { console.log(`${name}: нет клипов или ${S.fin} — пропуск`); continue; }
  const durs = []; for (const c of clips) durs.push(await duration(c));
  const hold = 2 / FPS, len = durs.reduce((a, b) => a + b, 0) + hold;
  const prev = (man.video[name] && man.video[name].variants) || [], variants = [];
  for (const id of ['hevc', 'hevcm', 'av1', 'h264', 'lite', 'mini']) {
    if (!IDS.includes(id)) { const old = prev.find((x) => x.id === id); if (old) variants.push(old); continue; }
    const W = id === 'lite' ? S.lw : id === 'mini' ? S.mw : S.w, H = id === 'lite' ? S.lh : id === 'mini' ? S.mh : S.h, codec = id === 'lite' || id === 'mini' ? 'h264' : id === 'hevcm' ? 'hevc' : id;
    const norm = `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`;
    const graph = [...clips.map((_, i) => i), clips.length].map((i) => `[${i}:v]fps=${FPS},${norm},setsar=1,format=yuv420p,settb=AVTB[v${i}]`);
    graph.push(Array.from({ length: clips.length + 1 }, (_, i) => `[v${i}]`).join('') + `concat=n=${clips.length + 1}:v=1:a=0[x]`);
    const file = `flight-${name}-${id}.mp4`, out = join(OUT, file), t0 = Date.now();
    await run(FF, ['-y', '-v', 'error', ...clips.flatMap((c) => ['-i', c]), '-loop', '1', '-framerate', String(FPS), '-t', hold.toFixed(4), '-i', fin,
      '-filter_complex', graph.join(';'), '-map', '[x]', '-an', ...enc[codec](id === 'mini' ? 24 : S.g, CRF[id]), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { maxBuffer: 1e8 });
    const bytes = (await stat(out)).size;
    variants.push({ id, src: file, bytes, mime: MIME[id], w: W, h: H, kbps: Math.round((bytes * 8) / len / 1000), crf: CRF[id] });
    console.log(`${file}: ${W}×${H} ${codec} crf ${CRF[id]} · ${(bytes / 1048576).toFixed(1)} МБ · ${Math.round((bytes * 8) / len / 1000)} кбит/с · ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  }
  const v = man.video[name] || (man.video[name] = { fps: FPS });
  const h264 = variants.find((x) => x.id === 'h264');
  Object.assign(v, { src: h264.src, bytes: h264.bytes, w: h264.w, h: h264.h, dur: +len.toFixed(4), fps: FPS, variants });
  delete v.parts;
}
await writeFile(manPath, JSON.stringify(man, null, 2) + '\n');
// старые цельные файлы пролёта (flight-tall.mp4 / flight-wide.mp4, H.264 crf 18) убирать только с --clean: пока на Тильде старые блоки, живой сайт берёт их с Pages
const used = new Set(Object.values(man.video).flatMap((x) => [x.src, ...(x.variants || []).map((y) => y.src)]));
if (args.includes('--clean')) for (const f of await readdir(OUT)) if (/^flight-.*\.mp4$/.test(f) && !used.has(f)) { await unlink(join(OUT, f)); console.log('убран', f); }
console.log('manifest.json: варианты записаны');
