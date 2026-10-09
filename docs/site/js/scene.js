// Движок сцены хиро «Один день сада»: нативный скролл, canvas читает прогресс закреплённой секции
// и смешивает соседние кадры серии. Путь A (4 стилла) и путь B (48 кадров Kling) — один код, разница в manifest.json.
// mount(root, { manifest, base, onProgress }) → { destroy }
export function mount(root, opts = {}) {
  const stage = root.querySelector('.ve-hero__stage');
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const base = opts.base || '';
  const v = opts.v ? '?v=' + opts.v : '';
  const rm = !!opts.reducedMotion;
  const onProgress = opts.onProgress || (() => {});

  let man = null, set = null, frames = [], ready = [], cur = 0, target = 0, running = false, dead = false;
  let W = 0, H = 0, dpr = 1, tick = 0, lastDrawn = -1, lastA = -1, lastB = -1, lastAlpha = -1;

  // --- размер ---
  function size() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === W && h === H && canvas.width === Math.round(w * dpr)) return false;
    W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    pickSet();
    lastDrawn = -1;
    return true;
  }
  function pickSet() {
    if (!man) return;
    const want = H > W ? 'tall' : 'wide';
    if (set && set.name === want) return;
    set = { name: want, ...man.sets[want] };
    frames = set.frames.map(() => null);
    ready = set.frames.map(() => false);
    load();
  }

  // --- загрузка: опорные кадры, потом остальные по три ---
  let loadGen = 0;
  async function load() {
    const gen = ++loadGen;
    const n = frames.length;
    const order = [];
    const step = Math.max(1, Math.round(n / 6));
    for (let i = 0; i < n; i += step) order.push(i);
    for (let i = 0; i < n; i++) if (!order.includes(i)) order.push(i);
    let i = 0;
    const worker = async () => {
      while (i < order.length && gen === loadGen && !dead) {
        const k = order[i++];
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.decoding = 'async';
          img.src = base + 'media/scene/' + set.frames[k] + v;
          await img.decode();
          if (gen !== loadGen) return;
          frames[k] = img; ready[k] = true;
          lastDrawn = -1; wake();
        } catch (e) { /* кадр не пришёл — рисуем ближайший загруженный */ }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  const nearest = (k) => {
    if (ready[k]) return k;
    for (let d = 1; d < frames.length; d++) { if (ready[k - d]) return k - d; if (ready[k + d]) return k + d; }
    return -1;
  };

  // --- cover-кроп по фокусу ---
  function drawImg(img, alpha) {
    const fw = set.w, fh = set.h, f = man.focus || [0.5, 0.5];
    const s = Math.max(W / fw, H / fh);
    const dw = fw * s, dh = fh * s;
    const dx = Math.min(0, Math.max(W - dw, W / 2 - f[0] * dw));
    const dy = Math.min(0, Math.max(H - dh, H / 2 - f[1] * dh));
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, dx * dpr, dy * dpr, dw * dpr, dh * dpr);
  }
  function draw(t) {
    const n = frames.length; if (!n) return;
    const a = Math.floor(t), b = Math.min(n - 1, a + 1), alpha = t - a;
    const ia = nearest(a), ib = nearest(b);
    if (ia < 0 && ib < 0) return;
    if (ia === lastA && ib === lastB && Math.abs(alpha - lastAlpha) < 0.004 && lastDrawn === t) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (ia >= 0) drawImg(frames[ia], 1);
    if (ib >= 0 && ib !== ia && alpha > 0.002) drawImg(frames[ib], alpha);
    ctx.globalAlpha = 1;
    lastA = ia; lastB = ib; lastAlpha = alpha; lastDrawn = t;
    if (!root.classList.contains('is-live')) root.classList.add('is-live');
  }

  // --- прогресс ---
  function progress() {
    const r = root.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const travel = r.height - vh;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / travel));
  }
  let lastP = -1;
  function loop() {
    if (dead) return;
    running = true;
    if ((++tick % 20) === 0) size();
    const p = progress();
    if (p !== lastP) { lastP = p; onProgress(p); }
    const n = frames.length;
    target = p * Math.max(0, n - 1);
    if (rm) { cur = p > 0.9 ? n - 1 : 0; }
    else { cur += (target - cur) * 0.18; if (Math.abs(target - cur) < 0.01) cur = target; }
    draw(cur);
    if (Math.abs(target - cur) > 0.005 || lastDrawn !== cur || !ready.every(Boolean) && tick % 10 === 0) requestAnimationFrame(loop);
    else running = false;
  }
  function wake() { if (!running && !dead && !document.hidden) requestAnimationFrame(loop); }

  // --- старт ---
  const manUrl = base + 'media/scene/manifest.json' + v;
  fetch(manUrl).then(r => r.json()).then(m => {
    if (dead) return;
    man = m; size(); pickSet(); wake();
  }).catch(() => { root.classList.add('is-static'); });

  const onScroll = () => wake();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onScroll);
  let ro = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { if (size()) wake(); }); ro.observe(stage); }

  return {
    destroy() { dead = true; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.removeEventListener('visibilitychange', onScroll); if (ro) ro.disconnect(); },
    get progress() { return lastP; },
  };
}
