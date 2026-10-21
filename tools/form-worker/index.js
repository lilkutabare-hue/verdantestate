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
const msk = (d, o) => new Intl.DateTimeFormat('ru-RU', Object.assign({ timeZone: 'Europe/Moscow' }, o)).format(d || new Date());
const day = (d) => msk(d, { year: 'numeric', month: '2-digit', day: '2-digit' }).split('.').reverse().join('-');
async function bump(env) { const k = 'n:' + day(); await env.KV.put(k, String((+(await env.KV.get(k)) || 0) + 1), { expirationTtl: 60 * 60 * 24 * 40 }); await env.KV.put('last', String(Date.now())); }
// кнопки под заявкой: WhatsApp и Telegram по номеру, «Взял в работу» — отметка прямо в сообщении
const kb = (phone) => ({ inline_keyboard: [[{ text: 'WhatsApp', url: 'https://wa.me/' + phone }, { text: 'Telegram', url: 'https://t.me/+' + phone }], [{ text: '✓ Взял в работу', callback_data: 'take' }]] });
function leadText(d, phone, test) {
  const f = Array.isArray(d.factors) ? d.factors.slice(0, 12).join(', ') : '';
  return [
    (test ? '<b>ТЕСТ · </b>' : '') + '<b>Заявка с сайта Verdant Estate</b>',
    `Имя: ${esc(d.name)}`,
    `Телефон: +${phone[0]} ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`,
    d.area ? `Площадь: ${esc(String(d.area).slice(0, 6))} сот.` : '',
    `Уровень: ${esc(TARIFF[d.tariff] || 'не выбран')}${d.estimate && !d.tariff ? ' (конструктор: ' + esc(TARIFF[d.estimate] || d.estimate) + ')' : ''}`,
    f ? `На участке: ${esc(f)}` : '',
    d.comment ? `Комментарий: ${esc(String(d.comment).slice(0, 1000))}` : '',
    `<i>${msk(new Date(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</i>`,
  ].filter(Boolean).join('\n');
}

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
  d.name = name;
  const r = await tg(env, 'sendMessage', { chat_id: chat, text: leadText(d, phone), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb(phone) });
  if (!r.ok) return json({ ok: false, error: 'tg' }, 502, cors);
  await bump(env);
  return json({ ok: true }, 200, cors);
}

const HELP = [
  '<b>Бот заявок Verdant Estate</b>',
  'Сюда приходят заявки с сайта: имя, телефон, площадь, уровень, комментарий.',
  'Под заявкой кнопки: написать клиенту в WhatsApp или Telegram и «Взял в работу» — отметка останется в сообщении.',
  '',
  '/status — работает ли бот и сколько заявок',
  '/test — прислать пробную заявку',
  '/help — эта подсказка',
].join('\n');

async function webhook(req, env) {
  const secret = (await hex('verdant:' + env.BOT_TOKEN)).slice(0, 32);
  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('no', { status: 403 });
  const u = await req.json().catch(() => ({}));
  const chat = await env.KV.get('chat');
  // кнопка «Взял в работу»
  if (u.callback_query) {
    const q = u.callback_query, m = q.message;
    if (m && String(m.chat.id) === chat && q.data === 'take') {
      const who = (q.from && (q.from.first_name || q.from.username)) || '';
      const rows = (m.reply_markup && m.reply_markup.inline_keyboard || []).slice(0, 1);
      rows.push([{ text: `✓ В работе · ${who} · ${msk(new Date(), { hour: '2-digit', minute: '2-digit' })}`, callback_data: 'noop' }]);
      await tg(env, 'editMessageReplyMarkup', { chat_id: m.chat.id, message_id: m.message_id, reply_markup: { inline_keyboard: rows } });
      await tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: 'Отмечено' });
    } else await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
    return new Response('ok');
  }
  const m = u.message; if (!m || !m.chat) return new Response('ok');
  const who = String((m.from && m.from.username) || '').toLowerCase(), allow = String(env.ALLOW_USER || '').toLowerCase().replace(/^@/, '');
  const cmd = String(m.text || '').trim().split(/[\s@]/)[0];
  const say = (text, extra) => tg(env, 'sendMessage', Object.assign({ chat_id: m.chat.id, text, parse_mode: 'HTML', disable_web_page_preview: true }, extra || {}));
  if (cmd === '/start' && who && who === allow) {
    await env.KV.put('chat', String(m.chat.id));
    await say('Готово. Заявки с сайта Verdant Estate будут приходить сюда.\n\n' + HELP);
    return new Response('ok');
  }
  if (String(m.chat.id) !== chat) { await say('Это служебный бот заявок Verdant Estate.'); return new Response('ok'); }
  if (cmd === '/status') {
    let today = +(await env.KV.get('n:' + day())) || 0, week = 0;
    for (let i = 0; i < 7; i++) week += +(await env.KV.get('n:' + day(new Date(Date.now() - i * 864e5)))) || 0;
    const last = +(await env.KV.get('last')) || 0;
    await say(`Бот работает.\nЗаявок сегодня: <b>${today}</b>, за 7 дней: <b>${week}</b>.\n${last ? 'Последняя: ' + msk(new Date(last), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Заявок пока не было.'}`);
  } else if (cmd === '/test') {
    await say(leadText({ name: 'Иван (пример)', area: 12, tariff: 'PREMIUM', factors: ['газон', 'деревья', 'автополив'], comment: 'Это пробная заявка — так будут выглядеть настоящие.' }, '79000000000', true), { reply_markup: kb('79000000000') });
  } else {
    await say(HELP);
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
      const ok = async (p) => { try { const r = await p; return (await r.json()).ok === true; } catch { return false; } };
      const res = {
        webhook: await ok(tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: secret, allowed_updates: ['message', 'callback_query'] })),
        name: await ok(tg(env, 'setMyName', { name: 'Verdant Estate · заявки' })),
        description: await ok(tg(env, 'setMyDescription', { description: 'Служебный бот Verdant Estate: сюда приходят заявки с сайта. Нажмите «Start», если вы владелец.' })),
        short: await ok(tg(env, 'setMyShortDescription', { short_description: 'Заявки с сайта Verdant Estate' })),
        commands: await ok(tg(env, 'setMyCommands', { commands: [{ command: 'status', description: 'Работает ли бот и сколько заявок' }, { command: 'test', description: 'Прислать пробную заявку' }, { command: 'help', description: 'Как пользоваться' }] })),
      };
      // аватарка — логотип с хостинга медиа; фото профиля можно загрузить только файлом (multipart)
      if (url.searchParams.get('photo') !== '0') try {
        // воркер не может звать другой воркер этого аккаунта по адресу workers.dev (ошибка 1042) — берём файл через привязку MEDIA
        const pic = await env.MEDIA.fetch('https://media/brand/bot-avatar.jpg');
        if (!pic.ok || !/jpeg/.test(pic.headers.get('content-type') || '')) throw new Error('аватарка не найдена: ' + pic.status);
        const fd = new FormData();
        fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://pic' }));
        fd.append('pic', new Blob([await pic.arrayBuffer()], { type: 'image/jpeg' }), 'avatar.jpg');
        const pr = await (await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyProfilePhoto`, { method: 'POST', body: fd })).json();
        res.photo = pr.ok === true ? true : (pr.description || 'нет');
      } catch (e) { res.photo = String(e && e.message || e); }
      const me = await (await tg(env, 'getMe', {})).json().catch(() => ({}));
      return json(Object.assign({ ok: res.webhook, bot: me.result && me.result.username ? '@' + me.result.username : null }, res, { next: 'Заказчик открывает бота и жмёт Start' }));
    }
    if (url.pathname === '/health') return json({ bot: !!env.BOT_TOKEN, chat: !!(await env.KV.get('chat')) });
    return new Response('Verdant Estate · заявки', { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  },
};
