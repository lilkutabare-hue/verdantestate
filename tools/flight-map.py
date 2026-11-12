#!/usr/bin/env python3
"""tools/flight-map.py [--points 49] [--check]
Карта «прокрутка → время» для видео пролёта (12.11.2026). Клипы Kling идут с разной скоростью: внутри клипа и от клипа к клипу.
Раньше скорость выравнивал tools/remap.py пересборкой кадров (ближайший кадр): это давало повторы и выброшенные кадры.
Теперь кадры не трогаем: считаем кривую движения всей цепочки (средняя |разница| соседних кадров на уменьшенной копии — та же мера,
что в remap.py) и пишем в manifest.video.<серия>.map таблицу долей времени на равных шагах прокрутки (и такую же для серии кадров — в manifest.sets.<серия>.map).
Сцена (scene.js, draw) читает её и ставит видео так, чтобы на каждый пиксель прокрутки приходилось одинаковое видимое изменение.

Порядок сборки: frames.mjs (пересобирает манифест) → flight-variants.mjs → flight-map.py. Клип, уже выровненный remap.py, карта не портит.
--check — только напечатать разброс скорости по 10 отрезкам до и после карты, манифест не трогать."""
import sys, os, json, subprocess, re
import numpy as np, imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, MAN = os.path.join(ROOT, 'media-src'), os.path.join(ROOT, 'docs/site/media/scene/manifest.json')
args = sys.argv[1:]
N = int(args[args.index('--points') + 1]) if '--points' in args else 49
SETS = {'wide': ['k1', 'k2', 'k3'], 'tall': ['k1v', 'k2v', 'k3v']}
HOLD = 2  # в конце видео два кадра стилла (flight-variants.mjs)

def motion(path):
    s = subprocess.run([FF, '-i', path], capture_output=True, text=True).stderr
    wh = re.search(r', (\d{3,5})x(\d{3,5})[,\s]', s); W, H = int(wh[1]), int(wh[2])
    lw = 320; lh = int(round(H * lw / W)); lh -= lh % 2
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-vf', f'scale={lw}:{lh}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    lo = np.frombuffer(raw, np.uint8).reshape(-1, lh, lw).astype(np.float32)
    return np.abs(lo[1:] - lo[:-1]).mean(axis=(1, 2)), len(lo)

def spread(d, k=10):  # разброс скорости по k равным отрезкам, % от среднего (как curve_spread в vcheck)
    seg = np.array([c.mean() for c in np.array_split(d, k)]); return float((seg.max() - seg.min()) / seg.mean() * 100)

man = json.load(open(MAN, encoding='utf-8'))
for name, clips in SETS.items():
    paths = [os.path.join(SRC, c + '.mp4') for c in clips]
    if not all(os.path.exists(p) for p in paths) or name not in man.get('video', {}): print(name, '— нет клипов или видео в манифесте, пропуск'); continue
    ds, frames, per = [], 0, []
    for i, p in enumerate(paths):
        d, n = motion(p); frames += n; per.append(n)
        ds.append(d)
        if i < len(paths) - 1: ds.append(np.array([d[-12:].mean()], dtype=np.float32))  # шаг через стык клипов: как соседние кадры
    d = np.concatenate(ds + [np.full(HOLD, 0.0, dtype=np.float32)])
    total = frames + HOLD
    assert len(d) == total - 1, (len(d), total)
    ker = np.ones(13) / 13; ds_ = np.convolve(np.pad(d, 6, mode='edge'), ker, mode='valid')  # сгладить дрожь меры
    ds_ = np.maximum(ds_, ds_.mean() * 0.05)
    C = np.concatenate([[0], np.cumsum(ds_)]); C /= C[-1]          # доля пройденного «движения» к каждому кадру
    tfrac = np.arange(total) / (total - 1)                         # доля времени каждого кадра
    u = np.linspace(0, 1, N)
    mp = np.interp(u, C, tfrac); mp[0] = 0.0; mp[-1] = 1.0
    # проверка: движение на равных шагах прокрутки до и после
    before = np.interp(np.linspace(0, 1, 401), tfrac, C); after = np.interp(np.interp(np.linspace(0, 1, 401), u, mp), tfrac, C)
    sb, sa = spread(np.diff(before)), spread(np.diff(after))
    print(f'{name}: кадров {total}, разброс скорости по 10 отрезкам прокрутки: без карты {sb:.0f} %, с картой {sa:.0f} %; точек {N}')
    # серия кадров (запасной путь без видео): frames.mjs берёт поровну кадров с каждого клипа, поэтому её шкала — «номер клипа + доля внутри клипа»
    cum = np.cumsum([0] + per); tf = mp * (total - 1); fm = []
    for x in tf:
        c = min(len(per) - 1, int(np.searchsorted(cum, x, side='right') - 1)); fm.append(min(1.0, (c + min(1.0, (x - cum[c]) / per[c])) / len(per)))
    fm[0], fm[-1] = 0.0, 1.0
    if '--check' not in args:
        man['video'][name]['map'] = [round(float(x), 4) for x in mp]
        man['sets'][name]['map'] = [round(float(x), 4) for x in fm]
if '--check' not in args:
    json.dump(man, open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2); open(MAN, 'a').write('\n')
    print('manifest.json: карта записана')
