#!/usr/bin/env node
// Заставка на медленной линии: проценты по секундам и момент вылета логотипа. Headless Chromium, сеть урезана через CDP.
//   node tools/preload-bench.mjs [url=http://localhost:5181/dist/remote.html] [Мбит/с=10] [phone|desktop=phone]
// dist/remote.html — HEAD и блоки из dist/ как на Тильде, медиа — с хоста из docs/media-base.txt (собирается вместе со сборкой проверки).
// Печатает строку «секунда: процент», момент is-fly и что сцена знала о видео в этот момент. Ждёт до 120 с.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
let chromium = null;
for (const base of [path.join(process.cwd(), 'x.mjs'), path.join(os.homedir(), '.claude/skills/xtc-adaptation/scripts/x.mjs')]) { try { ({ chromium } = createRequire(base)('playwright-core')); break; } catch {} }
if (!chromium) { console.error('нет playwright-core'); process.exit(1); }
const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const exe = fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /chromium_headless_shell/.test(d)).sort().reverse().map((d) => path.join(cache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell')).find((p) => fs.existsSync(p)) : undefined;
const URL0 = process.argv[2] || 'http://localhost:5181/dist/remote.html';
const MBPS = +(process.argv[3] || 10);
const PHONE = (process.argv[4] || 'phone') === 'phone';
const br = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await br.newContext(PHONE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: (MBPS * 1e6) / 8, uploadThroughput: 1e6 / 8 });
const t0 = Date.now();
await page.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'perf=1&cb=' + t0, { waitUntil: 'domcontentloaded' });
const rows = []; let flew = null;
for (let s = 1; s <= 120; s++) {
  await page.waitForTimeout(1000);
  const st = await page.evaluate(() => { const h = document.getElementById('ve-hero'), p = document.querySelector('.ve-hero__pct'); return { pct: p ? p.textContent : '', fly: h.classList.contains('is-fly'), info: window.VE && VE.hero && VE.hero.info ? VE.hero.info().split('\n')[1] : '' }; });
  rows.push(`${s}:${st.pct || '·'}`);
  if (st.fly && !flew) { flew = { s, info: st.info }; break; }
}
console.log(`${PHONE ? 'телефон' : 'компьютер'} · ${MBPS} Мбит/с · ${URL0}`);
console.log(rows.join(' '));
console.log(flew ? `логотип улетел на ${flew.s} с · ${flew.info}` : 'за 120 с заставка не отпустила');
await br.close();
