#!/usr/bin/env python3
"""tools/vcheck.py клип.mp4 [--still кадр] [--next кадр] [--loop] [--curve]
Приёмка клипов Kling (prompts-renders §2–5): размер/длина/fps; первый кадр против стилла (--still, допуск 3/255 — у выхода
Kling против исходного рендера обычно 4–6: пересжатие и ресайз), последний кадр против старта следующего клипа (--next, ≤ 8 —
растворение RAMP в frames.mjs), шов петли последний↔первый (--loop, ≤ 3), кривая движения по 10 отрезкам (--curve) и мёртвые
кадры в начале/конце. Разницы — среднее |RGB| на кадре 640 px, в единицах 0–255. Неровную кривую выравнивает tools/remap.py."""
import sys, subprocess, json, tempfile, os
import numpy as np
from PIL import Image
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
FP = FF.replace('ffmpeg', 'ffprobe') if os.path.exists(FF.replace('ffmpeg','ffprobe')) else None

def probe(f):
    r = subprocess.run([FF, '-i', f], capture_output=True, text=True)
    s = r.stderr
    import re
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', s); wh = re.search(r', (\d{3,5})x(\d{3,5})[,\s]', s); fps = re.search(r'([\d.]+) fps', s)
    return dict(dur=int(d[1])*3600+int(d[2])*60+float(d[3]), w=int(wh[1]), h=int(wh[2]), fps=float(fps[1]) if fps else None)

def frames(f, n=None, scale=320):
    """Decode all frames scaled to width `scale` as uint8 arrays (gray not — RGB)."""
    p = probe(f)
    w = scale; h = int(round(p['h']*scale/p['w'])); h -= h % 2
    cmd = [FF, '-v', 'error', '-i', f, '-vf', f'scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    return arr, p

def frame_at(f, t=None, last=False, scale=None):
    p = probe(f)
    a = ['-sseof', '-0.08', '-i', f, '-update', '1'] if last else ['-ss', f'{t:.3f}', '-i', f, '-frames:v', '1']
    out = tempfile.mktemp(suffix='.png')
    subprocess.run([FF, '-y', '-v', 'error', *a, out], check=True)
    im = Image.open(out).convert('RGB'); os.unlink(out)
    return im

def diff(a, b):
    a = a.convert('RGB'); b = b.convert('RGB')
    if a.size != b.size:
        # center-crop both to the same aspect, then resize
        ra, rb = a.size[0]/a.size[1], b.size[0]/b.size[1]
        def crop_to(im, r):
            w, h = im.size
            if w/h > r: nw = int(h*r); return im.crop(((w-nw)//2, 0, (w-nw)//2+nw, h))
            nh = int(w/r); return im.crop((0, (h-nh)//2, w, (h-nh)//2+nh))
        r = min(ra, rb) if abs(ra-rb) > 0.01 else ra
        a = crop_to(a, r); b = crop_to(b, r)
        b = b.resize(a.size, Image.LANCZOS)
    s = (640, int(640*a.size[1]/a.size[0]))
    A = np.asarray(a.resize(s, Image.LANCZOS), np.float32); B = np.asarray(b.resize(s, Image.LANCZOS), np.float32)
    return float(np.abs(A-B).mean())

if __name__ == '__main__':
    f = sys.argv[1]; args = sys.argv[2:]
    p = probe(f); print(f"{os.path.basename(f)}: {p['w']}x{p['h']} {p['dur']:.2f}s {p['fps']}fps")
    first = frame_at(f, 0); last = frame_at(f, last=True)
    if '--still' in args:
        st = Image.open(args[args.index('--still')+1]); print(f"  first vs still: {diff(first, st):.2f}/255")
    if '--next' in args:
        nx = Image.open(args[args.index('--next')+1]); print(f"  last vs next-start: {diff(last, nx):.2f}/255")
    if '--loop' in args:
        print(f"  loop seam (last vs first): {diff(last, first):.2f}/255")
    if '--curve' in args:
        arr, _ = frames(f)
        a = arr.astype(np.float32)
        d = np.abs(a[1:]-a[:-1]).mean(axis=(1,2,3))
        n = len(d); seg = max(1, n//10)
        segs = [d[i:i+seg].mean() for i in range(0, n, seg)]
        print(f"  frames {len(arr)}, motion per frame: mean {d.mean():.2f}, min {d.min():.2f}, max {d.max():.2f}")
        print("  curve (10 segments): " + ' '.join(f'{x:.2f}' for x in segs))
        # dead edges: frames at start/end with diff < 25% of mean
        thr = d.mean()*0.25
        lead = 0
        while lead < n and d[lead] < thr: lead += 1
        tail = 0
        while tail < n and d[n-1-tail] < thr: tail += 1
        print(f"  dead frames: lead {lead}, tail {tail} (thr {thr:.2f})")

# ---- §7.5 приёмка числами: стык в низком разрешении, кадры-смеси, сырой против сайта ----
def lowres_diff(a, b, w=160):
    a = a.convert('RGB'); b = b.convert('RGB')
    if a.size[0]/a.size[1] != b.size[0]/b.size[1]:
        r = min(a.size[0]/a.size[1], b.size[0]/b.size[1])
        def crop_to(im):
            W, H = im.size
            if W/H > r: nw = int(H*r); return im.crop(((W-nw)//2, 0, (W-nw)//2+nw, H))
            nh = int(W/r); return im.crop((0, (H-nh)//2, W, (H-nh)//2+nh))
        a = crop_to(a); b = crop_to(b)
    h = max(1, round(w*a.size[1]/a.size[0]))
    A = np.asarray(a.resize((w, h), Image.LANCZOS), np.float32); B = np.asarray(b.resize((w, h), Image.LANCZOS), np.float32)
    return float(np.abs(A-B).mean())

def blends(f):
    """Кадры-смеси (remap --blend): смесь двух кадров заметно мягче соседей — резкость (дисперсия лапласиана) проваливается на один кадр."""
    arr, _ = frames(f, scale=320); g = arr.astype(np.float32).mean(axis=3)
    lap = np.abs(g[:, 1:-1, 1:-1]*4 - g[:, :-2, 1:-1] - g[:, 2:, 1:-1] - g[:, 1:-1, :-2] - g[:, 1:-1, 2:])
    sh = lap.reshape(len(g), -1).var(axis=1); n = 0; bad = []
    for i in range(1, len(sh)-1):
        if sh[i] < 0.85*min(sh[i-1], sh[i+1]) and np.abs(g[i]-g[i-1]).mean() > 0.5: n += 1; bad.append(i)
    return n, bad[:10]

def vs_site(raw, site, t=2.0):
    """Сырой клип против того, что отдаёт сайт, на размере сайта: средняя |разница| и PSNR."""
    a = frame_at(raw, t); b = frame_at(site, t)
    r = b.size[0]/b.size[1]
    W, H = a.size
    if W/H > r: nw = int(H*r); a = a.crop(((W-nw)//2, 0, (W-nw)//2+nw, H))
    else: nh = int(W/r); a = a.crop((0, (H-nh)//2, W, (H-nh)//2+nh))
    # кроп сайта может быть сдвинут на 1–8 px (округление в loops.mjs) — ищем лучшее совмещение
    best = None
    RA = np.asarray(frame_at(raw, t), np.float32); B = np.asarray(b, np.float32); Hs, Ws = B.shape[:2]
    if RA.shape[0] >= Hs and RA.shape[1] >= Ws:
        cx, cy = (RA.shape[1]-Ws)//2, (RA.shape[0]-Hs)//2  # ожидаемый кроп по центру ± 8 px
        for dy in range(max(0, cy-8), min(RA.shape[0]-Hs, cy+8)+1):
            for dx in range(max(0, cx-8), min(RA.shape[1]-Ws, cx+8)+1):
                A = RA[dy:dy+Hs, dx:dx+Ws]; d = float(np.abs(A-B).mean())
                if best is None or d < best[0]: best = (d, A)
        A = best[1]
    else:
        A = np.asarray(a.resize(b.size, Image.LANCZOS), np.float32)
    mse = float(((A-B)**2).mean()); psnr = 10*np.log10(255*255/mse) if mse > 0 else 99
    return float(np.abs(A-B).mean()), psnr

if __name__ == '__main__' and len(sys.argv) > 2:
    f = sys.argv[1]; args = sys.argv[2:]
    if '--next-lowres' in args:
        nx = Image.open(args[args.index('--next-lowres')+1]); print(f"  joint lowres (160 px): last vs next-start {lowres_diff(frame_at(f, last=True), nx):.2f}/255")
    if '--still-lowres' in args:
        st = Image.open(args[args.index('--still-lowres')+1]); print(f"  joint lowres (160 px): first vs still {lowres_diff(frame_at(f, 0), st):.2f}/255")
    if '--blends' in args:
        n, bad = blends(f); print(f"  blended frames: {n}" + (f" (e.g. {bad})" if bad else ''))
    if '--vs' in args:
        site = args[args.index('--vs')+1]; d, p = vs_site(f, site); print(f"  raw vs site @2s: {d:.2f}/255, PSNR {p:.1f} dB")

# ---- A0 «сцена без морфа» (план финала A0, урок L-073): верхняя треть кадра ----
# Камера едет — верх кадра сдвигается и чуть масштабируется, это законно; морф содержимого (кроны выгорают в дымку,
# дымка перерисовывается в небо с облаками) меняет сам рисунок. IoU карт краёв из плана при движущейся камере не работает
# (0,2–0,8 даже на спокойных местах), поэтому: корреляция при лучшем сдвиге и скачки резкости. Калибровка 24.10 на клипах
# цепочки: K1v (кроны выгорели) NCC к первому кадру 0,40, K1 16:9 — 0,99; K2v (небо перерисовано) 0,59 и скачок резкости 34 %,
# K2 16:9 — 0,85 и 23 %; на стыке К1v→К2v старт К2 за 1,5 с уходит от последнего кадра К1 до 0,93. Новые К1 с замком на лес (24.10):
# 16:9 — 0,98, 9:16 — 0,85; К2 с замком: 16:9 — 0,90, 9:16 — 0,75 (слабеют лучи и дымка, кроны на месте — глазами ок); К2v первого прогона,
# улетевший к фасаду, — 0,40. Карты краёв вместо яркости разделяют хуже (плохие 0,09–0,61, хорошие 0,42–0,82). Гейт NCC ≥ .70; скачок резкости у К1 — не гейт (перевод фокуса).
def top_third_samples(f, step_s=0.5, scale=160):
    arr, p = frames(f, scale=scale); fps = p['fps'] or 24; step = max(1, int(round(fps*step_s)))
    idx = list(range(0, len(arr), step))
    if idx[-1] != len(arr)-1: idx.append(len(arr)-1)
    H = arr.shape[1]
    return [arr[i, :H//3].astype(np.float32).mean(axis=2) for i in idx]

def _blur(g, s=2.0):
    from PIL import ImageFilter
    return np.asarray(Image.fromarray(np.clip(g, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s)), np.float32)

def ncc_aligned(a, b, r=12):
    """Нормированная корреляция двух серых карт при лучшем сдвиге ±r px (размытие σ2, чтобы не ловить шум сжатия)."""
    a = _blur(a); b = _blur(b); H, W = a.shape; best = -2.0
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            A = a[max(0, dy):H+min(0, dy), max(0, dx):W+min(0, dx)]; B = b[max(0, -dy):H+min(0, -dy), max(0, -dx):W+min(0, -dx)]
            A = A - A.mean(); B = B - B.mean(); d = np.sqrt((A*A).sum()*(B*B).sum())
            c = float((A*B).sum()/d) if d > 0 else 0.0
            if c > best: best = c
    return best

def lapvar(g):
    lap = np.abs(g[1:-1, 1:-1]*4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]); return float(lap.var())

def scene_morph(f, prev=None):
    """(1) min NCC верхней трети каждого замера (шаг 0,5 с, 160 px) против первого кадра клипа; (2) max скачок резкости
    (дисперсия лапласиана, 640 px) верхней трети между соседними замерами, %; (3) если дан prev (PIL, последний кадр
    предыдущего клипа) — min NCC замеров 0,5–1,5 с против него. Возвращает (ncc_first, jump_pct, joint_or_None)."""
    lo = top_third_samples(f, scale=160); hi = top_third_samples(f, scale=640)
    ncc_first = min(ncc_aligned(lo[0], x) for x in lo[1:])
    sh = [lapvar(x) for x in hi]; jump = max(abs(sh[k+1]-sh[k])/max(1e-6, sh[k])*100 for k in range(len(sh)-1))
    joint = None
    if prev is not None:
        pv = np.asarray(prev.convert('L').resize((160, round(160*prev.size[1]/prev.size[0])), Image.LANCZOS), np.float32); pv = pv[:pv.shape[0]//3]
        h = min(pv.shape[0], lo[1].shape[0]); w = min(pv.shape[1], lo[1].shape[1])
        joint = min(ncc_aligned(pv[:h, :w], x[:h, :w]) for x in lo[1:4])
    return ncc_first, jump, joint

if __name__ == '__main__' and len(sys.argv) > 2 and '--morph' in sys.argv:
    f = sys.argv[1]; args = sys.argv[2:]
    prev = Image.open(args[args.index('--prev')+1]) if '--prev' in args else None
    n, j, jo = scene_morph(f, prev)
    print(f"  scene morph (top third): NCC vs first {n:.3f}, sharpness jump {j:.0f} %" + (f", joint vs prev {jo:.3f}" if jo is not None else ''))
