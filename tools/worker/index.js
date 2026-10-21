// Закрытое превью Verdant Estate на Cloudflare Workers (static assets + ключ-ссылка).
// Вход: /?k=<KEY> → ставим cookie и уводим на /. Без cookie любой адрес (и медиа тоже) отдаёт страницу «закрыто» —
// картинки и кадры нельзя подтянуть снаружи. Всё с noindex и без кеша HTML.
const CLOSED = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Verdant Estate</title>
<style>html,body{margin:0;height:100%;background:#fff;color:#1B462A;font:16px/1.5 -apple-system,"SF Pro Text",Inter,system-ui,sans-serif}main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 24px;text-align:center}p{margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#617A66}i{display:block;width:120px;height:1px;background:rgba(31,77,46,.2)}</style></head>
<body><main><strong style="font-weight:600;letter-spacing:-.01em;font-size:22px">Verdant Estate</strong><i></i><p>Закрытое превью · нужна ссылка от владельца</p></main></body></html>`;

async function sig(key) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ve-preview:' + key));
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const key = env.KEY || '';
    const s = await sig(key);
    // ключ в адресе: отдаём страницу сразу (без редиректа — Safari терял cookie на нём) и ставим cookie
    const keyed = key && url.searchParams.get('k') === key;
    const cookie = req.headers.get('cookie') || '';
    const hasCookie = cookie.split(';').some((c) => c.trim() === 've=' + s);
    // ассеты со страницы с ключом: Referer той же страницы несёт ?k= (referrer-policy same-origin) — работает и без cookie
    let byRef = false; try { const r = new URL(req.headers.get('referer') || ''); byRef = r.origin === url.origin && r.searchParams.get('k') === key; } catch {}
    if (!key || !(keyed || hasCookie || byRef)) {
      return new Response(CLOSED, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } });
    }
    const res = await env.ASSETS.fetch(keyed ? new Request(url.origin + url.pathname, req) : req);
    const h = new Headers(res.headers);
    if (keyed && !hasCookie) h.append('set-cookie', `ve=${s}; Path=/; Max-Age=31536000; Secure; SameSite=Lax`);
    const html = (h.get('content-type') || '').includes('text/html');
    h.set('x-robots-tag', 'noindex, nofollow');
    h.set('cache-control', html ? 'no-store' : 'private, max-age=86400');
    h.set('referrer-policy', 'same-origin');
    h.set('x-content-type-options', 'nosniff');
    return new Response(res.body, { status: res.status, headers: h });
  },
};
