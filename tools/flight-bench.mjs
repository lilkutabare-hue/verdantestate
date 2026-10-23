#!/usr/bin/env node
// Замер пролёта хиро: кадры против видео (?hero=video). Headless Chromium, эмуляция iPhone 390×844 dpr 3, CPU ×4, пролёт за N секунд.
//   node tools/flight-bench.mjs [url=http://localhost:5181/] [секунд=3]   (стенд: node tools/serve.mjs)
// Печатает по режимам: rAF к/с, длинные кадры (>34 мс), худший кадр, «смен кадра/с» из VE.hero.info() по ходу прокрутки.
// WebKit эмуляцией не воспроизвести: решение «видео по умолчанию» — по записи экрана с iPhone (tools/rec-frames.py); этот замер — для сравнения правок.
// Прокрутка — behavior:'instant': у сайта html{scroll-behavior:smooth}, иначе каждый scrollTo запускает свою плавную анимацию и замер врёт.
// Нужен playwright-core: ищется здесь, в ~/.claude/skills/xtc-adaptation и ~/.claude/skills.bak/хтс-адаптация; нет — `npm i playwright-core`.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let chromium = null;
for (const base of [path.join(process.cwd(), 'x.mjs'), path.join(os.homedir(), '.claude/skills/xtc-adaptation/scripts/x.mjs'), path.join(os.homedir(), '.claude/skills.bak/хтс-адаптация/scripts/x.mjs')]) {
  try { ({ chromium } = createRequire(base)('playwright-core')); break; } catch {}
}
if (!chromium) { console.error('нет playwright-core: npm i playwright-core'); process.exit(1); }
const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const exe = fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /chromium_headless_shell/.test(d)).sort().reverse().map((d) => path.join(cache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell')).find((p) => fs.existsSync(p)) : undefined;

const URL0 = process.argv[2] || 'http://localhost:5181/';
const SECS = +(process.argv[3] || 3);
const br = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });

// прокрутка пролёта (0 → TL.flight = 0.66 высоты хиро) за SECS секунд; на каждом шаге — scrollTo без плавности
const scrub = async (page, poll) => page.evaluate(async ({ SECS, poll }) => {
  const hero = document.querySelector('.ve-hero'), top = hero.getBoundingClientRect().top + scrollY, travel = hero.offsetHeight - innerHeight, end = top + travel * 0.66;
  const frames = [], vals = []; let last = performance.now(); const t0 = performance.now();
  const timer = poll ? setInterval(() => { const m = /смен кадра (\d+)\/с/.exec(VE.hero.info()); if (m) vals.push(+m[1]); }, 250) : null;
  await new Promise((res) => { (function step(now) { frames.push(now - last); last = now; const k = Math.min(1, (now - t0) / (SECS * 1000)); window.scrollTo({ top: top + (end - top) * k, behavior: 'instant' }); if (k < 1) requestAnimationFrame(step); else res(); })(performance.now()); });
  await new Promise((r) => setTimeout(r, poll ? 600 : 1000));
  if (timer) clearInterval(timer);
  return { frameMs: frames.slice(2), vals, info: VE.hero.info() };
}, { SECS, poll });

const out = {};
for (const mode of ['frames', 'video']) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const url = URL0 + (URL0.includes('?') ? '&' : '?') + 'perf=1' + (mode === 'video' ? '&hero=video' : '') + '&cb=' + Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // ждём: заставка отпустила, серия (или видео) готовы; загрузка без замедления — меряется только прокрутка
  await page.waitForFunction((m) => { const h = document.querySelector('.ve-hero'); if (!h || !h.classList.contains('is-fly') || !window.VE || !VE.hero || !VE.hero.info) return false; const i = VE.hero.info(); return m === 'video' ? /видео \d+ к\/с/.test(i) : /кадров (\d+)\/\1/.test(i); }, mode, { timeout: 40000 }).catch(() => {});
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const a = await scrub(page, false);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(1500);
  const b = await scrub(page, true);
  const fm = a.frameMs, avg = fm.reduce((s, x) => s + x, 0) / fm.length, mid = b.vals.length > 4 ? b.vals.slice(2, -2) : b.vals;
  out[mode] = { rafFps: Math.round(1000 / avg), long34: fm.filter((x) => x > 34).length, worstMs: Math.round(Math.max(...fm)), flipsMedian: [...mid].sort((x, y) => x - y)[mid.length >> 1], flipsMax: Math.max(...b.vals), info: b.info.replace(/\n/g, ' | ') };
  await ctx.close();
}
await br.close();
for (const [m, r] of Object.entries(out)) console.log(`${m.padEnd(7)} rAF ${r.rafFps} к/с · длинных ${r.long34} · худший ${r.worstMs} мс · смен кадра/с: медиана ${r.flipsMedian}, макс ${r.flipsMax}\n        ${r.info}`);
