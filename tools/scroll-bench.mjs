#!/usr/bin/env node
// Замер плавности прокрутки всей страницы на компьютере (владелец, 24.10: «с компа прокрутка лагающая»). Headless Chromium 1440×900 dpr 2, без замедления CPU.
//   node tools/scroll-bench.mjs [url=http://localhost:5181/] [секунд на страницу=14] [варианты через запятую]
// Варианты — хвосты запроса: '' (как есть), nofx=all, hero=frames, nofx=dust, nofx=spectral, nofx=glass, nofx=loops, nofx=px.
// Печатает по варианту: rAF к/с, длинных кадров (>34 мс) всего и по зонам (хиро / остальное), худший кадр, смен кадра/с в хиро.
// Видео в headless декодируется программно — цифры хиро в видео-режиме пессимистичны; сравнивать варианты между собой, не с живым Chrome.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
let chromium = null;
for (const base of [path.join(process.cwd(), 'x.mjs'), path.join(os.homedir(), '.claude/skills/xtc-adaptation/scripts/x.mjs')]) { try { ({ chromium } = createRequire(base)('playwright-core')); break; } catch {} }
if (!chromium) { console.error('нет playwright-core'); process.exit(1); }
const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const exe = fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /chromium_headless_shell/.test(d)).sort().reverse().map((d) => path.join(cache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell')).find((p) => fs.existsSync(p)) : undefined;
const URL0 = process.argv[2] || 'http://localhost:5181/';
const SECS = +(process.argv[3] || 14);
const VARS = (process.argv[4] || ',nofx=all,hero=frames,nofx=dust,nofx=spectral,nofx=glass').split(',');
const br = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
for (const v of VARS) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const url = URL0 + (URL0.includes('?') ? '&' : '?') + 'perf=1' + (v ? '&' + v : '') + '&cb=' + Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => { const h = document.querySelector('.ve-hero'); return h && h.classList.contains('is-fly') && window.VE && VE.hero && VE.hero.info && !/грузится/.test(VE.hero.info()); }, null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async (SECS) => {
    const hero = document.querySelector('.ve-hero'), heroEnd = hero.offsetHeight - innerHeight, total = document.documentElement.scrollHeight - innerHeight;
    const frames = [], flips = []; let last = performance.now(); const t0 = last;
    const timer = setInterval(() => { if (scrollY < heroEnd) { const m = /смен кадра (\d+)\/с/.exec(VE.hero.info()); if (m) flips.push(+m[1]); } }, 250);
    await new Promise((res) => { (function step(now) { const dt = now - last; last = now; const k = Math.min(1, (now - t0) / (SECS * 1000)); frames.push([dt, scrollY < heroEnd ? 'hero' : 'rest']); window.scrollTo({ top: total * k, behavior: 'instant' }); if (k < 1) requestAnimationFrame(step); else res(); })(performance.now()); });
    clearInterval(timer);
    const f = frames.slice(2), ms = f.map((x) => x[0]);
    const long = (z) => f.filter((x) => x[1] === z && x[0] > 34).length;
    const mid = flips.length > 4 ? flips.slice(2, -2) : flips;
    return { fps: Math.round(1000 / (ms.reduce((s, x) => s + x, 0) / ms.length)), long: ms.filter((x) => x > 34).length, longHero: long('hero'), longRest: long('rest'), worst: Math.round(Math.max(...ms)), flips: [...mid].sort((a, b) => a - b)[mid.length >> 1] || 0, info: VE.hero.info().split('\n')[1] };
  }, SECS);
  console.log(`${(v || 'как есть').padEnd(14)} rAF ${r.fps} к/с · длинных ${r.long} (хиро ${r.longHero}, остальное ${r.longRest}) · худший ${r.worst} мс · смен кадра/с в хиро ${r.flips} · ${r.info}`);
  await ctx.close();
}
await br.close();
