#!/usr/bin/env python3
"""tools/remap.py in.mp4 out.mp4 [--frames N] [--crf 14]
Выравнивание скорости клипа под прокрутку скроллом (тетрадь Magnific §47): кадры пересэмплируются так, чтобы
визуальное изменение (средняя |разница| пикселей) на кадр было одинаковым весь клип — Kling тормозит в конце («settles»)
и разгоняется в середине даже при «one constant speed». Первый и последний кадр сохраняются, дробные позиции —
смесь двух соседних кадров. Вход — сырой клип из media-src/alt/*-raw.mp4, выход — media-src/<имя>.mp4 для frames.mjs / loops.mjs.
Проверка до/после: tools/vcheck.py <клип> --curve (10 отрезков кривой движения должны быть ровными)."""
import sys, subprocess, re, numpy as np, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
src, dst = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
def opt(k, d):
    return type(d)(args[args.index(k)+1]) if k in args else d
CRF = opt('--crf', 14)
s = subprocess.run([FF, '-i', src], capture_output=True, text=True).stderr
wh = re.search(r', (\d{3,5})x(\d{3,5})[,\s]', s); W, H = int(wh[1]), int(wh[2])
fps = float(re.search(r'([\d.]+) fps', s)[1])
# 1) motion curve at low res
lw = 320; lh = int(round(H*lw/W)); lh -= lh % 2
raw = subprocess.run([FF, '-v', 'error', '-i', src, '-vf', f'scale={lw}:{lh}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
lo = np.frombuffer(raw, np.uint8).reshape(-1, lh, lw, 3).astype(np.float32)
n = len(lo)
d = np.abs(lo[1:]-lo[:-1]).mean(axis=(1, 2, 3))
d = np.maximum(d, d.mean()*0.05)  # floor: never zero progress
C = np.concatenate([[0], np.cumsum(d)])  # cumulative motion at each input frame
N = opt('--frames', n)
targets = np.linspace(0, C[-1], N)
pos = np.interp(targets, C, np.arange(n))  # fractional input index per output frame
pos[0] = 0; pos[-1] = n-1
print(f'{src}: {n} frames, motion mean {d.mean():.2f} min {d.min():.2f} max {d.max():.2f} -> {N} frames, step {C[-1]/(N-1):.2f}')
# 2) stream full-res frames, emit blends
dec = subprocess.Popen([FF, '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, bufsize=10**8)
enc = subprocess.Popen([FF, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', str(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
fsz = W*H*3
prev = None; cur = None; i = -1; j = 0
def read():
    b = dec.stdout.read(fsz)
    return None if len(b) < fsz else np.frombuffer(b, np.uint8).reshape(H, W, 3)
cur = read(); i = 0
while j < N:
    p = pos[j]
    while i < int(np.ceil(p)):
        prev = cur; cur = read(); i += 1
        if cur is None: cur = prev; break
    lo_i = int(np.floor(p)); w = p - lo_i
    if w < 1e-3 or prev is None or lo_i == i:
        out = cur if lo_i == i else prev
    else:
        out = (prev.astype(np.float32)*(1-w) + cur.astype(np.float32)*w).round().astype(np.uint8)
    enc.stdin.write(out.tobytes()); j += 1
enc.stdin.close(); enc.wait(); dec.stdout.close(); dec.wait()
print('written', dst)
