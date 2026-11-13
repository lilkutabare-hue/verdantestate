// Проверка воркера заявок без выкатки: node tools/form-worker/test.mjs. Поддельное окружение (KV в памяти), Telegram не вызывается, сообщения никуда не уходят.
import worker from './index.js';
const sent = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { sent.push({ url: String(url).replace(/bot[^/]+/, 'bot<token>'), body: init && typeof init.body === 'string' ? JSON.parse(init.body) : null }); return new Response(JSON.stringify({ ok: true, result: { username: 'TestBot' } }), { headers: { 'content-type': 'application/json' } }); };
const mkEnv = (over) => { const m = new Map(); return Object.assign({ BOT_TOKEN: '123:TEST', ALLOW_USER: 'owner_name', ORIGINS: 'https://verdantestate.ru,https://www.verdantestate.ru', KV: { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, _m: m }, MEDIA: { fetch: async () => new Response('', { status: 404 }) } }, over || {}); };
const post = (env, path, body, h) => worker.fetch(new Request('https://w.example' + path, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, h || {}), body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const lead = { name: 'Анна <b>жирно</b> & Ко', phone: '+7 (900) 123-45-67', consent: true, area: 12, tariff: 'PREMIUM', factors: ['газон', 'x'.repeat(500)], comment: 'привет <a href="x">ссылка</a>' };
const res = []; const t = (name, ok, extra) => res.push((ok ? 'ок   ' : 'СБОЙ ') + name + (extra ? ' · ' + extra : ''));
let env = mkEnv(); env.KV._m.set('chat', '555');
let r = await post(env, '/lead', lead, { origin: 'https://evil-project.tilda.ws' }); t('чужой проект на tilda.ws отклонён', r.status === 403, String(r.status));
r = await post(env, '/lead', lead, { origin: 'https://attacker.lilkutabare.workers.dev' }); t('чужой воркер отклонён', r.status === 403, String(r.status));
r = await post(env, '/lead', lead); t('без Origin отклонён', r.status === 403, String(r.status));
sent.length = 0; r = await post(env, '/lead', lead, { origin: 'https://verdantestate.ru', 'cf-connecting-ip': '1.1.1.1' }); const m = sent.find((x) => /sendMessage/.test(x.url));
t('заявка со своего домена уходит', r.status === 200 && !!m, String(r.status)); t('теги в имени и комментарии экранированы', m && !/<b>жирно|<a href/.test(m.body.text) && /&lt;b&gt;жирно/.test(m.body.text)); t('длинный пункт обрезан до 40', m && !/x{41}/.test(m.body.text));
r = await post(env, '/lead', lead, { origin: 'https://verdantestate.tilda.ws', 'cf-connecting-ip': '1.1.1.2' }); t('адрес сайта на Тильде принят', r.status === 200, String(r.status));
r = await post(env, '/lead', Object.assign({}, lead, { comment: 'я'.repeat(9000) }), { origin: 'https://verdantestate.ru', 'cf-connecting-ip': '1.1.1.3' }); t('тело больше 8 КБ отклонено', r.status === 413, String(r.status));
r = await post(env, '/lead', '[1,2]', { origin: 'https://verdantestate.ru', 'cf-connecting-ip': '1.1.1.4' }); t('не объект — 400', r.status === 400, String(r.status));
sent.length = 0; r = await post(env, '/lead', Object.assign({}, lead, { website: 'spam' }), { origin: 'https://verdantestate.ru', 'cf-connecting-ip': '1.1.1.5' }); t('ловушка: ответ 200, сообщение не ушло', r.status === 200 && !sent.length);
env = mkEnv(); env.KV._m.set('chat', '555'); let st = []; for (let i = 0; i < 4; i++) st.push((await post(env, '/lead', lead, { origin: 'https://verdantestate.ru', 'cf-connecting-ip': '9.9.9.9' })).status); t('четвёртая заявка с одного адреса за 10 минут — 429', st.join(',') === '200,200,200,429', st.join(','));
env = mkEnv(); env.KV._m.set('chat', '555'); let last = 0, okN = 0; for (let i = 0; i < 42; i++) { last = (await post(env, '/lead', lead, { origin: 'https://verdantestate.ru', 'cf-connecting-ip': '10.0.0.' + i })).status; if (last === 200) okN++; } t('общий потолок: 40 в час, дальше 429', okN === 40 && last === 429, okN + ' прошло, последний ' + last);
// /setup
env = mkEnv(); r = await worker.fetch(new Request('https://w.example/setup?photo=0'), env); t('/setup открыт, пока чат не привязан', r.status === 200, String(r.status));
env.KV._m.set('chat', '555'); r = await worker.fetch(new Request('https://w.example/setup?photo=0'), env); t('/setup закрыт после привязки чата', r.status === 403, String(r.status));
env.SETUP_KEY = 'k1'; r = await worker.fetch(new Request('https://w.example/setup?photo=0&key=k1'), env); t('/setup с ключом работает', r.status === 200, String(r.status)); r = await worker.fetch(new Request('https://w.example/setup?photo=0&key=bad'), env); t('/setup с неверным ключом закрыт', r.status === 403, String(r.status));
// привязка чата
const hex = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('');
const sec = (await hex('verdant:123:TEST')).slice(0, 32); const upd = (uid, uname, chat, text) => ({ message: { text, chat: { id: chat }, from: { id: uid, username: uname } } });
env = mkEnv(); r = await post(env, '/tg', upd(1, 'Owner_Name', 100, '/start')); t('вебхук без секрета — 403', r.status === 403, String(r.status));
await post(env, '/tg', upd(1, 'Owner_Name', 100, '/start'), { 'x-telegram-bot-api-secret-token': sec }); t('первый Start привязывает чат', env.KV._m.get('chat') === '100');
await post(env, '/tg', upd(2, 'owner_name', 200, '/start'), { 'x-telegram-bot-api-secret-token': sec }); t('другой человек с тем же именем чат не перехватывает', env.KV._m.get('chat') === '100', 'chat=' + env.KV._m.get('chat'));
await post(env, '/tg', upd(1, 'owner_name', 300, '/start'), { 'x-telegram-bot-api-secret-token': sec }); t('тот же человек может перепривязать (другой чат)', env.KV._m.get('chat') === '300');
await post(env, '/tg', upd(3, 'stranger', 400, '/start'), { 'x-telegram-bot-api-secret-token': sec }); t('посторонний не привязывается', env.KV._m.get('chat') === '300');
env.ALLOW_USER = 'client_name'; await post(env, '/tg', upd(7, 'client_name', 700, '/start'), { 'x-telegram-bot-api-secret-token': sec }); t('после смены ALLOW_USER новый получатель привязывается', env.KV._m.get('chat') === '700', 'chat=' + env.KV._m.get('chat'));
console.log(res.join('\n')); console.log(res.some((x) => x.startsWith('СБОЙ')) ? 'ИТОГ: есть сбои' : 'ИТОГ: все ' + res.length + ' проверок прошли');
globalThis.fetch = realFetch;
