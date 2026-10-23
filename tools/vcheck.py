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
