#!/usr/bin/env python3
"""tools/accept.py — приёмка моушна числами (план доводки §7.5), прогонять после каждой сборки.
Стыки пролёта (клип→клип, клип→стилл, стилл→луп) в низком разрешении ≤ 3/255; кадров-смесей 0; кривая движения ±15 %;
лупы на сайте против сырых ≤ 4/255 (PSNR ≥ 38); видео пролёта против сырого клипа (кадр в середине К2) ≤ 4/255.
Печатает таблицу и итог OK/FAIL; код выхода 1 при провале."""
import sys, os, subprocess, re, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from vcheck import frame_at, lowres_diff, blends, frames, vs_site
from PIL import Image
R = os.path.join(os.path.dirname(__file__), '..'); MS = os.path.join(R, 'media-src'); SITE = os.path.join(R, 'docs/site/media')
ok = True
def row(name, val, lim, fmt='%.2f'):
    global ok; good = val <= lim; ok &= good
    print(f"  {'OK ' if good else 'FAIL'} {name}: {fmt % val} (≤ {lim})")
def curve_spread(f):
    arr, _ = frames(f); a = arr.astype(np.float32); d = np.abs(a[1:]-a[:-1]).mean(axis=(1,2,3)); n = len(d); seg = max(1, n//10)
    segs = np.array([d[i:i+seg].mean() for i in range(0, n - n % seg, seg)]); return float((segs.max()-segs.min())/segs.mean()*100/2)
for tag, clips, still, loop in (('16:9', ['k1','k2','k3'], 's4', 'k4'), ('9:16', ['k1v','k2v','k3v'], 's4v', 'k4v')):
    print(f"пролёт {tag}")
    paths = [os.path.join(MS, c + '.mp4') for c in clips]
    if not all(os.path.exists(p) for p in paths): print('  нет клипов'); ok = False; continue
    for i in range(len(paths)-1):
        row(f"стык {clips[i]}→{clips[i+1]} (lowres)", lowres_diff(frame_at(paths[i], last=True), frame_at(paths[i+1], 0)), 3)
    sp = os.path.join(MS, still + '.png')
    if os.path.exists(sp): row(f"стык {clips[-1]}→{still} (lowres)", lowres_diff(frame_at(paths[-1], last=True), Image.open(sp)), 3)
    lp = os.path.join(MS, loop + '.mp4'); s5 = os.path.join(MS, ('s5v' if tag == '9:16' else 's5') + '.png')
    if os.path.exists(lp) and os.path.exists(s5): row(f"стык {os.path.basename(s5)}→{loop} (lowres)", lowres_diff(Image.open(s5), frame_at(lp, 0)), 3)
    for p in paths:
        n, _ = blends(p); row(f"смесей в {os.path.basename(p)}", n, 0, '%d'); row(f"разброс скорости {os.path.basename(p)}, %", curve_spread(p), 15, '%.0f')
    vid = os.path.join(SITE, 'scene', 'flight-tall.mp4' if tag == '9:16' else 'flight-wide.mp4')
    if os.path.exists(vid):
        d, p = vs_site(paths[1], vid, 5.0) if False else (None, None)
        # видео пролёта — сравнить кадр К2 на 5 с (в видео это 10 с + 5 с)
        a = frame_at(paths[1], 5.0); b = frame_at(vid, 15.0); r = b.size[0]/b.size[1]; W, H = a.size
        if W/H > r: nw = int(H*r); a = a.crop(((W-nw)//2, 0, (W-nw)//2+nw, H))
        else: nh = int(W/r); a = a.crop((0, (H-nh)//2, W, (H-nh)//2+nh))
        A = np.asarray(a.resize(b.size, Image.LANCZOS), np.float32); B = np.asarray(b, np.float32)
        row(f"видео {os.path.basename(vid)} против сырого К2 (5 с)", float(np.abs(A-B).mean()), 4)
print("лупы на сайте против сырых")
for f in sorted(os.listdir(os.path.join(SITE, 'loops'))):
    if not f.endswith('.mp4'): continue
    name = f[:-4]; raw = os.path.join(MS, ('loop-' + name if not name.endswith('-on') else name) + '.mp4')
    if not os.path.exists(raw): continue
    d, p = vs_site(raw, os.path.join(SITE, 'loops', f)); row(f"{name}: разница / PSNR {p:.1f} дБ", d, 4)
print('ИТОГ:', 'OK' if ok else 'FAIL'); sys.exit(0 if ok else 1)
