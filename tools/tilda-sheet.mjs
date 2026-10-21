#!/usr/bin/env node
// Лист заливки в Тильду: node tools/tilda-sheet.mjs → dist/ЗАЛИТЬ.html (в git не идёт)
//
// Одна самодостаточная страница (открывается двойным щелчком): HEAD сайта и блоки 01–15 по порядку, на каждый —
// кнопка «Копировать», файл из dist байт в байт. Номер сборки сверху; отметки «залито» помнит, пока сборка та же.
// Запускать после node tools/build.mjs. Медиа для блоков — node tools/deploy.mjs --assets.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist'), OUT = join(DIST, 'ЗАЛИТЬ.html');
const read = (f) => readFileSync(join(DIST, f), 'utf8');
const build = (read('head.html').match(/сборка (\w+)/) || [])[1] || '?';
const NAMES = { '01': 'Шапка', '02': 'Хиро — пролёт и превращение', '03': 'Что мы берём на себя', '04': 'Как проходит сезон', '05': 'Тарифы', '06': 'Конструктор', '07': 'Экономика', '08': 'Разовые работы', '09': 'Сад под ключ', '10': 'До и после', '11': 'Круглый год', '12': 'Вопросы', '13': 'Специальные условия', '14': 'Форма', '15': 'Подвал' };
const blocks = readdirSync(DIST).filter((f) => /^t123-\d\d\.html$/.test(f)).sort();
const items = [{ f: 'head.html', n: 'H', name: 'HEAD сайта', where: 'Настройки сайта → Ещё → «HTML-код для вставки внутрь head». Заменить целиком.' }]
  .concat(blocks.map((f) => { const n = f.slice(5, 7); return { f, n, name: NAMES[n] || f, where: 'Блок T123 «HTML-код»' }; }))
  .concat([['policy', 'П', 'Политика обработки персональных данных', '/policy'], ['consent', 'С', 'Согласие на обработку персональных данных', '/consent']]
    .filter(([n]) => readdirSync(DIST).includes(`t123-${n}.html`))
    .map(([n, mark, name, path]) => ({ f: `t123-${n}.html`, n: mark, name, where: `Отдельная страница, адрес ${path}, один блок T123; шапку можно поставить блоком 01` })));
for (const it of items) { it.t = read(it.f); it.kb = (Buffer.byteLength(it.t) / 1024).toFixed(1); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// содержимое блоков — строками JS: закрывающие теги и начало комментария экранируем, иначе оборвут скрипт
const js = (s) => JSON.stringify(s).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--').split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');

const rows = items.map((it, i) => `<div class="row" id="b${i}"><b>${esc(it.n)}</b><span><i>${esc(it.name)}</i><small>${esc(it.where)} · ${esc(it.f)} · ${it.kb} КБ</small></span><button type="button" data-i="${i}">Копировать</button></div>`).join('');
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verdant · залить в Тильду</title><style>
:root{--bg:#FBFAF6;--card:#fff;--ink:#1B462A;--txt:#26332A;--mut:#617A66;--line:rgba(27,70,42,.14);--br:#A8874F;--ok:#2E7D46}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--txt);font:16px/1.45 -apple-system,"Segoe UI",Roboto,sans-serif;padding:28px 16px 64px;max-width:780px;margin:0 auto}
h1{font-size:26px;color:var(--ink);letter-spacing:-.01em}.sub{color:var(--mut);margin:6px 0 18px;font-size:14px}
ol{margin:0 0 22px 20px;display:grid;gap:6px;font-size:15px}ol b{color:var(--ink)}
.row{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:8px}
.row b{flex:none;width:30px;font:700 18px/1 ui-monospace,Menlo,monospace;color:var(--br);text-align:center}.row span{flex:1;min-width:0}.row i{display:block;font-style:normal;font-weight:600}.row small{display:block;color:var(--mut);font-size:12.5px;margin-top:2px}
button{flex:none;font:600 14px -apple-system,sans-serif;border:1px solid var(--ink);color:var(--ink);background:none;border-radius:999px;padding:9px 16px;cursor:pointer}button:hover{background:var(--ink);color:#fff}
.row.done{opacity:.55}.row.done button{border-color:var(--ok);color:var(--ok)}.row.done button::after{content:" ✓"}
.tip{margin-top:22px;padding:12px 14px;border-radius:12px;background:#F2EFE6;font-size:14px;color:var(--txt)}
</style></head><body>
<h1>Залить в Тильду</h1>
<p class="sub">Сборка ${esc(build)} · ${items.length} вставок · медиа: verdant-assets.lilkutabare.workers.dev</p>
<ol>
<li>Новая страница → в настройках страницы <b>выключить шапку и подвал Тильды</b>, фон белый.</li>
<li><b>H</b> — вставить в «Настройки сайта → Ещё → HTML-код для вставки внутрь head» (один раз на весь сайт).</li>
<li>Добавить <b>15 блоков T123 «HTML-код»</b> подряд, в каждый — свой код по порядку 01 → 15. Отступы блоков сверху и снизу — 0.</li>
<li>Ещё две страницы: адрес <b>/policy</b> — блок <b>П</b>, адрес <b>/consent</b> — блок <b>С</b> (по одному T123, шапка и подвал Тильды выключены).</li>
<li>Опубликовать все три страницы. Открыть с телефона, пролистать до конца, нажать ссылки в форме и подвале.</li>
</ol>
${rows}
<p class="tip">Кнопка копирует код целиком, вставлять в пустой блок через Cmd+V. Отметка «✓» запоминается, пока сборка та же. После новой сборки лист пересобирается командой <b>node tools/tilda-sheet.mjs</b>.</p>
<script>
var D=[${items.map((it) => js(it.t)).join(',')}],K='ve-sheet-${esc(build)}',done={};
try{done=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
function mark(i){var r=document.getElementById('b'+i);if(r)r.classList.add('done');done[i]=1;try{localStorage.setItem(K,JSON.stringify(done))}catch(e){}}
Object.keys(done).forEach(mark);
document.addEventListener('click',function(e){var b=e.target.closest('button[data-i]');if(!b)return;var i=+b.dataset.i,t=D[i];
  var ok=function(){mark(i);b.textContent='Скопировано';setTimeout(function(){b.textContent='Копировать'},1600)};
  var fb=function(){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(_){}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()});
</script></body></html>`;
writeFileSync(OUT, html);
// стенд «как Тильда, но медиа с публичного хостинга»: блоки dist без подмены адресов, в обёртках Тильды → /dist/remote.html на стенде
const head = read('head.html');
const wrap = blocks.map((f) => `<div class="r t-rec"><div class="t123"><div class="t-container_100"><div class="t-width t-width_100">${read(f)}</div></div></div></div>`).join('\n');
writeFileSync(join(DIST, 'remote.html'), `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>стенд Тильды · удалённые медиа</title>${head}<style>body{margin:0}.t-rec{position:relative}</style></head><body class="t-body"><div id="allrecords" class="t-records">${wrap}</div></body></html>`);
console.log(`dist/ЗАЛИТЬ.html · сборка ${build} · ${items.length} вставок`);
