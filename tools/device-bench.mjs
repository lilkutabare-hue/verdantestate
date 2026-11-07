#!/usr/bin/env node
// Заставка и пролёт на телефоне: WebKit (движок Safari, профиль iPhone) или Chrome (профиль Android), линия режется стендом с полосой.
//   node tools/serve.mjs 5182 --mbps=20        (стенд с полосой; или preview «stand-slow» из .claude/launch.json)
//   node tools/device-bench.mjs [iphone|android|android-lowmem|android-savedata|desktop-safari] [Мбит/с=20] [url=http://localhost:5182/dist/preview.html]
// Печатает: проценты заставки по секундам, вариант видео и причину перехода (VE.hero.why), сдвинулась ли страница в заставке
// (колесо, клавиши, палец — где движок умеет), позицию после вылета логотипа, смены кадра/с при прокрутке пролёта за 8 с, ошибки JS.
// WebKit здесь — macOS-сборка Playwright: движок, CSS, JS и MediaCapabilities как у Safari, но декодер — маковский; живой iPhone всё равно смотреть.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
let pw = null;
for (const base of [path.join(process.cwd(), 'x.mjs'), path.join(os.homedir(), '.claude/skills/xtc-adaptation/scripts/x.mjs')]) { try { pw = createRequire(base)('playwright-core'); break; } catch {} }
if (!pw) { console.error('нет playwright-core'); process.exit(1); }
const [prof = 'iphone', mbps = '20', URL0 = 'http://localhost:5182/dist/preview.html'] = process.argv.slice(2);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const P = {
  iphone: { engine: 'webkit', ctx: { ...pw.devices['iPhone 13'] } },
  'desktop-safari': { engine: 'webkit', ctx: { viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 } },
  android: { engine: 'chromium', cpu: 4, ctx: { ...pw.devices['Pixel 7'] } },
  'android-lowmem': { engine: 'chromium', cpu: 6, mem: 2, ctx: { ...pw.devices['Galaxy S9+'] } },
  'android-savedata': { engine: 'chromium', cpu: 4, saveData: true, ctx: { ...pw.devices['Pixel 7'] } },
}[prof];
if (!P) { console.error('профиль: iphone | android | android-lowmem | android-savedata | desktop-safari'); process.exit(1); }
delete P.ctx.defaultBrowserType;
const origin = new URL(URL0).origin;
const sp = await fetch(origin + '/__mbps?v=' + mbps).then((r) => r.text()).catch(() => '');
if (sp !== String(+mbps)) console.log(`⚠ стенд ${origin} без полосы (нужен node tools/serve.mjs ${new URL(URL0).port} --mbps=${mbps}) — линия не урезана`);
const br = P.engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await br.newContext(P.ctx);
if (P.mem || P.saveData) await ctx.addInitScript(({ mem, saveData }) => {
  if (mem) Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => mem, configurable: true });
  if (saveData) { const c = navigator.connection; if (c) Object.defineProperty(c, 'saveData', { get: () => true, configurable: true }); }
}, { mem: P.mem || 0, saveData: !!P.saveData });
const page = await ctx.newPage();
let cdp = null;
if (P.engine === 'chromium') { cdp = await ctx.newCDPSession(page); if (P.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.cpu }); }
const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160))); page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
const st = () => page.evaluate(() => ({ y: Math.round(scrollY), intro: document.documentElement.classList.contains('ve-intro'), pct: (document.querySelector('.ve-hero__pct') || {}).textContent || '', v: window.VE && VE.hero ? VE.hero.variant : null, why: window.VE && VE.hero ? VE.hero.why || '' : '' })).catch(() => ({}));
const t0 = Date.now();
await page.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'perf=1&cb=' + t0, { waitUntil: 'domcontentloaded', timeout: 60000 });
const touch = !!(P.ctx.hasTouch && cdp);
async function nudge() { // попытки прокрутить страницу, как нетерпеливый посетитель
  if (touch) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] }); for (let k = 1; k <= 5; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 600 - k * 90 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  else { await page.mouse.move(200, 400); await page.mouse.wheel(0, 1200).catch(() => {}); await page.keyboard.press('PageDown').catch(() => {}); }
}
const rows = []; let fly = 0, moved = 0, last = {};
const sec = () => ((Date.now() - t0) / 1000).toFixed(0); // настоящие секунды от начала загрузки, не номер круга (жесты занимают время)
for (let s = 1; s <= 75; s++) {
  await nudge(); await page.waitForTimeout(1000);
  last = await st(); rows.push(`${sec()}:${last.pct || '·'}`);
  if (last.intro && last.y) moved++;
  if (last.intro === false) { fly = ((Date.now() - t0) / 1000).toFixed(1); break; }
}
await page.waitForTimeout(1500);
const after = await st();
await nudge(); await page.waitForTimeout(1200); const ctl = await st(); // контроль: после заставки тот же жест двигает
// пролёт за 8 с: прокрутка в rAF без плавности, «смен кадра/с» из VE.hero.info() каждые 250 мс
const scrub = await page.evaluate(async () => {
  const h = document.querySelector('.ve-hero'), top = h.getBoundingClientRect().top + scrollY, travel = h.offsetHeight - innerHeight;
  scrollTo({ top, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 800));
  const vals = [], frames = []; let lastT = performance.now(); const t0 = performance.now();
  const tm = setInterval(() => { const m = /смен кадра (\d+)\/с/.exec(VE.hero.info()); if (m) vals.push(+m[1]); }, 250);
  await new Promise((res) => { (function step(now) { frames.push(now - lastT); lastT = now; const k = Math.min(1, (now - t0) / 8000); scrollTo({ top: top + travel * 0.66 * k, behavior: 'instant' }); if (k < 1) requestAnimationFrame(step); else res(); })(performance.now()); });
  clearInterval(tm); const mid = vals.slice(2, -2).sort((a, b) => a - b), fm = frames.slice(2);
  return { flips: mid[mid.length >> 1] || 0, fps: Math.round(1000 / (fm.reduce((a, b) => a + b, 0) / fm.length)), worst: Math.round(Math.max(...fm)), info: VE.hero.info().split('\n')[1] };
}).catch((e) => ({ err: e.message.slice(0, 120) }));
console.log(`${prof} (${P.engine}) · ${mbps} Мбит/с · ${URL0}`);
console.log(rows.join(' '));
console.log(fly ? `логотип улетел на ${fly} с · вариант ${after.v}${after.why ? ' · ' + after.why : ''}` : 'за 75 с заставка не отпустила');
console.log(`в заставке страница ${moved ? 'СДВИГАЛАСЬ (' + moved + ' раз)' : 'стояла'}${touch ? ' (палец)' : ' (колесо, PageDown)'} · после вылета y=${after.y} · контрольный жест после → y=${ctl.y}`);
console.log(scrub.err ? 'пролёт: ' + scrub.err : `пролёт за 8 с: смен кадра/с медиана ${scrub.flips}, rAF ${scrub.fps} к/с, худший кадр ${scrub.worst} мс · ${scrub.info}`);
if (errs.length) console.log('ОШИБКИ: ' + [...new Set(errs)].slice(0, 6).join(' | '));
await br.close();
