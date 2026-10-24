#!/usr/bin/env node
// Статический сервер для стенда. Корень = docs/ (ровно как GitHub Pages), /dist/ — собранные блоки и стенд Тильды,
// /tools/ — служебные страницы (рендер стиллов). POST /__save?name=x.png — приёмник кадров от рендера стиллов:
// кладёт PNG в tools/.cache/stills/ (дальше их конвертирует tools/stills.mjs). Без зависимостей. Порт: аргумент или 5181.
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, extname, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 5181;
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
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file;
  if (p.startsWith('/dist/') || p.startsWith('/tools/') || p.startsWith('/node_modules/')) file = join(ROOT, p);
  else file = join(ROOT, 'docs', p === '/' ? '/index.html' : p);
  try { const s = statSync(file); if (s.isDirectory()) file = join(file, 'index.html'); } catch { res.writeHead(404); res.end('404 ' + p); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'content-length': statSync(file).size, 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); // длина — как у GitHub Pages: заставка считает процент по байтам
  createReadStream(file).on('error', () => { res.writeHead(404); res.end(); }).pipe(res);
}).listen(PORT, () => console.log(`stand: http://localhost:${PORT}/  (= docs/ как Pages; /dist/preview.html — стенд Тильды)`));
