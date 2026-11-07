#!/usr/bin/env node
// Статический сервер для стенда. Корень = docs/ (ровно как GitHub Pages), /dist/ — собранные блоки и стенд Тильды,
// /tools/ — служебные страницы (рендер стиллов). POST /__save?name=x.png — приёмник кадров от рендера стиллов:
// кладёт PNG в tools/.cache/stills/ (дальше их конвертирует tools/stills.mjs). Без зависимостей. Порт: аргумент или 5181.
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve, dirname, join, extname, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 5181;
// --mbps=20 — урезанная линия для любого браузера (WebKit/Safari без CDP): одна общая полоса на все ответы, поровну между
// активными загрузками, плюс 60 мс на запрос; запуск вторым стендом, например: node tools/serve.mjs 5182 --mbps=20
let MBPS = +((process.argv.find((a) => a.startsWith('--mbps=')) || '').split('=')[1] || 0); // GET /__mbps?v=15 — сменить на ходу (только у стенда с полосой)
const active = new Set();
if (MBPS) setInterval(() => { const list = [...active]; if (!list.length) return; const share = (MBPS * 1e6) / 8 * 0.02 / list.length; for (const st of list) st.give(share); }, 20);
function send(file, res, start, end) { // байты [start, end] файла: без полосы — потоком, с полосой — порциями по токенам
  if (!MBPS) { createReadStream(file, { start, end }).on('error', () => res.end()).pipe(res); return; }
  const fd = openSync(file, 'r'); let pos = start, allow = 0, done = false;
  const fin = () => { if (done) return; done = true; active.delete(st); try { closeSync(fd); } catch {} };
  const st = { give(n) { allow += n; while (!done && pos <= end && allow >= 1 && !res.writableNeedDrain) { const len = Math.min(65536, end - pos + 1, Math.floor(allow)); const b = Buffer.allocUnsafe(len); readSync(fd, b, 0, len, pos); pos += len; allow -= len; res.write(b); } if (!done && pos > end) { fin(); res.end(); } } };
  res.on('close', fin); setTimeout(() => { if (!done) active.add(st); }, 60);
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const SAVE_DIR = join(ROOT, 'tools/.cache/stills');

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/__save') {
    const name = basename(url.searchParams.get('name') || '').replace(/[^a-z0-9-]/g, '');
    if (!name) { res.writeHead(400); res.end('name'); return; }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { mkdirSync(SAVE_DIR, { recursive: true }); const f = join(SAVE_DIR, name + '.png'); writeFileSync(f, Buffer.concat(chunks)); res.writeHead(200, { 'access-control-allow-origin': '*' }); res.end('ok ' + f); console.log('saved', name, Buffer.concat(chunks).length); });
    return;
  }
  if (url.pathname === '/__mbps' && MBPS) { const v = +url.searchParams.get('v'); if (v > 0) MBPS = v; res.writeHead(200, { 'access-control-allow-origin': '*' }); res.end(String(MBPS)); return; }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file;
  if (p.startsWith('/dist/') || p.startsWith('/tools/') || p.startsWith('/node_modules/')) file = join(ROOT, p);
  else file = join(ROOT, 'docs', p === '/' ? '/index.html' : p);
  try { const s = statSync(file); if (s.isDirectory()) file = join(file, 'index.html'); } catch { res.writeHead(404); res.end('404 ' + p); return; }
  // длина и Range — как у GitHub Pages: заставка считает процент по байтам, а Safari без ответа 206 на Range видео не играет
  const size = statSync(file).size, head = { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'accept-ranges': 'bytes' };
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rg && (rg[1] || rg[2])) {
    let a = rg[1] ? +rg[1] : size - +rg[2], b = rg[1] && rg[2] ? Math.min(+rg[2], size - 1) : size - 1;
    if (a < 0) a = 0; if (a >= size || a > b) { res.writeHead(416, { ...head, 'content-range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(206, { ...head, 'content-length': b - a + 1, 'content-range': `bytes ${a}-${b}/${size}` });
    if (req.method === 'HEAD') { res.end(); return; } send(file, res, a, b); return;
  }
  res.writeHead(200, { ...head, 'content-length': size });
  if (req.method === 'HEAD' || !size) { res.end(); return; } send(file, res, 0, size - 1);
}).listen(PORT, () => console.log(`stand: http://localhost:${PORT}/  (= docs/ как Pages; /dist/preview.html — стенд Тильды)` + (MBPS ? ` · линия ${MBPS} Мбит/с` : '')));
