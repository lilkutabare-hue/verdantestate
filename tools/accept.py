#!/usr/bin/env python3
"""tools/accept.py — приёмка моушна числами (план доводки §7.5), прогонять после каждой сборки.
Стыки пролёта (клип→клип, клип→стилл, стилл→луп) в низком разрешении ≤ 3/255; кадров-смесей 0; кривая движения ±15 %;
лупы на сайте против сырых ≤ 4/255 (PSNR ≥ 38); видео пролёта против сырого клипа (кадр в середине К2) ≤ 4/255;
«сцена без морфа» (A0, L-073): верх кадра К1/К2 держит рисунок — NCC к первому кадру ≥ .80, скачки резкости К2 ≤ 15 %, старт К2 против конца К1 ≥ .95.
Печатает таблицу и итог OK/FAIL; код выхода 1 при провале."""
import sys, os, subprocess, re, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from vcheck import frame_at, lowres_diff, blends, frames, vs_site, scene_morph
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
    # A0 «сцена без морфа» (L-073). К1 — подъём на месте: верх кадра против первого кадра NCC ≥ .80 (лучи и дымка слабеют — это свет,
    # допустимо; у старого К1v с выгоревшими кронами 0,40); скачок резкости у К1 не гейт — перевод фокуса с травы на дом.
    # К2 — ход вперёд без перевода фокуса: NCC ≥ .80, скачки резкости ≤ 15 % (у старого К2v небо перерисовывалось: 34 %),
    # старт К2 (0,5–1,5 с) против последнего кадра К1 NCC ≥ .95. К3 — только справочно: камера уходит вверх, верх кадра меняется по замыслу.
    for i in (0, 1):
        ncc, jump, joint = scene_morph(paths[i], frame_at(paths[i-1], last=True) if i else None)
        row(f"морф верха {clips[i]}: 1−NCC против первого кадра", 1-ncc, 0.20)
        if i: row(f"морф верха {clips[i]}: скачок резкости, %", jump, 15, '%.0f')
        else: print(f"  инфо {clips[i]}: скачок резкости {jump:.0f} % (перевод фокуса — не гейт)")
        if joint is not None: row(f"морф верха на стыке {clips[i-1]}→{clips[i]} (0,5–1,5 с): 1−NCC", 1-joint, 0.05)
    ncc3, jump3, _ = scene_morph(paths[2]); print(f"  инфо {clips[2]}: 1−NCC {1-ncc3:.2f}, скачок резкости {jump3:.0f} % (камера уходит вверх — не гейт)")
    for p in paths:
        n, _ = blends(p); row(f"смесей в {os.path.basename(p)}", n, 0, '%d'); row(f"разброс скорости {os.path.basename(p)}, %", curve_spread(p), 15, '%.0f')
    vid = os.path.join(SITE, 'scene', 'flight-tall.mp4' if tag == '9:16' else 'flight-wide.mp4')
    if os.path.exists(vid):
        # видео пролёта — тот же кадр по индексу: кадр 120 клипа К2 = кадр (кадров в К1) + 120 в видео; сравниваем на размере видео
        import imageio_ffmpeg, tempfile
        FF = imageio_ffmpeg.get_ffmpeg_exe()
        def fidx(f, idx, size=None):
            o = tempfile.mktemp(suffix='.png'); vf = f'select=eq(n\\,{idx})' + (f',scale={size[0]}:{size[1]}:force_original_aspect_ratio=increase:flags=lanczos,crop={size[0]}:{size[1]}' if size else '')
            subprocess.run([FF, '-y', '-v', 'error', '-i', f, '-vf', vf, '-vsync', '0', '-frames:v', '1', o], check=True); im = Image.open(o).convert('RGB'); os.unlink(o); return im
        n1 = len(frames(paths[0], scale=64)[0]); b = fidx(vid, n1 + 120); a = fidx(paths[1], 120, b.size)
        A = np.asarray(a, np.float32); B = np.asarray(b, np.float32); mse = float(((A-B)**2).mean()); psnr = 10*np.log10(255*255/mse) if mse > 0 else 99
        row(f"видео {os.path.basename(vid)} против сырого К2 (кадр 120), PSNR {psnr:.1f} дБ", float(np.abs(A-B).mean()), 4)
print("лупы на сайте против сырых")
for f in sorted(os.listdir(os.path.join(SITE, 'loops'))):
    if not f.endswith('.mp4'): continue
    name = f[:-4]; raw = os.path.join(MS, ('loop-' + name if not name.endswith('-on') else name) + '.mp4')
    if not os.path.exists(raw): continue
    d, p = vs_site(raw, os.path.join(SITE, 'loops', f)); row(f"{name}: разница / PSNR {p:.1f} дБ", d, 4)
print('ИТОГ:', 'OK' if ok else 'FAIL'); sys.exit(0 if ok else 1)
