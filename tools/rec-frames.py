#!/usr/bin/env python3
"""Плавность по записи экрана телефона: сколько кадров «стоит» посреди движения (= пропущенный кадр, рывок).

python3 tools/rec-frames.py ~/Downloads/ScreenRecording_….mov [--top 260 --bottom 160]

Режет статус-бар и панель браузера, жмёт кадр до 96 px в ширину, считает разницу соседних кадров.
По секундам печатает: сколько кадров двигалось, сколько стояло и сколько «повторов в движении» —
кадр без изменений между двумя движущимися. Плавно = 0–1 повтор в секунду при непрерывной прокрутке.
"""
import subprocess, sys

def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return 'ffmpeg'

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    src = args[0]
    top = int(args[args.index('--top') + 1]) if '--top' in args else 260
    bottom = int(args[args.index('--bottom') + 1]) if '--bottom' in args else 160
    ff = ffmpeg()
    probe = subprocess.run([ff, '-i', src], capture_output=True, text=True).stderr
    import re
    m = re.search(r'(\d{3,5})x(\d{3,5})', probe); fpsm = re.search(r'([\d.]+) fps', probe)
    w, h = int(m.group(1)), int(m.group(2)); fps = float(fpsm.group(1)) if fpsm else 60.0
    W, H = 96, int(96 * (h - top - bottom) / w)
    raw = subprocess.run([ff, '-v', 'error', '-i', src, '-vf', f'crop={w}:{h - top - bottom}:0:{top},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    n = len(raw) // (W * H)
    fr = [raw[i * W * H:(i + 1) * W * H] for i in range(n)]
    d = [sum(abs(a - b) for a, b in zip(fr[i], fr[i - 1])) / (W * H) for i in range(1, n)]
    print(f'{src}\n{n} кадров, {fps:.1f} к/с записи\nсек  движ стоп повторов')
    total = 0
    for s in range(int(n / fps)):
        seg = d[int(s * fps):int((s + 1) * fps)]
        if not seg: continue
        moving = sum(1 for x in seg if x > 0.6); still = sum(1 for x in seg if x < 0.15)
        rep = sum(1 for i in range(1, len(seg) - 1) if seg[i] < 0.15 and seg[i - 1] > 0.6 and seg[i + 1] > 0.6)
        total += rep
        print(f'{s:3d}  {moving:4d} {still:4d} {rep:4d}' + ('  ← рывки' if rep >= 3 else ''))
    print(f'всего повторов в движении: {total}')

if __name__ == '__main__':
    main()
