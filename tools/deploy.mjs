#!/usr/bin/env node
// Закрытое превью на Cloudflare: сборка → deploy/public (минификация и обфускация inline-кода, без комментариев) → воркер с ключом-ссылкой.
//   node tools/deploy.mjs            собрать deploy/ и показать ссылку
//   node tools/deploy.mjs --publish  собрать и залить (npx wrangler deploy; нужен вход wrangler)
//   node tools/deploy.mjs --new-key  сменить ключ (старые ссылки перестанут работать)
//   node tools/deploy.mjs --assets   залить медиа для Тильды открыто (воркер со статикой verdant-assets.lilkutabare.workers.dev): CORS *, долгий кеш
// Ключ хранится в deploy/.key (папка deploy/ не в git).
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs'), OUT = join(ROOT, 'deploy'), PUB = join(OUT, 'public');
const args = process.argv.slice(2);
const NAME = 'verdant-preview';

// ---------- медиа для Тильды: публичный воркер со статикой (Pages в этой версии wrangler создаётся через воркеры) ----------
if (args.includes('--assets')) {
  const A = join(OUT, 'assets');
  await rm(A, { recursive: true, force: true }); await mkdir(A, { recursive: true });
  await cp(join(DOCS, 'site'), A, { recursive: true });
  await rm(join(A, 'js/garden3d.js'), { force: true });
  // CORS обязателен: сцена грузит кадры с crossOrigin='anonymous'; адреса с ?v= — кеш можно держать долго
  // все адреса в блоках идут с ?v=<сборка>, поэтому долгий кеш безопасен и для манифестов
  await writeFile(join(A, '_headers'), ['/*', '  Access-Control-Allow-Origin: *', '  Cache-Control: public, max-age=31536000, immutable', '  X-Content-Type-Options: nosniff', ''].join('\n'));
  await writeFile(join(A, 'index.html'), '<!doctype html><meta charset=utf-8><meta name=robots content=noindex><title>verdant assets</title>');
  await writeFile(join(A, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  const AW = join(OUT, 'assets-worker'); await mkdir(AW, { recursive: true });
  await writeFile(join(AW, 'wrangler.toml'), `name = "verdant-assets"\ncompatibility_date = "2026-10-01"\n\n[assets]\ndirectory = "../assets"\nnot_found_handling = "none"\n`);
  const { stdout, stderr } = await run('npx', ['--no-install', 'wrangler', 'deploy'], { cwd: AW, maxBuffer: 1e7 });
  console.log((stdout + stderr).split('\n').filter((l) => /Uploaded|Deployed|workers\.dev|Current|rror/i.test(l)).join('\n'));
  console.log('медиа для Тильды: https://verdant-assets.lilkutabare.workers.dev/');
  process.exit(0);
}

// ---------- ключ ----------
await mkdir(OUT, { recursive: true });
const keyFile = join(OUT, '.key');
let KEY = existsSync(keyFile) && !args.includes('--new-key') ? (await readFile(keyFile, 'utf8')).trim() : '';
if (!KEY) { KEY = randomBytes(9).toString('base64url'); await writeFile(keyFile, KEY + '\n'); }

// ---------- страница: комментарии долой, стили и скрипты — минификация с переименованием ----------
let html = await readFile(join(DOCS, 'index.html'), 'utf8');
html = html.replace(/<!--[\s\S]*?-->/g, '');
const minCss = async (css) => (await transform(css, { loader: 'css', minify: true })).code.trim();
const minJs = async (js) => (await transform(js, { loader: 'js', minify: true, target: 'es2018', format: 'iife', legalComments: 'none' })).code.trim();
const styles = [...html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)];
for (const m of styles) html = html.replace(m[0], `<style${m[1]}>${await minCss(m[2])}</style>`);
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)];
for (const m of scripts) { if (!m[2].trim()) continue; html = html.replace(m[0], `<script${m[1]}>${await minJs(m[2])}</script>`); }
html = html.replace(/\n\s+/g, '\n').replace(/>\n</g, '><').replace(/\n{2,}/g, '\n');
html = html.replace('<meta name="robots" content="noindex">', '<meta name="robots" content="noindex,nofollow">');

// ---------- ассеты ----------
await rm(PUB, { recursive: true, force: true }); await mkdir(PUB, { recursive: true });
await cp(join(DOCS, 'site'), join(PUB, 'site'), { recursive: true });
for (const f of await readdir(join(PUB, 'site/js'))) {
  const p = join(PUB, 'site/js', f);
  if (f === 'garden3d.js') { await rm(p); continue; } // старый 3D-сад в превью не нужен
  const code = await readFile(p, 'utf8');
  await writeFile(p, (await transform(code, { loader: 'js', minify: true, target: 'es2018', format: 'esm', legalComments: 'none' })).code);
}
await writeFile(join(PUB, 'index.html'), html);
await writeFile(join(PUB, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

// ---------- воркер ----------
await cp(join(ROOT, 'tools/worker/index.js'), join(OUT, 'worker.js'));
await writeFile(join(OUT, 'wrangler.toml'), `name = "${NAME}"\nmain = "worker.js"\ncompatibility_date = "2026-10-01"\n\n[assets]\ndirectory = "./public"\nbinding = "ASSETS"\nrun_worker_first = true\n\n[vars]\nKEY = "${KEY}"\n`);

const size = async (d) => { let s = 0; for (const f of await readdir(d, { withFileTypes: true })) { const p = join(d, f.name); s += f.isDirectory() ? await size(p) : (await stat(p)).size; } return s; };
console.log(`deploy/public: index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ (было ${(Buffer.byteLength(await readFile(join(DOCS, 'index.html'))) / 1024).toFixed(0)}), всего ${(await size(PUB) / 1048576).toFixed(1)} МБ`);
if (args.includes('--publish')) {
  const { stdout, stderr } = await run('npx', ['--no-install', 'wrangler', 'deploy'], { cwd: OUT, maxBuffer: 1e7 });
  console.log((stdout + stderr).split('\n').filter((l) => /Uploaded|Deployed|workers\.dev|Current|error|Error/i.test(l)).join('\n'));
}
console.log(`\nссылка для показа: https://${NAME}.lilkutabare.workers.dev/?k=${KEY}`);
