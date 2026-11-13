#!/usr/bin/env node
// Лист SEO-настроек для Тильды: node tools/seo-sheet.mjs → dist/SEO.html (в git не идёт)
//
// Одна страница (открывается двойным щелчком): что и куда вставить в настройках Тильды, у каждого текста кнопка «Копировать»,
// у каждого файла — картинка и путь. Тексты и пути меню — из docs/seo-2026-11-08.md (раздел «Настройки по страницам»);
// правишь текст — правь в обоих местах. Отметки «сделано» хранятся в браузере.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist/SEO.html');
const build = existsSync(join(ROOT, 'docs/site/version.txt')) ? readFileSync(join(ROOT, 'docs/site/version.txt'), 'utf8').trim() : '?';
const file = (rel) => { if (!existsSync(join(ROOT, rel))) throw new Error('нет файла ' + rel); return { rel, abs: join(ROOT, rel) }; };

// t — текст для копирования, f — файл для загрузки, n — пояснение без кнопки
const SECTIONS = [
  { h: 'Главная страница', where: 'Тильда → страница «Главная» → Настройки страницы', items: [
    { l: 'Главное → Заголовок', t: 'Уход за частными садами в Москве и области — Verdant Estate' },
    { l: 'Главное → Описание', t: 'Постоянный уход за садом по договору: газон, деревья, цветники, сезонные работы. Один договор, один ответственный. Тарифы от 60 000 ₽ в месяц, разовые работы по прайсу. Москва и Московская область.' },
    { l: 'Соцсети → Настроить отображение → Заголовок', t: 'Verdant Estate — уход за частными садами' },
    { l: 'Соцсети → Описание', t: 'Сад, за которым не нужно следить. Один договор, один ответственный — весь сезон. Москва и Московская область.' },
    { l: 'Соцсети → Картинка (1200×630)', f: file('docs/site/og-1200x630.jpg') },
    { n: 'SEO: «Запретить индексировать» не ставить, каноническую ссылку и «Ключевые слова» не трогать.' },
  ] },
  { h: 'Страница /policy', where: 'Тильда → страница политики → Настройки страницы', items: [
    { l: 'Главное → Заголовок', t: 'Политика обработки персональных данных — Verdant Estate' },
    { l: 'Главное → Описание', t: 'Какие данные Verdant Estate получает через заявку на сайте, зачем, сколько хранит и как отозвать согласие.' },
    { n: 'Адрес страницы /policy не менять: на него ведут форма, подвал и плашка cookie.' },
  ] },
  { h: 'Страница /consent', where: 'Тильда → страница согласия → Настройки страницы', items: [
    { l: 'Главное → Заголовок', t: 'Согласие на обработку персональных данных — Verdant Estate' },
    { l: 'Главное → Описание', t: 'Текст согласия, которое даёт посетитель, отправляя заявку на сайте Verdant Estate: какие данные, для чего, срок и отзыв.' },
    { n: 'Адрес страницы /consent не менять: на него ведёт галочка формы.' },
  ] },
  { h: 'Настройки сайта', where: 'Тильда → Настройки сайта', items: [
    { l: 'Главное → Favicon → Загрузить файл', f: file('docs/site/favicon-512.png'), note: 'Светлый знак на зелёной плашке: виден на светлой и тёмной вкладке и в поисковой выдаче. В Chrome, Яндекс Браузере и Firefox сайт сам подменит его на знак без фона, который меняет цвет по теме браузера.' },
    { n: 'SEO → «Яндекс Вебмастер» → Подключить. SEO → «Google Search Console» → Подключить. В обоих добавить карту сайта:' },
    { l: 'Карта сайта для Вебмастера и Search Console', t: 'https://verdantestate.ru/sitemap.xml' },
    { n: 'Аналитика → Яндекс Метрика: создать счётчик и подключить. Номер счётчика прислать разработчику: в политику нужно дописать строку о Метрике и cookie.' },
    { n: 'SEO → «SEO-рекомендации» → Проверить страницы заново. Не трогать: редиректы www и https, robots.txt, sitemap.xml — они верные.' },
    { n: 'В конце: «Опубликовать все страницы». Потом в Вебмастере: «Переобход страниц» → главная.' },
  ] },
  { h: 'Вне Тильды', where: 'business.yandex.ru', items: [
    { n: 'Яндекс Бизнес: организация без адреса, зона обслуживания «Москва и Московская область». Из неё Вебмастер может взять регион сайта.' },
    { l: 'Телефон (как на сайте)', t: '+7 980 400-94-48' },
    { l: 'Сайт', t: 'https://verdantestate.ru/' },
  ] },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const texts = []; let id = 0;
const row = (it) => {
  if (it.n) return `<p class="note">${esc(it.n)}</p>`;
  const i = id++;
  if (it.f) { texts.push(it.f.abs); return `<div class="row file" id="r${i}"><span><i>${esc(it.l)}</i><img src="../${esc(it.f.rel)}" alt=""><small>${esc(it.f.rel)}${it.note ? ' · ' + esc(it.note) : ''}</small></span><button type="button" data-i="${i}">Копировать путь</button></div>`; }
  texts.push(it.t);
  return `<div class="row" id="r${i}"><span><i>${esc(it.l)}</i><code>${esc(it.t)}</code></span><button type="button" data-i="${i}">Копировать</button></div>`;
};
const body = SECTIONS.map((s) => `<h2>${esc(s.h)}</h2><p class="where">${esc(s.where)}</p>${s.items.map(row).join('')}`).join('');
const js = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

writeFileSync(OUT, `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verdant · SEO-настройки для Тильды</title><style>
:root{--bg:#FBFAF6;--card:#fff;--ink:#1B462A;--txt:#26332A;--mut:#617A66;--line:rgba(27,70,42,.14);--ok:#2E7D46}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--txt);font:16px/1.45 -apple-system,"Segoe UI",Roboto,sans-serif;padding:28px 16px 64px;max-width:780px;margin:0 auto}
h1{font-size:26px;color:var(--ink);letter-spacing:-.01em}.sub{color:var(--mut);margin:6px 0 4px;font-size:14px}
h2{font-size:19px;color:var(--ink);margin-top:30px}.where{color:var(--mut);font-size:13px;margin:2px 0 6px}
.row{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:8px}
.row span{flex:1;min-width:0}.row i{display:block;font-style:normal;font-weight:600;font-size:13px;color:var(--mut)}.row code{display:block;font:15px/1.4 -apple-system,sans-serif;margin-top:3px;overflow-wrap:anywhere}
.row small{display:block;color:var(--mut);font-size:12.5px;margin-top:6px}.row img{display:block;max-width:100%;max-height:170px;border-radius:8px;margin-top:6px;background:#DEE1E6}
button{flex:none;font:600 14px -apple-system,sans-serif;border:1px solid var(--ink);color:var(--ink);background:none;border-radius:999px;padding:9px 16px;cursor:pointer}button:hover{background:var(--ink);color:#fff}
.row.done{opacity:.55}.row.done button{border-color:var(--ok);color:var(--ok)}.row.done button::after{content:" ✓"}
.note{margin-top:8px;padding:10px 12px;border-radius:12px;background:#F2EFE6;font-size:14px}
</style></head><body>
<h1>SEO-настройки для Тильды</h1>
<p class="sub">Сборка ${esc(build)} · блоки перезаливать для этого не нужно: всё ниже вставляется в настройках страниц и сайта.</p>
${body}
<script>
var D=${js(texts)},K='ve-seo-sheet',done={};
try{done=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
function mark(i){var r=document.getElementById('r'+i);if(r)r.classList.add('done');done[i]=D[i];try{localStorage.setItem(K,JSON.stringify(done))}catch(e){}}
Object.keys(done).forEach(function(i){if(done[i]===D[i])mark(i)});
document.addEventListener('click',function(e){var b=e.target.closest('button[data-i]');if(!b)return;var i=+b.dataset.i,t=D[i],was=b.textContent;
  var ok=function(){mark(i);b.textContent='Скопировано';setTimeout(function(){b.textContent=was},1600)};
  var fb=function(){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(_){}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()});
</script></body></html>`);
console.log(`dist/SEO.html · сборка ${build} · ${texts.length} полей`);
