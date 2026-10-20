// Движок хиро v2 «Пролёт → превращение»: нативный скролл, canvas читает прогресс закреплённой секции.
// Таймлайн по прогрессу p (0…1):
//   [0, flight]        пролёт — кадры серии со смешиванием соседних (4 стилла или ~49 кадров из клипов К1–К3)
//   [flight, groom]    шторка-покос: S4 «до» → S5a «после» мягкой кромкой слева направо
//   [groom, light]     включается свет: S5a → S5 (синий час, подсветка)
//   [light, 1]         стоп-кадр S5 (над ним сферы меню, их ведёт сама секция)
// Кадры и серии — в media/scene/manifest.json (v2, пишет tools/frames.mjs).
// mount(root, { base, v, reducedMotion, onProgress, onManifest, onLoad(loaded, total), timeline }) → { destroy, hold(p), progress }
export function mount(root, opts = {}) {
  const stage = root.querySelector('.ve-hero__stage');
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const base = opts.base || '', v = opts.v ? '?v=' + opts.v : '';
  const rm = !!opts.reducedMotion;
  const onProgress = opts.onProgress || (() => {});
  const TL = Object.assign({ flight: 0.66, groom: 0.8, light: 0.88 }, opts.timeline || {});

  let man = null, set = null, imgs = [], ready = [], nFlight = 0, curP = 0, held = null, running = false, dead = false;
  let W = 0, H = 0, dpr = 1, tick = 0, lastKey = '';

  // --- размер и серия под ориентацию ---
  function size() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === W && h === H && canvas.width === Math.round(w * dpr)) return false;
    W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    pickSet(); lastKey = '';
    return true;
  }
  function pickSet() {
    if (!man) return;
    const want = H > W ? 'tall' : 'wide';
    if (set && set.name === want) return;
    set = { name: want, ...man.sets[want] };
    const list = set.frames.concat(set.after || []);
    nFlight = set.frames.length;
    imgs = list.map(() => null); ready = list.map(() => false);
    load(list);
  }

  // --- загрузка: опорные кадры пролёта → кадры превращения → остальные ---
  let loadGen = 0;
  async function load(list) {
    const gen = ++loadGen, order = [], step = Math.max(1, Math.round(nFlight / 6));
    for (let i = 0; i < nFlight; i += step) order.push(i);
    if (!order.includes(nFlight - 1)) order.push(nFlight - 1);
    for (let i = nFlight; i < list.length; i++) order.push(i);
    for (let i = 0; i < nFlight; i++) if (!order.includes(i)) order.push(i);
    let i = 0;
    const worker = async () => {
      while (i < order.length && gen === loadGen && !dead) {
        const k = order[i++];
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous'; img.decoding = 'async';
          img.src = base + 'media/scene/' + list[k] + v;
          await img.decode();
          if (gen !== loadGen) return;
          imgs[k] = img; ready[k] = true; lastKey = ''; wake();
          if (opts.onLoad) { let n = 0; for (let q = 0; q < nFlight; q++) if (ready[q]) n++; opts.onLoad(n, nFlight); }
        } catch (e) { /* кадр не пришёл — рисуем ближайший загруженный */ }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  const nearest = (k) => {
    if (ready[k]) return k;
    for (let d = 1; d < nFlight; d++) { if (k - d >= 0 && ready[k - d]) return k - d; if (k + d < nFlight && ready[k + d]) return k + d; }
    return -1;
  };

  // --- cover-кроп: tall-серия уже в 9:16 с ведением фокуса, тут только вписать ---
  function cover(img, alpha, x0 = 0, x1 = W) {
    const fw = set.w, fh = set.h, s = Math.max(W / fw, H / fh), dw = fw * s, dh = fh * s;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.save();
    if (x0 > 0 || x1 < W) { ctx.beginPath(); ctx.rect(x0 * dpr, 0, (x1 - x0) * dpr, H * dpr); ctx.clip(); }
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, dx * dpr, dy * dpr, dw * dpr, dh * dpr);
    ctx.restore();
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  function draw(p) {
    if (!set || !imgs.length) return;
    const A = nFlight, last = nFlight - 1;
    let key;
    if (p <= TL.flight) {
      const t = seg(p, 0, TL.flight) * last, a = Math.floor(t), b = Math.min(last, a + 1), al = t - a;
      const ia = nearest(a), ib = nearest(b);
      key = 'f' + ia + ':' + ib + ':' + al.toFixed(3);
      if (key === lastKey || (ia < 0 && ib < 0)) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (ia >= 0) cover(imgs[ia], 1);
      if (ib >= 0 && ib !== ia && al > 0.002) cover(imgs[ib], al);
    } else if (p <= TL.groom) {
      const k = ease(seg(p, TL.flight, TL.groom)), ib = ready[last] ? last : nearest(last);
      key = 'g' + ib + ':' + ready[A] + ':' + k.toFixed(4);
      if (key === lastKey || ib < 0) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cover(imgs[ib], 1);
      if (ready[A] && k > 0) {
        // кромка покоса: мягкая (F px), впереди неё — светлая полоса свежего среза
        const F = Math.max(40, W * 0.07), edge = -F + k * (W + 2 * F);
        cover(imgs[A], 1, 0, Math.max(0, edge - F));
        const S = 10;
        for (let j = 0; j < S; j++) { const x0 = edge - F + (F * j) / S; cover(imgs[A], 1 - (j + 0.5) / S, Math.max(0, x0), Math.max(0, x0 + F / S)); }
        if (k < 1) {
          const g = ctx.createLinearGradient((edge - F * 1.2) * dpr, 0, (edge + F * 0.2) * dpr, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect((edge - F * 1.2) * dpr, 0, F * 1.4 * dpr, H * dpr);
        }
      }
    } else {
      const k = ease(seg(p, TL.groom, TL.light));
      key = 'l' + ready[A] + ':' + ready[A + 1] + ':' + k.toFixed(4);
      if (key === lastKey) return;
      if (!ready[A]) { lastKey = ''; return draw(TL.flight); }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cover(imgs[A], 1);
      if (ready[A + 1] && k > 0) cover(imgs[A + 1], k);
    }
    lastKey = key;
    if (!root.classList.contains('is-live')) root.classList.add('is-live');
  }

  // --- прогресс и цикл ---
  function progress() {
    const r = root.getBoundingClientRect(), travel = r.height - (window.innerHeight || 1);
    return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
  }
  let lastP = -1;
  function loop() {
    if (dead) return;
    running = true;
    if ((++tick % 20) === 0) size();
    const p = held != null ? held : progress();
    if (p !== lastP) { lastP = p; onProgress(p); }
    if (rm || held != null) curP = p;
    else { curP += (p - curP) * 0.16; if (Math.abs(p - curP) < 0.0004) curP = p; }
    draw(curP);
    const loading = !ready.every(Boolean);
    if (Math.abs(p - curP) > 0.0002 || (loading && tick % 10 !== 0)) requestAnimationFrame(loop);
    else running = false;
  }
  function wake() { if (!running && !dead && !document.hidden) requestAnimationFrame(loop); }

  fetch(base + 'media/scene/manifest.json' + v).then((r) => r.json()).then((m) => {
    if (dead) return;
    man = m; if (opts.onManifest) opts.onManifest(m); size(); pickSet(); wake();
  }).catch(() => { root.classList.add('is-static'); });

  const onScroll = () => wake();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onScroll);
  let ro = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { if (size()) wake(); }); ro.observe(stage); }

  return {
    destroy() { dead = true; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.removeEventListener('visibilitychange', onScroll); if (ro) ro.disconnect(); },
    // отладка: заморозить сцену на прогрессе p (null — вернуть скролл); рисует синхронно, без rAF
    hold(p) { held = p; if (p != null) { curP = p; onProgress(p); lastKey = ''; draw(p); } else wake(); },
    get progress() { return lastP; },
  };
}
