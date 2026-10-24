// Движок хиро v2 «Пролёт → превращение»: нативный скролл, canvas читает прогресс закреплённой секции.
// Таймлайн по прогрессу p (0…1):
//   [0, flight]        пролёт — видео (все кадры клипов, по умолчанию на обоих экранах) или кадры серии, один ближайший кадр без смешивания (§7.2: один кадр на экране)
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
  // адрес файла сцены: opts.url(имя) — карта хранилища Тильды (сборка для Тильды), иначе base + media/scene/ + имя + ?v=
  const urlOf = (name) => (opts.url ? opts.url(name) : base + 'media/scene/' + name + v);
  const alt = (u) => (/\/\/static\.tildacdn\.com\//.test(u) ? u.replace('//static.tildacdn.com/', '//static3.tildacdn.com/') : null); // запасной хост Тильды (план медиа §3.4)
  const rm = !!opts.reducedMotion;
  const onProgress = opts.onProgress || (() => {});
  const TL = Object.assign({ flight: 0.66, groom: 0.8, light: 0.88 }, opts.timeline || {});

  const slow = (() => { try { return matchMedia('(hover:none) and (pointer:coarse)').matches; } catch { return false; } })();
  let man = null, set = null, imgs = [], ready = [], nFlight = 0, curP = 0, held = null, running = false, dead = false;
  // декодированные битмапы: браузер на телефоне выкидывает декод картинок из кеша и декодирует заново при каждом drawImage — отсюда фризы.
  // Держим ImageBitmap сами, окном вокруг текущего кадра (на компьютере — все), остальное закрываем.
  let bmps = [], bmpBusy = 0, bmpCenter = -1;
  // на тач битмапы не держим: пачки createImageBitmap роняли кадры (18 к/с при 4× замедлении), а WebP декодируется быстро; ?nofx=bmp — диагностика на компьютере
  const canBmp = typeof createImageBitmap === 'function' && !slow && !document.documentElement.classList.contains('ve-no-bmp');
  const WIN = slow ? 14 : 24; // окно битмапов: телефон ±14 (≈75 МБ), компьютер ±24 (≈230 МБ)
  function tend(center) {
    if (!canBmp || center === bmpCenter) return; bmpCenter = center;
    const lo = Math.max(0, center - WIN), hi = Math.min(imgs.length - 1, center + WIN);
    for (let k = 0; k < bmps.length; k++) if (bmps[k] && (k < lo - WIN || k > hi + WIN)) { try { bmps[k].close(); } catch {} bmps[k] = null; }
    const want = [];
    for (let d = 0; d <= Math.max(center - lo, hi - center); d++) { if (center + d <= hi) want.push(center + d); if (d && center - d >= lo) want.push(center - d); }
    for (const k of want) { if (bmpBusy >= 3) break; if (bmps[k] || bmps[k] === 0 || !ready[k]) continue; bmps[k] = 0; bmpBusy++;
      createImageBitmap(imgs[k]).then((b) => { if (dead || bmps[k] !== 0) { b.close(); return; } bmps[k] = b; if (Math.abs(k - bmpCenter) <= 1) { lastKey = ''; wake(); } }).catch(() => { bmps[k] = null; }).finally(() => { bmpBusy--; tend2(); }); }
  }
  function tend2() { const c = bmpCenter; bmpCenter = -1; tend(c); }
  const pick = (k) => bmps[k] || imgs[k];
  let W = 0, H = 0, dpr = 1, tick = 0, lastKey = '';
  // ?hero=video (или класс ve-hero-video на html): пролёт из видео manifest.video[серия] — все кадры клипов 24 к/с одним H.264, аппаратный декод.
  // Видео лежит под холстом; в пролёте холст прозрачный, после пролёта рисует шторку и свет как раньше. Не перематывается за 4 с — назад на кадры.
  // по умолчанию видео на телефоне и на компьютере (план доводки §7.3 C); ?hero=frames или класс ve-hero-frames — только кадры (диагностика, старый путь)
  const wantVid = (() => { try { return !(/[?&]hero=frames\b/.test(location.search) || document.documentElement.classList.contains('ve-hero-frames')); } catch { return true; } })();
  let vidProg = 0; // доля скачанного видео
  // полоса загрузки заставки: кадры — доля загруженных; видео — доля скачанных байт, но до готовности к перемотке не больше 49 % (заставка на телефоне ждёт 50 %)
  function report() {
    if (!opts.onLoad) return;
    if (vidMeta()) { opts.onLoad(vidOk ? 1 : Math.min(0.49, vidProg * 0.49), 1); return; }
    let n = 0; for (let q = 0; q < nFlight; q++) if (ready[q]) n++; opts.onLoad(n, nFlight);
  }
  // Видео пролёта: один файл (m.src) или куски по клипам (m.parts = [{src,dur},…], каждый ≤ 5 МБ — лимит файла в хранилище Тильды).
  // Все куски качаются целиком в память, у каждого свой <video>; виден тот, в чьём отрезке целевое время; стык кусков — тот же кадр (клипы цепочкой),
  // переключение только после того, как новый кусок перемотался на своё место.
  let vids = [], vidUrls = [], vidOk = false, vidBad = false, vidSeeking = false, vidTarget = 0, vidSeekAt = 0, vidFor = '', vidCur = -1, vidNext = -1, vidBehind = false;
  const flips = []; // моменты смены кадра пролёта на экране — для счётчика ?perf=1
  const vidMeta = () => (wantVid && !vidBad && man && man.video && set && man.video[set.name]) || null;
  const vidParts = () => { const m = vidMeta(); if (!m) return []; if (m.parts && m.parts.length) { let off = 0; return m.parts.map((q) => { const r = { src: q.src, dur: q.dur, off }; off += q.dur; return r; }); } return [{ src: m.src, dur: m.dur, off: 0 }]; };
  const vidTotal = () => vidParts().reduce((a, q) => a + q.dur, 0);
  const vidOn = () => vidOk && !!vidMeta() && vidFor === set.name;
  function vidFail() {
    if (vidBad) return; vidBad = true; vidOk = false;
    for (const x of vids) { x.classList.remove('is-on'); x.removeAttribute('src'); try { x.load(); } catch {} x.remove(); }
    for (const u of vidUrls) if (u) URL.revokeObjectURL(u);
    vids = []; vidUrls = []; vidCur = -1; vidNext = -1;
    lastKey = ''; if (set) load(set.frames.concat(set.after || [])); report(); wake(); // догрузить кадры, которые пропускали ради видео
  }
  function setupVideo() {
    const m = vidMeta(); if (!m || vidFor === set.name) { for (let i = 0; i < vids.length; i++) vids[i].classList.toggle('is-on', vidOn() && i === vidCur); return; }
    vidFor = set.name; vidOk = false; vidCur = -1; vidNext = -1;
    for (const x of vids) x.remove(); for (const u of vidUrls) if (u) URL.revokeObjectURL(u); vids = []; vidUrls = [];
    const parts = vidParts(), got = parts.map(() => 0), tot = parts.map(() => 0); let readyN = 0, at = 0;
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    parts.forEach((q, i) => {
      const x = document.createElement('video');
      x.className = 've-hero__vid'; x.muted = true; x.defaultMuted = true; x.playsInline = true; x.preload = 'auto'; x.disablePictureInPicture = true;
      x.setAttribute('muted', ''); x.setAttribute('playsinline', ''); x.setAttribute('aria-hidden', 'true');
      stage.insertBefore(x, canvas); vids[i] = x;
      x.addEventListener('seeked', () => {
        if (i === vidNext) { vidCur = i; vidNext = -1; for (let k = 0; k < vids.length; k++) vids[k].classList.toggle('is-on', k === i); }
        if (i !== vidCur) return; vidSeeking = false; vidBehind = false; flips.push(performance.now()); wake();
      });
      x.addEventListener('error', vidFail);
      // файл целиком в память (Blob): перемотка без сети и без Range-запросов; на iOS иначе видео грузится только по play()
      fetch(urlOf(q.src)).then(async (r) => {
        if (!r.ok) throw new Error(r.status);
        tot[i] = +r.headers.get('content-length') || 0;
        if (!tot[i] || !r.body || !r.body.getReader) return r.blob();
        const rd = r.body.getReader(), chunks = [];
        for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got[i] += value.length; vidProg = sum(got) / Math.max(1, sum(tot)); const now = performance.now(); if (now - at > 120) { at = now; report(); } }
        return new Blob(chunks, { type: 'video/mp4' });
      }).then((b) => {
        if (dead || vidBad) return;
        const u = URL.createObjectURL(b); vidUrls[i] = u; x.src = u; x.load();
        const first = () => { try { x.currentTime = 0.001; } catch {} };
        x.addEventListener('loadedmetadata', first, { once: true });
        const once = () => { x.removeEventListener('seeked', once); readyN++; if (readyN === parts.length && !vidBad) { vidOk = true; lastKey = ''; report(); wake(); } };
        x.addEventListener('seeked', once);
        // не перемоталось за 1,5 с — пнуть play/pause (немой инлайн можно без жеста); за 4 с — сдаёмся, остаёмся на кадрах (режим энергосбережения, старый браузер)
        setTimeout(() => { if (!vidOk && !vidBad && readyN < parts.length) { const pr = x.play && x.play(); if (pr && pr.then) pr.then(() => { x.pause(); first(); }, () => {}); } }, 1500);
        setTimeout(() => { if (!vidOk && !vidBad) vidFail(); }, 4000);
      }).catch(vidFail);
    });
    // Россия без VPN: Cloudflare режут поток после ~16 КБ без ошибки — если за 3,5 с пришло меньше 256 КБ на всё видео, его не будет: сразу на кадры
    setTimeout(() => { if (!vidOk && !vidBad && sum(got) < 262144) vidFail(); }, 3500);
  }
  function pump() {
    if (!vids.length || vidSeeking) { if (vidSeeking && performance.now() - vidSeekAt > 2000) vidSeeking = false; return; }
    const m = vidMeta(), parts = vidParts(); if (!m || !parts.length) return;
    let i = 0; while (i < parts.length - 1 && vidTarget >= parts[i].off + parts[i].dur) i++;
    const local = Math.min(parts[i].dur - 1 / m.fps, Math.max(0.001, vidTarget - parts[i].off)), x = vids[i];
    if (!x) return;
    if (i !== vidCur) {
      // новый кусок: если он уже стоит на нужном кадре — показать сразу, иначе перемотать и показать по seeked
      if (Math.abs(x.currentTime - local) <= 0.5 / m.fps) { vidCur = i; vidNext = -1; for (let k = 0; k < vids.length; k++) vids[k].classList.toggle('is-on', k === i); vidBehind = false; return; }
      vidNext = i; vidSeeking = true; vidSeekAt = performance.now(); vidBehind = true; try { x.currentTime = local; } catch { vidSeeking = false; }
      return;
    }
    if (Math.abs(x.currentTime - local) <= 0.5 / m.fps) { vidBehind = false; return; }
    vidSeeking = true; vidSeekAt = performance.now(); vidBehind = true;
    try { x.currentTime = local; } catch { vidSeeking = false; }
  }

  // --- размер и серия под ориентацию ---
  function size() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    // пикселей не больше, чем в исходном кадре серии (телефон: tall 720 px → холст не 3× ширины экрана), и не больше 1.5 на тач
    const srcW = man ? (h > w ? man.sets.tall.w : man.sets.wide.w) : 1440;
    dpr = Math.min(window.devicePixelRatio || 1, slow ? 1.5 : 2, Math.max(1, srcW / w));
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
    for (const b of bmps) if (b) { try { b.close(); } catch {} }
    bmps = list.map(() => null); bmpCenter = -1;
    imgs = list.map(() => null); ready = list.map(() => false);
    load(list);
    setupVideo();
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
    const anchors = new Set(order.slice(0, order.indexOf(nFlight) > 0 ? order.indexOf(nFlight) : 8));
    const worker = async () => {
      while (i < order.length && gen === loadGen && !dead) {
        const k = order[i++];
        if (ready[k] || (k < nFlight && !anchors.has(k) && vidMeta() && !vidBad)) continue; // видео пролёта: кадры между опорными не нужны, пока видео не отказало
        try {
          let img = new Image();
          img.crossOrigin = 'anonymous'; img.decoding = 'async';
          const u0 = urlOf(list[k]); img.src = u0;
          try { await img.decode(); } catch (e1) { const u1 = alt(u0); if (!u1) throw e1; img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async'; img.src = u1; await img.decode(); }
          if (gen !== loadGen) return;
          imgs[k] = img; ready[k] = true; if (!root.classList.contains('is-live') || Math.abs(k - bmpCenter) <= 1 || k >= nFlight) { lastKey = ''; wake(); }
          report();
        } catch (e) { /* кадр не пришёл — рисуем ближайший загруженный */ }
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker)); // 8 параллельных: на медленной сети (VPN, мобильный) серия ограничена задержкой запроса, а не полосой
  }
  const nearest = (k) => {
    if (ready[k]) return k;
    for (let d = 1; d < nFlight; d++) { if (k - d >= 0 && ready[k - d]) return k - d; if (k + d < nFlight && ready[k + d]) return k + d; }
    return -1;
  };

  // --- cover-кроп: tall-серия уже в 9:16 с ведением фокуса, тут только вписать ---
  function cover(img, alpha, x0 = 0, x1 = W) {
    if (!img) return;
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
    if (p <= TL.flight && vidOn()) {
      const m = vidMeta(); vidTarget = seg(p, 0, TL.flight) * Math.max(0, vidTotal() - 1 / m.fps); pump();
      if (lastKey !== 'v') ctx.clearRect(0, 0, canvas.width, canvas.height);
      lastKey = 'v'; if (!root.classList.contains('is-live')) root.classList.add('is-live');
      return;
    }
    if (p <= TL.flight) {
      let t = seg(p, 0, TL.flight) * last, a = Math.floor(t), b = Math.min(last, a + 1), al = t - a;
      a = Math.round(t); b = a; al = 0; // один ближайший кадр, без смешивания соседних: смесь двух кадров на движении камеры = двойная крона (§7.1)
      const ia = nearest(a), ib = nearest(b);
      tend(a);
      key = 'f' + ia + ':' + ib + ':' + al.toFixed(3) + ':' + (bmps[ia] ? 1 : 0) + (bmps[ib] ? 1 : 0);
      if (key === lastKey || (ia < 0 && ib < 0)) return;
      if (!lastKey.startsWith('f' + ia + ':' + ib + ':')) flips.push(performance.now());
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (ia >= 0) cover(pick(ia), 1);
      if (ib >= 0 && ib !== ia && al > 0.002) cover(pick(ib), al);
    } else if (p <= TL.groom) {
      const k = ease(seg(p, TL.flight, TL.groom)), ib = ready[last] ? last : nearest(last);
      key = 'g' + ib + ':' + ready[A] + ':' + k.toFixed(4);
      if (key === lastKey || ib < 0) return;
      tend(last);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cover(pick(ib), 1);
      if (ready[A] && k > 0) {
        // кромка покоса: мягкая (F px), впереди неё — светлая полоса свежего среза
        const F = Math.max(40, W * 0.07), edge = -F + k * (W + 2 * F);
        cover(pick(A), 1, 0, Math.max(0, edge - F));
        const S = 10;
        for (let j = 0; j < S; j++) { const x0 = edge - F + (F * j) / S; cover(pick(A), 1 - (j + 0.5) / S, Math.max(0, x0), Math.max(0, x0 + F / S)); }
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
      tend(last);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cover(pick(A), 1);
      if (ready[A + 1] && k > 0) cover(pick(A + 1), k);
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
  // дыхание на покое: пока страница стоит наверху, камера едва дышит по первым кадрам пролёта (период ~9 с) — главная живая без скролла
  // 24.10: дыхание на покое — только CSS-масштабом (.ve-hero.is-idle в 02-hero), кадрами/перемоткой больше не дышим: в видео-режиме это была перемотка туда-сюда по первым кадрам травы — 2–3 смены кадра в секунду, читалось как 5 к/с (владелец)
  const idleOk = () => false;
  // инерция картинки за скроллом: на компьютере 0.16 (≈ 90 мс отставания), на тач 0.4 — у iOS своя инерция, лишнее сглаживание читалось как «отбрасывает» при развороте (владелец, 24.10)
  const EASE_K = (() => { try { return window.matchMedia('(hover:none) and (pointer:coarse)').matches ? 0.4 : 0.16; } catch { return 0.16; } })();
  function loop(now) {
    if (dead) return;
    running = true;
    if ((++tick % 20) === 0) size();
    const p = held != null ? held : progress();
    if (p !== lastP) { lastP = p; onProgress(p); }
    let idle = false;
    if (rm || held != null) curP = p;
    else if (p < 0.002 && idleOk()) { idle = true; if (!slow || tick % 2 === 0) { const ph = (1 - Math.cos(((now || performance.now()) / 9000) * Math.PI * 2)) / 2; curP = (ph * 1.9 * TL.flight) / (nFlight - 1); } }
    else { curP += (p - curP) * EASE_K; if (Math.abs(p - curP) < 0.0004) curP = p; }
    draw(curP);
    const loading = !ready.every(Boolean);
    const vlag = vidOn() && curP <= TL.flight && (vidSeeking || vidBehind);
    if (idle || vlag || Math.abs(p - curP) > 0.0002 || (loading && tick % 10 !== 0 && !vidOn())) requestAnimationFrame(loop);
    else running = false;
  }
  function wake() { if (!running && !dead && !document.hidden) requestAnimationFrame(loop); }

  (opts.manifest ? Promise.resolve(opts.manifest) : fetch(urlOf('manifest.json')).then((r) => r.json())).then((m) => {
    if (dead) return;
    man = m; if (opts.onManifest) opts.onManifest(m); size(); pickSet(); wake();
  }).catch(() => { root.classList.add('is-static'); });

  const onScroll = () => wake();
  setInterval(() => { if (!running && idleOk() && progress() < 0.002) wake(); }, 500); // покой: если цикл уснул, а мы наверху — разбудить дыхание
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onScroll);
  let ro = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { if (size()) wake(); }); ro.observe(stage); }

  return {
    destroy() { dead = true; for (const u of vidUrls) if (u) URL.revokeObjectURL(u); for (const x of vids) x.remove(); for (const b of bmps) if (b) { try { b.close(); } catch {} } bmps = []; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.removeEventListener('visibilitychange', onScroll); if (ro) ro.disconnect(); },
    // отладка: заморозить сцену на прогрессе p (null — вернуть скролл); рисует синхронно, без rAF
    hold(p) { held = p; if (p != null) { curP = p; onProgress(p); lastKey = ''; draw(p); } else wake(); },
    // 24.10: заставка исчерпала 15 с, а видео пролёта ещё не готово — не ждать его с пустым холстом, откатиться на кадры (на 4G видео 21–23 МБ качается ~45 с)
    fallback() { if (wantVid && !vidOk && !vidBad) vidFail(); },
    get progress() { return lastP; },
    info() { const now = performance.now(); while (flips.length && now - flips[0] > 1000) flips.shift(); let r = 0, b = 0; for (let k = 0; k < ready.length; k++) { if (ready[k]) r++; if (bmps[k]) b++; } return (set ? set.name + ' ' + set.w + '×' + set.h + ' ' + (set.frames[0] || '').split('.').pop() : '') + ' · кадров ' + r + '/' + ready.length + (canBmp ? ' · битмапов ' + b : ' · без битмапов') + ' · холст ' + canvas.width + '×' + canvas.height + '\nпролёт: ' + (vidOn() ? 'видео ' + vidMeta().fps + ' к/с' : wantVid ? (vidBad ? 'видео отказало → кадры' : 'видео грузится') : 'кадры') + ' · смен кадра ' + flips.length + '/с'; },
  };
}
