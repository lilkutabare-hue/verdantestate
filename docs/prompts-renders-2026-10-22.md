# Рендеры второй волны — промпты и настройки под плавный моушн (22.10.2026)

Заменяет клипы из `docs/prompts-vertical-2026-10-22.md` и `docs/prompts-magnific.md` §6: те же сцены, но промпты переписаны под прокрутку скроллом. Стиллы S1v–S5v — без изменений.
Картинки для загрузки (JPEG до 1 МБ, тетрадь Magnific §37) — папка `для magnific/` в корне проекта: S1–S4, M, T1–T3, B2, Z1, Z3, Z4, R02, R04, R07.

## Почему так (правила плавности)

1. **Пролёт хиро и смена сезонов не проигрываются, а крутятся скроллом вперёд и назад.** Всё, что движется само (ветер, туман, падающие листья, снежинки), при прокрутке назад едет задом наперёд и мельтешит на месте, когда скролл стоит. Поэтому в этих клипах движется только камера (пролёт) или то, у чего нет направления: цвет листьев, свет, снег слоем.
2. **Одна ровная скорость весь клип.** Скролл ровный → кадр обязан меняться ровно. Разгон и торможение («settles gently») дают при ровном скролле то стоп, то рывок, особенно на стыках клипов.
3. **10 секунд на клип пролёта.** Больше кадров на тот же путь камеры — меньше шаг между кадрами. Сайт теперь берёт все кадры клипа (видео, `?hero=video`).
4. **Каждый кадр резкий.** Скролл может остановиться на любом кадре, смаз в движении на стоп-кадре виден.
5. **Лупы секций (тарифы, способы, «после», лето) играют сами**, не скроллом — там движение можно, а петлю держит start = end.
6. Kling 3.0 (не Omni: у Omni в Magnific нет энд-кадра) · 1080p · звук выкл · по 2 прогона. Из двух прогонов пролёта брать тот, чей последний кадр ближе к старту следующего клипа; скорость и стыки я дополнительно проверю и выровняю на сборке.

## 1. Стиллы 9:16 (Nano Banana 2.1, edit, thinking high, 9:16, 2K — проверить тир в пикере, по 2 генерации)

**S1v, S2v, S3v** — `@img1` = S1 / S2 / S3:
```
Using @img1, change only the frame: extend the scene to a 9:16 vertical frame — keep the original image unchanged in the middle, and continue the sky and the tree crowns naturally above, the lawn and the grass naturally below. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```
**S4v** — `@img1` = S4:
```
Using @img1, change only the frame: extend the scene to a 9:16 vertical frame — keep the original image unchanged in the middle, and continue the lawn and the pine crowns naturally above and below. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```
**S5av** — `@img1` = S4v (принятый), `@img2` = M:
```
Using @img1, change only the state of the garden: it has just been fully cared for. The lawn is freshly mown in perfectly even parallel stripes, the boxwood balls and columnar thujas are clipped to crisp clean shapes, the feather reed grass stands upright, the bronze steel edging is clean and sharp, the joints between the limestone slabs are free of grass. Keep exactly the same, pixel for pixel: the camera, the framing, the position and size of every bed, ball and thuja, the house, the trees, and the warm sunset light with its long shadows. @img2 is ONLY the reference for how the groomed garden looks — the bronze steel edging, the clipped balls, the upright grasses and the clean slabs; its camera and light are not copied.
```
**S5v** — `@img1` = S5av:
```
Using @img1, change only the light: it is now blue hour, half an hour after sunset. The sky light is deep blue and soft, the lawn is dim blue-green, and the lighting of the estate is on: warm hidden linear light under the floating terrace steps and along the edges of the beds, small warm uplights at the base of every thuja, the trunks and crowns of the nearest pines washed softly from below, and the whole glass of the villa glowing warm from inside onto the terrace. All light is warm 2700K, calm and even, without glare and without lens flare. Keep exactly the same, pixel for pixel: the camera, the framing, the house, the garden, every plant and its freshly groomed state.
```
Файлы: `media-src/s1v.png … s4v.png`, `s5av.png`, `s5v.png`.

## 2. Пролёт 9:16 — К1v, К2v, К3v (Kling 3.0, start + end, 10 s, 1080p, 9:16, звук выкл, 2 прогона)

**Negative (все три):**
```
cut, scene change, camera shake, jitter, camera rotation, horizon tilting, zoom pulsing, speed ramp, speeding up, slowing down, pause, motion stopping midway, motion blur, wind, swaying grass, moving leaves, drifting mist, people, animals, birds, insects, cars, text, letters, watermark, house changing shape, windows changing, roof changing, extra buildings, plants morphing, plants growing, new objects, flicker, fisheye, warping, CGI look
```

**К1v** — start = S1v · end = S2v
```
One continuous, slow camera move at one constant speed: the camera rises straight up out of the long grass to eye level, like a crane shot, keeping the villa in the centre of the frame the whole time. As it rises, the close grass blades slide down and out of the bottom of the frame, the focus shifts from the dew drops to the house, and the garden opens up in front. The camera is already moving on the first frame and is still moving on the last frame — no speeding up, no slowing down, no pause anywhere. Only the camera moves: the garden is completely still, like a photograph — no wind, the grass, the leaves and the mist do not move. Every frame is crisp, with no motion blur. The house, the garden and the trees keep exactly the same shapes, positions and morning light throughout.
```

**К2v** — start = S2v · end = S3v
```
One continuous, slow camera move at one constant speed: the camera glides forward across the lawn and along the stepping-slab path toward the villa, gently rising from eye level to about 3.5 metres, keeping the path on the centre line of the frame. The steel-edged beds with their boxwood balls and grasses pass below on both sides, the villa grows larger ahead and the pines slide past in parallax. At the same time the soft morning light turns evenly into clear midday light, the morning haze clears and the shadows shorten, at the same steady pace as the camera. The camera is already moving on the first frame and is still moving on the last frame — no speeding up, no slowing down, no pause anywhere. Only the camera and the light change: the garden is completely still — no wind, no swaying grass, no moving leaves. Every frame is crisp, with no motion blur. The house and every plant keep exactly the same design and position throughout.
```

**К3v** — start = S3v · end = S4v · в Negative дописать `camera spinning, flying over the roof`
```
One continuous, slow drone move at one constant speed: the camera rises high above the garden, drifting back from the villa, and at the same time tilts down evenly until it looks straight down from about 28 metres. The symmetric pattern of the stepping slabs, the steel-edged beds and the rows of boxwood balls gradually unfolds below, with the terrace and the green roof of the villa along the far edge of the frame. The midday light turns evenly into warm sunset light and the shadows of the pines grow long, at the same steady pace as the camera. The camera is already moving on the first frame and is still moving on the last frame — no speeding up, no slowing down, no pause, and the tilt never jumps at the end. Only the camera and the light change: the garden is completely still — no wind, the pine crowns and the grass do not move. Every frame is crisp, with no motion blur. The house and every plant keep exactly the same design and position throughout.
```
Если наклон вниз всё равно рывком в конце — третий прогон с `rises straight up while tilting down` вместо отъезда.
Файлы: `media-src/k1v.mp4`, `k2v.mp4`, `k3v.mp4`.

## 3. Ночной луп 9:16 — К4v (играет сам; Kling 3.0, start = end = S5v, 5 s, 1080p, 9:16, 2 прогона)
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY things that move are the light and the air: the warm garden lights breathe very gently, thin evening mist drifts slowly between the pines, the grass stirs barely, and the clip ends on exactly the starting look. The house, the terrace, the beds and every plant keep exactly the same position and shape.
```
**Negative:** `camera movement, zoom, pan, people, animals, birds, cars, text, watermark, deformation, morphing plants, plants growing, new objects, flicker, background change, lights turning off`
Файл: `media-src/k4v.mp4`.

## 4. Смена сезонов (крутится вкладкой по кадрам; Kling 3.0, start + end, 5 s, 1080p, 16:9, 2 прогона)

**Negative (оба):**
```
camera movement, camera shake, zoom, pan, falling snowflakes, falling leaves, flying leaves, wind, people, animals, birds, cars, text, letters, watermark, deformation, morphing plants, plants growing or changing shape, new objects, flicker, strobing, sudden cuts, speeding up, pause, motion stopping midway
```
**Лето → осень** — start = Z1 · end = Z3
```
Locked-off static camera on a tripod, the exact same garden view for the whole clip. Over the ENTIRE clip, at one steady pace from the first frame to the last, summer turns into autumn: the birch leaves change colour on the branches from green to gold, the hydrangeas fade to pink-beige, the reed grass turns straw-coloured, golden leaves gradually appear on the lawn and the slabs without falling through the air, and the light becomes lower and softer. Nothing flies and there is no wind — everything changes where it is, like a time-lapse. The change never speeds up, never pauses and never stops midway. Every frame is crisp. The house, the hedges, the path, the beds and every tree keep exactly the same shapes and positions throughout.
```
**Осень → зима** — start = Z3 · end = Z4
```
Locked-off static camera on a tripod, the exact same garden view for the whole clip. Over the ENTIRE clip, at one steady pace from the first frame to the last, autumn turns into winter: the last golden leaves fade from the branches, the sky turns pale and overcast, and a layer of snow gradually builds up on the lawn, the hedge tops and the boxwood balls until everything is white, while warm light slowly comes up in the windows of the villa. No snowflakes fall through the air and nothing flies — the snow simply thickens where it lies, like a time-lapse. The change never speeds up, never pauses and never stops midway. Every frame is crisp. The house, the hedges, the path, the beds and every tree keep exactly the same shapes and positions throughout.
```
Файлы: `media-src/season-summer-autumn.mp4`, `season-autumn-winter.mp4`.

## 5. Лупы секций (играют сами; Kling 3.0, 5 s, 1080p, 2 прогона; AR = как у кадра — 4:5 у T и R, 16:9 у B2 и Z1; нет 4:5 в пикере — 1:1)

**Negative (все лупы):**
```
camera movement, zoom, pan, zoom pulsing, breathing scale, people, animals, birds, cars, text, watermark, deformation, morphing plants, plants growing, new objects, flicker, background change, lights turning on
```

**Тень облака** — T1, T2, T3, R02, Z1 · start = end = свой кадр
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: the soft shadow of a passing cloud glides slowly across the lawn from left to right and leaves the frame, and the full sunlight returns, ending on exactly the starting look. The movement is slow and continuous for the whole clip. The house, the plants, the path and the beds stay exactly the same; the grasses stir very slightly.
```
Файлы: `media-src/loop-t1.mp4`, `loop-t2.mp4`, `loop-t3.mp4`, `loop-r02.mp4`, `loop-z1.mp4`.

**«После» в шторке** — B2 · start = B2 · **без end-кадра** (ветер со start = end Kling превращает в пульсацию зума — тетрадь §15.1; петлю туда-обратно соберу сам)
```
Locked-off static camera, the exact same view for the whole clip. The ONLY things that move are the air and the light: a light breeze from the left gently bends the feather reed grass and the hydrangea heads and lets them settle back, again and again for the whole clip, never freezing; thin sunbeams between the pines drift slowly. The terrace, the steps, the path, the beds and the trees keep exactly the same position and shape, and the frame never zooms.
```
В Negative дописать `still frames, frozen grass, motion stopping`. Файл: `media-src/loop-b2.mp4`.

**Подсветка** — R04 · start = end = R04
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: the warm garden lights breathe very gently, thin evening mist drifts slowly between the pines, and the clip ends on exactly the starting look. The house, the beds, the path and every plant keep exactly the same position and shape.
```
Файл: `media-src/loop-r04.mp4`.

**Автополив** — R07 · start = end = R07
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that moves is the water: the sprinklers keep spraying fine arcs of water that sparkle in the low sun and drift slightly in the breeze, continuously for the whole clip, and the clip ends on exactly the starting look. The lawn, the boxwood balls, the pines and the house keep exactly the same position and shape.
```
Файл: `media-src/loop-r07.mp4`.

## 6. Порядок по эффекту на сайт

1. Стиллы S1v–S5v → клипы К1v–К3v → К4v (телефон получает полный вертикальный кадр и все 24 к/с).
2. Тарифы T1–T3. 3. «После» B2. 4. Сезоны. 5. Способы R04, R07, R02. 6. Лето Z1.

Положил файлы — написать мне: соберу (`tools/frames.mjs`, `tools/loops.mjs`), проверю стыки и скорость, выложу превью. Неудобно переименовывать — кидай в «все рендеры» и напиши, какой файл что.
