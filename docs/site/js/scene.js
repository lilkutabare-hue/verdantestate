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
  // 07.11: растровые копии кадров выключены везде — с ними вкладка падала по памяти (Chrome владельца: «Aw, Snap», код 11; замер режима кадров: 455 МБ и падение при прокрутке, без копий 230–400 МБ)
  const canBmp = false;
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
  const finalsReady = () => nFlight > 0 && ready.length > nFlight && ready.slice(nFlight - 1).every(Boolean); // последний кадр пролёта + «после» + «вечер»
  function report() {
    if (!opts.onLoad) return;
    const fin = finalsReady();
    if (vidMeta()) { opts.onLoad(vidOk ? (fin ? 1 : 0.99) : vidProg * 0.99, 1, { video: true, ready: vidOk && fin, variant: vidSel ? vidSel.id : 'mp4' }); return; } // честный процент по байтам; готово — видео перемоталось и финальные кадры есть
    let n = 0; for (let q = 0; q < nFlight; q++) if (ready[q]) n++; opts.onLoad(n, nFlight, { video: false, ready: nFlight > 0 && n >= nFlight && fin });
  }
  // Видео пролёта: один файл (m.src) или куски по клипам (m.parts = [{src,dur},…], каждый ≤ 5 МБ — лимит файла в хранилище Тильды).
  // Все куски качаются целиком в память, у каждого свой <video>; виден тот, в чьём отрезке целевое время; стык кусков — тот же кадр (клипы цепочкой),
  // переключение только после того, как новый кусок перемотался на своё место.
  let vids = [], vidUrls = [], vidOk = false, vidBad = false, vidSeeking = false, vidTarget = 0, vidSeekAt = 0, vidFor = '', vidCur = -1, vidNext = -1, vidBehind = false;
  const flips = []; // моменты смены кадра пролёта на экране — для счётчика ?perf=1
  const vidMeta = () => (wantVid && !vidBad && man && man.video && set && man.video[set.name]) || null;
  // варианты видео (manifest.video.<серия>.variants: [{id: av1|hevc|h264|lite, src, bytes, mime, w, h, kbps}]): берём лучший, который устройство
  // декодирует без рывков — HEVC аппаратный или гладкий, AV1 только аппаратный, H.264 всегда; lite — запасной лёгкий на медленной линии.
  // 07.11: HEVC впереди AV1 — при прокрутке пролёта за 8 с HEVC даёт 60 смен кадра/с, AV1 (random access) — 46 (flight-bench, Chrome, M4, видеокарта);
  // Средняя ступень — hevcm (тот же HEVC полегче, 1080p): её тянут все iPhone, AV1 — только 15 Pro и новее; AV1 — для устройств без HEVC.
  // ?codec=av1|hevc|hevcm|h264|lite — принудительно (замеры)
  let vidSel = null, vidQueue = [], vidLite = null, vidSwitched = false, vidWhy = ''; // vidWhy — почему ушли с основного варианта (для ?perf=1 и замеров)
  const forced = (() => { try { return (/[?&]codec=(av1|hevcm?|h264|lite)\b/.exec(location.search) || [])[1] || ''; } catch { return ''; } })(); // hevcm? — раньше ?codec=hevcm молча давал hevc (\b после «hevc» не срабатывал)
  async function score(vr) {
    try {
      const mc = navigator.mediaCapabilities;
      if (mc && mc.decodingInfo) { const r = await mc.decodingInfo({ type: 'file', video: { contentType: vr.mime, width: vr.w, height: vr.h, bitrate: (vr.kbps || 8000) * 1000, framerate: 24 } }); return r.supported ? (r.powerEfficient ? 2 : r.smooth ? 1 : 0) : -1; }
    } catch {}
    try { const c = document.createElement('video').canPlayType(vr.mime); return c === 'probably' ? 1 : c === 'maybe' ? 0 : -1; } catch { return -1; }
  }
  async function chooseVariants(m) {
    const vs = (m && m.variants) || []; if (!vs.length) return [];
    vidLite = vs.find((x) => x.id === 'lite') || null;
    if (forced) { const f = vs.find((x) => x.id === forced); if (f) return [f]; }
    const need = { hevc: 1, hevcm: 1, av1: 2, h264: 0 }, out = [];
    for (const id of ['hevc', 'hevcm', 'av1', 'h264']) { const vr = vs.find((x) => x.id === id); if (!vr) continue; const sc = await score(vr); if (sc >= need[id]) out.push(vr); }
    if (vidLite && !out.length) out.push(vidLite);
    // подсказки самого устройства (Chrome/Android; Safari их не даёт): экономия трафика, сеть 2G, память ≤ 2 ГБ (дешёвые Android:
    // 1080p-декодер и 60 МБ в памяти — риск падения вкладки) → сразу 720p. Оценке скорости navigator.connection.downlink не верим:
    // в начале загрузки Chrome сказал 1,55 Мбит/с на линии 20 (tools/device-bench.mjs, 07.11) — скорость меряем сами по байтам
    try {
      const cn = navigator.connection || {}, mem = navigator.deviceMemory || 0;
      const slowNet = cn.saveData || /^(slow-2g|2g)$/.test(cn.effectiveType || '');
      if (vidLite && !forced && (slowNet || (mem > 0 && mem <= 2))) { vidWhy = 'lite сразу: ' + (cn.saveData ? 'экономия трафика' : slowNet ? 'сеть ' + cn.effectiveType : 'память ' + mem + ' ГБ'); return [vidLite]; }
    } catch {}
    return out;
  }
  const vidParts = () => { const m = vidMeta(); if (!m) return []; if (vidSel) return [{ src: vidSel.src, dur: m.dur, off: 0, bytes: vidSel.bytes || 0 }]; if (m.parts && m.parts.length && (opts.preferParts || !m.src)) { let off = 0; return m.parts.map((q) => { const r = { src: q.src, dur: q.dur, off, bytes: q.bytes || 0 }; off += q.dur; return r; }); } return [{ src: m.src, dur: m.dur, off: 0, bytes: m.bytes || 0 }]; };
  const vidTotal = () => vidParts().reduce((a, q) => a + q.dur, 0);
  const vidOn = () => vidOk && !!vidMeta() && vidFor === set.name;
  const fam = (x) => (x && x.id === 'hevcm' ? 'hevc' : x && x.id === 'lite' ? 'h264' : x && x.id); // семейство декодера
  function vidNextOrFail(why) {
    // вариант не декодировался/не перемотался — пробуем следующий другого кодека (тот же декодер упадёт так же), в конце — кадры.
    // Обрыв сети — не вина декодера: следующий по очереди, хоть того же семейства (08.11: iPhone без AV1 после обрыва HEVC уходил на H.264 → 720p, мимо hevcm)
    if (vidSel && why !== 'сеть') { const f = fam(vidSel); vidQueue = vidQueue.filter((x) => fam(x) !== f); if (vidLite && fam(vidLite) === f) vidLite = null; }
    const nx = vidQueue.shift() || vidLite; if (nx === vidLite) vidLite = null;
    if (nx && !dead) { vidWhy += (vidWhy ? '; ' : '') + nx.id + ': ' + (vidSel ? vidSel.id + ' — ' : '') + (why || '?') + ' на ' + (performance.now() / 1000).toFixed(1) + ' с'; vidSel = nx; vidFor = ''; setupVideo(true); return; } // причина в VE.hero.why — раньше смена кодека проходила молча
    vidFail(why);
  }
  function vidFail(why) {
    if (vidBad) return; vidWhy = 'кадры: ' + (why || '?') + ' на ' + (performance.now() / 1000).toFixed(1) + ' с'; vidBad = true; vidOk = false; vidGen++;
    for (const x of vids) { x.classList.remove('is-on'); x.removeAttribute('src'); try { x.load(); } catch {} x.remove(); }
    for (const u of vidUrls) if (u) URL.revokeObjectURL(u);
    vids = []; vidUrls = []; vidCur = -1; vidNext = -1;
    lastKey = ''; if (set) load(set.frames.concat(set.after || [])); report(); wake(); // догрузить кадры, которые пропускали ради видео
  }
  let vidGen = 0, vidAbort = null; const BUDGET = opts.budget || 27000; // мс от начала загрузки страницы: к этому моменту видео должно быть целиком (владелец: загрузка до 30 с)
  async function setupVideo(again) {
    const m = vidMeta(); if (!m || vidFor === set.name) { for (let i = 0; i < vids.length; i++) vids[i].classList.toggle('is-on', vidOn() && i === vidCur); return; }
    if (!again && m.variants && m.variants.length) { const list = await chooseVariants(m); if (dead) return; vidSel = list.shift() || null; vidQueue = list; if (!vidSel && !m.src) { vidFail('нет варианта'); return; } }
    if (vidAbort) { try { vidAbort.abort(); } catch {} }
    const gen = ++vidGen; vidAbort = window.AbortController ? new AbortController() : null;
    vidFor = set.name; vidOk = false; vidCur = -1; vidNext = -1; vidProg = 0;
    for (const x of vids) x.remove(); for (const u of vidUrls) if (u) URL.revokeObjectURL(u); vids = []; vidUrls = [];
    const parts = vidParts(), got = parts.map(() => 0), tot = parts.map(() => 0); let readyN = 0, at = 0, fetched = 0; // fetched — сколько кусков скачано целиком
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
      x.addEventListener('error', () => { if (gen === vidGen) vidNextOrFail('ошибка декодера'); });
      // файл целиком в память (Blob): перемотка без сети и без Range-запросов; на iOS иначе видео грузится только по play()
      fetch(urlOf(q.src), vidAbort ? { signal: vidAbort.signal } : undefined).then(async (r) => {
        if (!r.ok) throw new Error(r.status);
        tot[i] = +r.headers.get('content-length') || q.bytes || 0; // длина из заголовка, иначе из манифеста (стенд и некоторые хосты отдают chunked)
        if (!r.body || !r.body.getReader) return r.blob();
        const rd = r.body.getReader(), chunks = [];
        for (;;) { const { done, value } = await rd.read(); if (done) break; if (gen !== vidGen) { try { rd.cancel(); } catch {} return null; } chunks.push(value); got[i] += value.length; vidProg = sum(tot) ? Math.min(0.99, sum(got) / sum(tot)) : 0; const now = performance.now(); if (now - at > 120) { at = now; report(); } }
        const blob = new Blob(chunks, { type: 'video/mp4' }); chunks.length = 0; return blob; // куски сразу отпускаем — в памяти одна копия видео
      }).then((b) => {
        if (dead || vidBad || gen !== vidGen || !b) return;
        fetched++;
        const u = URL.createObjectURL(b); vidUrls[i] = u; x.src = u; x.load();
        const first = () => { try { x.currentTime = 0.001; } catch {} };
        x.addEventListener('loadedmetadata', first, { once: true });
        const once = () => { x.removeEventListener('seeked', once); if (gen !== vidGen) return; readyN++; if (readyN === parts.length && !vidBad) { vidOk = true; lastKey = ''; report(); wake(); } };
        x.addEventListener('seeked', once);
        // не перемоталось за 1,5 с — пнуть play/pause (немой инлайн можно без жеста); за 4 с — сдаёмся, остаёмся на кадрах (режим энергосбережения, старый браузер)
        let denied = false; // play() отклонён политикой (режим энергосбережения iPhone, запрет автовоспроизведения) — другой кодек не поможет
        // 08.11: часы 1,5/4 с идут только на видимой вкладке. В скрытой (открыли в фоне, ушли на другую вкладку) Chrome не грузит у видео даже
        // метаданные (readyState 0) — раньше за минуту в фоне перебирались HEVC → AV1 → H.264 → 720p (≈150 МБ) и оставались кадры
        const arm = () => {
          if (vidOk || vidBad || gen !== vidGen) return;
          if (document.hidden) { document.addEventListener('visibilitychange', arm, { once: true }); return; }
          setTimeout(() => { if (!vidOk && !vidBad && gen === vidGen && !document.hidden && readyN < parts.length) { const pr = x.play && x.play(); if (pr && pr.then) pr.then(() => { x.pause(); first(); }, (e) => { denied = !!e && e.name === 'NotAllowedError'; }); } }, 1500);
          setTimeout(() => { if (!vidOk && !vidBad && gen === vidGen) { if (document.hidden) { arm(); return; } if (denied) vidFail('не перемоталось, воспроизведение запрещено'); else vidNextOrFail('не перемоталось за 4 с'); } }, 4000);
        };
        arm();
      }).catch(() => { if (gen === vidGen) vidNextOrFail('сеть'); });
    });
    // обрезанная линия (Cloudflare в России режут поток после ~16 КБ без ошибки): новых байт нет 6 с подряд — видео не будет, сразу на кадры.
    // Раньше было «< 256 КБ за 3,5 с» — ложно срабатывало, когда видео вставало в очередь за шрифтами и кадрами (24.10)
    // + бюджет: через 2 с от начала скачивания считаем скорость; если к BUDGET не успеваем, а лёгкий вариант успевает лучше — переходим на него (один раз)
    let seen = 0, seenAt = performance.now(); const dl0 = performance.now(), hist = [];
    const watch = setInterval(() => {
      if (dead || vidOk || vidBad || gen !== vidGen || fetched === parts.length) { clearInterval(watch); return; } // скачано целиком — дальше дело декодера (часы 4 с), «нет байт» уже не обрыв (08.11: в скрытой вкладке ждали метаданных и уходили на 720p)
      const g = sum(got), now = performance.now();
      if (g > seen) { seen = g; seenAt = now; } else if (now - seenAt > 6000) { clearInterval(watch); if (vidLite && vidSel !== vidLite && !vidSwitched) { vidWhy += (vidWhy ? '; ' : '') + 'lite: нет байт 6 с'; vidSwitched = true; vidQueue = []; vidSel = vidLite; vidFor = ''; setupVideo(true); } else vidFail('нет байт 6 с'); return; }
      // 07.11: скорость — за последние ~3 с, а не средняя с начала: в первые секунды линию делят шрифты, кадры и разгон TCP,
      // и средняя занижала её вдвое (AV1 44 МБ на 20 Мбит/с уходил на lite, хотя успевал к 20-й секунде). Решаем не раньше 4 с.
      hist.push([now, g]); if (hist.length > 7) hist.shift();
      // не успеваем к BUDGET — спускаемся по лесенке (HEVC → AV1 → H.264 → lite): лучший вариант, который с нуля успевает; не успевает никто — самый лёгкий
      if (vidSel && vidSel !== vidLite && now - dl0 > 4000 && hist.length >= 7 && sum(tot)) {
        const rate = (g - hist[0][1]) / (now - hist[0][0]), left = sum(tot) - g, eta = rate > 0 ? left / rate : Infinity;
        if (rate > 0 && now + eta > BUDGET) {
          const alts = vidQueue.concat(vidLite ? [vidLite] : []).filter((x) => x && x !== vidSel && x.bytes && x.bytes < left);
          const nx = alts.find((x) => now + x.bytes / rate <= BUDGET) || alts.reduce((a, b) => (a && a.bytes <= b.bytes ? a : b), null);
          if (nx) { clearInterval(watch); vidWhy += (vidWhy ? '; ' : '') + nx.id + ' на ' + (now / 1000).toFixed(1) + ' с: ' + (rate / 1000).toFixed(2) + ' МБ/с, ' + vidSel.id + ' успел бы к ' + ((now + eta) / 1000).toFixed(0) + ' с'; vidQueue = vidQueue.filter((x) => x !== nx && x.bytes < nx.bytes); vidSel = nx; vidFor = ''; setupVideo(true); }
        }
      }
    }, 500);
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
    // холст не крупнее финальных кадров серии (родной размер рендеров, 24.10 max quality) и не больше 3× экрана; раньше 480/1440 px и 1,5× на тач
    const ss = man ? (h > w ? man.sets.tall : man.sets.wide) : null, srcW = ss ? (ss.hiw || ss.w) : 1440;
    dpr = Math.min(window.devicePixelRatio || 1, 3, Math.max(1, srcW / w));
    try { const cw = +(/[?&]canvasw=(\d+)/.exec(location.search) || [])[1]; if (cw) dpr = Math.min(dpr, Math.max(1, cw / w)); } catch {} // диагностика: ?canvasw=480 — потолок ширины холста (сравнение с прежним размером)
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
    const gen = ++loadGen, order = [], tries = [], step = Math.max(1, Math.round(nFlight / 6));
    for (let i = 0; i < nFlight; i += step) order.push(i);
    if (!order.includes(nFlight - 1)) order.push(nFlight - 1);
    for (let i = nFlight; i < list.length; i++) order.push(i);
    for (let i = 0; i < nFlight; i++) if (!order.includes(i)) order.push(i);
    let i = 0;
    const anchors = new Set([0, nFlight - 1]); // в видео-режиме из кадров пролёта нужны только первый (запас) и последний (на нём стоит покос)
    const worker = async () => {
      while (i < order.length && gen === loadGen && !dead) {
        const k = order[i++];
        if (ready[k] || (k < nFlight && !anchors.has(k) && vidMeta() && !vidBad)) continue; // видео пролёта: остальные кадры не нужны, пока видео не отказало
        try {
          let img = new Image();
          img.crossOrigin = 'anonymous'; img.decoding = 'async';
          const u0 = urlOf(list[k]); img.src = u0;
          try { await img.decode(); } catch (e1) { const u1 = alt(u0); if (!u1) throw e1; img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async'; img.src = u1; await img.decode(); }
          if (gen !== loadGen) return;
          imgs[k] = img; ready[k] = true; if (k >= nFlight - 1) warm(img); if (!root.classList.contains('is-live') || Math.abs(k - bmpCenter) <= 1 || k >= nFlight) { lastKey = ''; wake(); }
          report();
        } catch (e) { // кадр не пришёл — ещё две попытки через 1 и 2 с, потом рисуем ближайший загруженный.
          // 08.11: без повтора один оборванный кадр «после покоса» держал заставку на 99 % до 45-й секунды, а покос и вечер не появлялись вовсе
          if (gen === loadGen && !dead && (tries[k] = (tries[k] || 0) + 1) < 3) { await new Promise((r) => setTimeout(r, 1000 * tries[k])); order.push(k); }
        }
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker)); // 8 параллельных: на медленной сети (VPN, мобильный) серия ограничена задержкой запроса, а не полосой
  }
  const nearest = (k) => {
    if (ready[k]) return k;
    for (let d = 1; d < nFlight; d++) { if (k - d >= 0 && ready[k - d]) return k - d; if (k + d < nFlight && ready[k + d]) return k + d; }
    return -1;
  };

  // прогрев финальных кадров (последний кадр пролёта, «после», «вечер» — родной размер): один раз рисуем 1×1 с почти нулевой прозрачностью,
  // чтобы текстура ушла на видеокарту заранее, а не в первом кадре покоса (иначе рывок ~0,3 с на эмуляции); следующий draw всё перерисует
  const warmed = new Set();
  function warm(img) {
    if (warmed.has(img)) return; warmed.add(img);
    const go = () => { if (dead) return; ctx.save(); ctx.globalAlpha = 0.01; ctx.drawImage(img, 0, 0, 1, 1); ctx.restore(); ctx.clearRect(0, 0, 1, 1); lastKey = ''; wake(); };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 200);
  }
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
    fallback() { if (wantVid && !vidOk && !vidBad) vidFail('заставка'); },
    get variant() { return vidSel ? vidSel.id : null; },
    get why() { return vidWhy; },
    get progress() { return lastP; },
    info() { const now = performance.now(); while (flips.length && now - flips[0] > 1000) flips.shift(); let r = 0, b = 0; for (let k = 0; k < ready.length; k++) { if (ready[k]) r++; if (bmps[k]) b++; } return (set ? set.name + ' ' + set.w + '×' + set.h + ' ' + (set.frames[0] || '').split('.').pop() : '') + ' · кадров ' + r + '/' + ready.length + (canBmp ? ' · битмапов ' + b : ' · без битмапов') + ' · холст ' + canvas.width + '×' + canvas.height + '\nпролёт: ' + (vidOn() ? 'видео ' + (vidSel ? vidSel.id + ' ' : '') + vidMeta().fps + ' к/с' : wantVid ? (vidBad ? 'видео отказало → кадры' : 'видео грузится') : 'кадры') + ' · смен кадра ' + flips.length + '/с'; },
  };
}
