#!/usr/bin/env python3
"""tools/morph-sheet.py out.png клип1.mp4 [клип2.mp4 ...] [--step 2.5] [--full]
Лист кропов верха кадра (верхняя треть; --full — весь кадр) по времени: строка — клип, столбцы — замеры с шагом --step с.
Для приёмки A0 «сцена без морфа» глазами: кроны/небо должны быть одним рисунком от первого до последнего столбца."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from vcheck import frame_at, probe
from PIL import Image, ImageDraw
out = sys.argv[1]; args = sys.argv[2:]
step = float(args[args.index('--step')+1]) if '--step' in args else 2.5
full = '--full' in args
clips = [a for a in args if a.endswith('.mp4')]
W = 360; rows = []
for c in clips:
    d = probe(c)['dur']; ts = [i*step for i in range(int(d/step)+1)]
    if d - ts[-1] > 0.3: ts.append(d)
    tiles = []
    for t in ts:
        im = frame_at(c, min(t, d-0.05)) if t < d-0.05 else frame_at(c, last=True)
        if not full: im = im.crop((0, 0, im.size[0], im.size[1]//3))
        h = round(W*im.size[1]/im.size[0]); tiles.append((t, im.resize((W, h), Image.LANCZOS)))
    rows.append((os.path.basename(c), tiles))
th = max(t.size[1] for _, tiles in rows for _, t in tiles); cols = max(len(t) for _, t in rows)
sheet = Image.new('RGB', (cols*(W+6)+6, len(rows)*(th+26)+6), (24, 24, 24)); dr = ImageDraw.Draw(sheet)
for r, (name, tiles) in enumerate(rows):
    y = 6 + r*(th+26); dr.text((8, y+th+6), name, fill=(220, 220, 220))
    for k, (t, im) in enumerate(tiles):
        x = 6 + k*(W+6); sheet.paste(im, (x, y)); dr.text((x+4, y+4), f'{t:.1f}s', fill=(255, 255, 0))
sheet.save(out); print('saved', out, sheet.size)
