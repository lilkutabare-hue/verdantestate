// Заявки с сайта Verdant Estate → Telegram заказчику (решение владельца 22.10.2026).
// POST /lead  — JSON формы: проверка, защита от спама, сообщение в Telegram на сохранённый chat_id.
// POST /tg    — вебхук бота: /start от разрешённого username сохраняет chat_id (заказчик жмёт «Start» один раз).
// GET  /setup — включить вебхук бота на этот воркер. GET /health — бот и чат подключены ли.
// Секрет BOT_TOKEN владелец ставит сам: npx wrangler secret put BOT_TOKEN (в коде и в git токена нет).
// Риск, о котором владелец знает: Telegram — иностранный сервис (152-ФЗ, локализация с 1.07.2025). Заявки здесь не хранятся.
const ORIGIN_OK = /^https:\/\/([a-z0-9-]+\.)*(tilda\.ws|tilda\.cc|lilkutabare\.workers\.dev)$|^http:\/\/localhost(:\d+)?$/;

const json = (o, status, cors) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, cors || {}) });
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
async function hex(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

function corsFor(req, env) {
  const o = req.headers.get('origin') || '';
  const extra = (env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!(ORIGIN_OK.test(o) || extra.includes(o))) return null;
  return { 'access-control-allow-origin': o, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'origin' };
}

const TARIFF = { BASIC: 'Basic', PREMIUM: 'Premium', ESTATE: 'Estate' };

async function lead(req, env, cors) {
  if (!env.BOT_TOKEN) return json({ ok: false, error: 'bot' }, 503, cors);
  const chat = await env.KV.get('chat');
  if (!chat) return json({ ok: false, error: 'chat' }, 503, cors);
  let d; try { d = await req.json(); } catch { return json({ ok: false, error: 'json' }, 400, cors); }
  if (d.website) return json({ ok: true }, 200, cors); // ловушка для ботов: поле скрыто от людей
  const name = String(d.name || '').trim().slice(0, 80), phone = String(d.phone || '').replace(/\D/g, '');
  if (!name || phone.length !== 11 || !d.consent) return json({ ok: false, error: 'fields' }, 400, cors);
  const ip = req.headers.get('cf-connecting-ip') || 'x', rk = 'rl:' + (await hex(ip)).slice(0, 16);
  const n = +(await env.KV.get(rk)) || 0;
  if (n >= 3) return json({ ok: false, error: 'rate' }, 429, cors);
  await env.KV.put(rk, String(n + 1), { expirationTtl: 600 });
  const f = Array.isArray(d.factors) ? d.factors.slice(0, 12).join(', ') : '';
  const text = [
    '<b>Заявка с сайта Verdant Estate</b>',
    `Имя: ${esc(name)}`,
    `Телефон: +${phone[0]} ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`,
    d.area ? `Площадь: ${esc(String(d.area).slice(0, 6))} сот.` : '',
    `Уровень: ${esc(TARIFF[d.tariff] || 'не выбран')}${d.estimate && !d.tariff ? ' (конструктор: ' + esc(TARIFF[d.estimate] || d.estimate) + ')' : ''}`,
    f ? `На участке: ${esc(f)}` : '',
    d.comment ? `Комментарий: ${esc(String(d.comment).slice(0, 1000))}` : '',
  ].filter(Boolean).join('\n');
  const r = await tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true });
  if (!r.ok) return json({ ok: false, error: 'tg' }, 502, cors);
  return json({ ok: true }, 200, cors);
}

async function webhook(req, env) {
  const secret = (await hex('verdant:' + env.BOT_TOKEN)).slice(0, 32);
  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('no', { status: 403 });
  const u = await req.json().catch(() => ({}));
  const m = u.message; if (!m || !m.chat) return new Response('ok');
  const who = String((m.from && m.from.username) || '').toLowerCase(), allow = String(env.ALLOW_USER || '').toLowerCase().replace(/^@/, '');
  if (/^\/start/.test(m.text || '') && who && who === allow) {
    await env.KV.put('chat', String(m.chat.id));
    await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Готово. Заявки с сайта Verdant Estate будут приходить сюда.' });
  } else {
    await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Это служебный бот заявок Verdant Estate.' });
  }
  return new Response('ok');
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/lead') {
      const cors = corsFor(req, env);
      if (!cors) return new Response('forbidden', { status: 403 });
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (req.method === 'POST') return lead(req, env, cors);
    }
    if (url.pathname === '/tg' && req.method === 'POST') return env.BOT_TOKEN ? webhook(req, env) : new Response('no bot', { status: 503 });
    if (url.pathname === '/setup') {
      if (!env.BOT_TOKEN) return json({ ok: false, error: 'Сначала: npx wrangler secret put BOT_TOKEN' }, 503);
      const secret = (await hex('verdant:' + env.BOT_TOKEN)).slice(0, 32);
      const r = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: secret, allowed_updates: ['message'] });
      const me = await (await tg(env, 'getMe', {})).json().catch(() => ({}));
      return json({ ok: r.ok, bot: me.result && me.result.username ? '@' + me.result.username : null, next: 'Заказчик открывает бота и жмёт Start' });
    }
    if (url.pathname === '/health') return json({ bot: !!env.BOT_TOKEN, chat: !!(await env.KV.get('chat')) });
    return new Response('Verdant Estate · заявки', { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  },
};
