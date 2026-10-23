# Рендеры второй волны — промпты и настройки под плавный моушн (22.10.2026 · v2 23.10, проверка Fable 5.1)

Заменяет клипы из `docs/prompts-vertical-2026-10-22.md` и `docs/prompts-magnific.md` §6: те же сцены, но промпты переписаны под прокрутку скроллом. Стиллы S1v–S5v — без изменений.
Картинки для загрузки (JPEG ≤ 980 КБ, тетрадь Magnific §37) — папка `для magnific/` в корне проекта: S1–S4, M, T1–T3, B2, Z1, Z3, Z4, R02, R04, R07. Все проверены 23.10: 16:9-кадры 2560×1429, карточки 1856×2304 (4:5); T1, T2, R07 пережаты до ≤ 950 КБ.

## Что изменилось в v2 (23.10, сверка с тетрадью §4/§28/§34/§40.1/§47/§49.1, с кадрами и со сборкой)

- **R02** — в кадре лучи в тумане между сосен и фонари, а не открытый газон: промпт «тень облака» заменён на «свет и воздух» (как у B2). **R04** — тумана в кадре нет, с start = end он должен был бы появиться и исчезнуть: убран, дышит только подсветка. **T3** — в кадре зеркальный бассейн: добавлено «вода неподвижна».
- **Сезоны** — в негатив добавлены `cross-dissolve, crossfade, ghosting, double exposure`: при start/end разных сезонов дешёвый путь модели — растворение, а не таймлапс.
- **Стиллы 9:16** — расширение описано тем, что ЕСТЬ в новых зонах (небо и кроны сверху, газон и дорожка снизу), оригинал — средняя полоса на всю ширину, ничего не обрезано; рефы названы «the first image / the second image» (так советует гайд Nano Banana 2.1; `@img1` — нотация интерфейса Magnific). S5av/S5v держат дорисованные зоны S4v — иначе на превращении S4v→S5av→S5v поплывёт окружение.
- **Прогоны:** по умолчанию **1 прогон**, второй — только по критерию (см. карточки): через API каждый прогон платный, а у лупов «ONLY the light» разные прогоны взаимозаменяемы (§34).
- **Пропорция у Kling по API** — следует за старт-кадром (image-to-video); 4:5 у карточек отдавать как есть. После первого лупа сверить размер выхода и первый кадр со стиллом карточки (≤ 3/255); если не совпало — стилл карточки пересобрать из постера лупа (страница кладёт `<video>` поверх `<img>` с `object-fit: cover`, рассинхрон кадрирования будет виден как прыжок).
- Nano Banana 2.1 **по API без thinking и без негатива** (§49) — «thinking high» только в интерфейсе; всё, чего не должно быть, уже в теле промпта.

## Прогон по API — порядок, зависимости, бюджет

Правила §49.1: `account_balance` до старта; `simulate_cost` перед каждым платным вызовом, цена в чат; слаг модели только из `*_models_list` этой сессии; `count` явно; таймаут ожидания — не ошибка, повторный запуск того же промпта запрещён до статуса `failed`; реф в `references[]` только после `status: completed`; результат качать сразу в `media-src/` (вне git) под именем из карточки, остальные прогоны — в `media-src/alt/`.

Ориентир цены (калибровка 23.10, тариф Premium+, безлимит в MCP не действует): Kling 3.0 5 s 1080p = **450**, 10 s ≈ **900** (посекундно); Nano Banana 2.1 1K = 65, 4K = 220, **2K — спросить `simulate_cost`** (ориентир ~110). Остаток 23.10 — 20 280.

| № | задача | модель | вход | выход (`media-src/`) | после | ≈ кредитов |
|---|---|---|---|---|---|---|
| 1 | луп T1 — **проба API и пропорции** | Kling 3.0, 5 s | T1 | `loop-t1.mp4` | — | 450 |
| 2 | S1v, S2v, S3v, S4v | Nano Banana 2.1, 9:16, 2K, count 2 | S1…S4 | `s1v…s4v.png` | 1 | 4 × 2 × ~110 |
| 3 | S5av → S5v | Nano Banana 2.1, 9:16, 2K, count 2 | S4v + M; S5av | `s5av.png`, `s5v.png` | 2 | 2 × 2 × ~110 |
| 4 | К1v, К2v, К3v | Kling 3.0, 10 s, start + end | S1v→S2v, S2v→S3v, S3v→S4v | `k1v…k3v.mp4` | 2 | 3 × 900 |
| 5 | К4v | Kling 3.0, 5 s, start = end | S5v | `k4v.mp4` | 3 | 450 |
| 6 | лупы T2, T3, B2 | Kling 3.0, 5 s, start = end | T2, T3, B2 | `loop-t2/t3/b2.mp4` | 1 | 3 × 450 |
| 7 | сезоны | Kling 3.0, 5 s, start + end | Z1→Z3, Z3→Z4 | `season-summer-autumn.mp4`, `season-autumn-winter.mp4` | 1 | 2 × 450 |
| 8 | лупы R04, R07, R02, Z1 | Kling 3.0, 5 s, start = end | R04, R07, R02, Z1 | `loop-r04/r07/r02/z1.mp4` | 1 | 4 × 450 |

Итого **один прогон всего ≈ 9 000** кредитов (видео 7 650 + стиллы ~1 300); вторые прогоны по критериям — до +7 650. Плюс §7 спецрендеры ≈ 2 200–3 100 и §8 перерендер пролёта 16:9 2 700 → **весь проект ≈ 14 000–15 000** одним кругом, до ~18 500 с лупами на все способы. Шаги 2–5 — цепочка (каждый следующий ждёт выбора кадра), 6–8 независимы и могут идти между ними.

После каждой группы: §4 сборка (`frames.mjs` / `loops.mjs`), проверка стыков и петель, `build` → `tilda-sheet` → `deploy --publish` → коммит.

**Итог прогона 23.10 (ночь):** всё из таблицы, §7 (без лупов дыхания) и §8 №11 сделано одним кругом — 18 видео + 14 кадров, **14 450 кредитов** (цены точные: 450 / 900 / 100 за 2K). Один повтор — К3v (вариант «rises straight up» из карточки, им же сразу 16:9 К3). Nano Banana дальше `count 1` (пары отличались на 5–16/255). Пропорция у Kling идёт за старт-кадром, размер не канонический (1292×1604, 1072×1928, 1924×1076). «One constant speed» Kling не держит — выравнивание `tools/remap.py`, приёмка `tools/vcheck.py`; стиллы карточек из первого кадра лупа `tools/loop-stills.mjs`. Разбор — тетрадь Magnific §51; журнал `docs/state-2026-10-09.md`.

## Почему так (правила плавности)

1. **Пролёт хиро и смена сезонов не проигрываются, а крутятся скроллом вперёд и назад.** Всё, что движется само (ветер, туман, падающие листья, снежинки), при прокрутке назад едет задом наперёд и мельтешит на месте, когда скролл стоит. Поэтому в этих клипах движется только камера (пролёт) или то, у чего нет направления: цвет листьев, свет, снег слоем.
2. **Одна ровная скорость весь клип.** Скролл ровный → кадр обязан меняться ровно. Разгон и торможение («settles gently») дают при ровном скролле то стоп, то рывок, особенно на стыках клипов.
3. **10 секунд на клип пролёта.** Больше кадров на тот же путь камеры — меньше шаг между кадрами. Сайт берёт все кадры клипа (видео, `?hero=video`).
4. **Каждый кадр резкий.** Скролл может остановиться на любом кадре, смаз в движении на стоп-кадре виден.
5. **Лупы секций (тарифы, способы, «после», лето) играют сами**, не скроллом — там движение можно, а петлю держит start = end (`tools/loops.mjs` клип не разворачивает — один и тот же первый и последний кадр обязателен). Движение вести светом, не ветром (§15.1, §47).
6. Kling 3.0 (не Omni: у Omni в Magnific нет энд-кадра) · 1080p · звук выкл. Из двух прогонов пролёта, если второй понадобился, брать тот, чей последний кадр ближе к старту следующего клипа; скорость и стыки дополнительно выравниваются на сборке (растворение RAMP / xfade).

## 1. Стиллы 9:16 (Nano Banana 2.1 · edit · 9:16 · 2K · count 2; в интерфейсе — thinking high)

Выход 9:16 на 2K ≈ 1152×2048 — старт-кадр для Kling выше 1080p, как требует §4. Критерий выбора из пары (§40): дом и растения те же, дорисованные зоны без шва и без новых объектов; для S4v — контуры гряд читаются.

**S1v** — the first image = S1:
```
Using the first image, change only the frame: extend the scene to a 9:16 vertical frame. The original picture stays unchanged at its full width as the middle band of the new frame — nothing is cropped off, nothing is rescaled, the house keeps exactly its size and position. Above it, the same morning sky and the crowns of the tall pines continue naturally, with the same soft sunbeams; below it, the same dewy meadow grass with dandelion heads continues down to the bottom edge, seen from the same low camera. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```
**S2v** — the first image = S2:
```
Using the first image, change only the frame: extend the scene to a 9:16 vertical frame. The original picture stays unchanged at its full width as the middle band of the new frame — nothing is cropped off, nothing is rescaled, the house keeps exactly its size and position. Above it, the same morning sky and the crowns of the pines continue naturally; below it, the lawn and the meadow grass in front of the camera continue, with the stepping-slab path running on toward the bottom edge. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```
**S3v** — the first image = S3:
```
Using the first image, change only the frame: extend the scene to a 9:16 vertical frame. The original picture stays unchanged at its full width as the middle band of the new frame — nothing is cropped off, nothing is rescaled, the house keeps exactly its size and position. Above it, the same blue midday sky and the tops of the pines continue naturally; below it, the lawn and the stepping-slab path continue toward the camera. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```
**S4v** — the first image = S4 (вид строго сверху):
```
Using the first image, change only the frame: extend the scene to a 9:16 vertical frame, still seen straight down from the same height. The original picture stays unchanged at its full width as the middle band of the new frame — nothing is cropped off, nothing is rescaled, the house keeps exactly its size and position. Above it (beyond the roof of the villa) the pine forest behind the house continues, seen from straight above; below it the lawn and the stepping-slab path continue, then the edge of the pine forest at the bottom. The garden stays symmetric about the path and the outlines of the beds stay clearly readable. Keep exactly the same: the camera, the warm sunset light with its long shadows, the house, the garden and every plant.
```
**S5av** — the first image = S4v (принятый), the second image = M:
```
Using the first image, change only the state of the garden: it has just been fully cared for. The lawn is freshly mown in perfectly even parallel stripes, the boxwood balls and columnar thujas are clipped to crisp clean shapes, the feather reed grass stands upright, the bronze steel edging is clean and sharp, the joints between the limestone slabs are free of grass. Keep exactly the same, pixel for pixel: the camera, the framing, the position and size of every bed, ball and thuja, the house, the trees, the forest and lawn areas above and below, and the warm sunset light with its long shadows. The second image is ONLY the reference for how the groomed garden looks — the bronze steel edging, the clipped balls, the upright grasses and the clean slabs; its camera and light are not copied.
```
**S5v** — the first image = S5av:
```
Using the first image, change only the light: it is now blue hour, half an hour after sunset. The sky light is deep blue and soft, the lawn is dim blue-green, and the lighting of the estate is on: warm hidden linear light under the floating terrace steps and along the edges of the beds, small warm uplights at the base of every thuja, the trunks and crowns of the nearest pines washed softly from below, and the whole glass of the villa glowing warm from inside onto the terrace. All light is warm 2700K, calm and even, without glare and without lens flare. Keep exactly the same, pixel for pixel: the camera, the framing, the house, the garden, every plant and its freshly groomed state.
```
Файлы: `media-src/s1v.png … s4v.png`, `s5av.png`, `s5v.png`. Сборке из них нужны s4v, s5av, s5v (финал пролёта и превращение); S1v–S3v — только старт/энд для клипов.

## 2. Пролёт 9:16 — К1v, К2v, К3v (Kling 3.0 · start + end · 10 s · 1080p · 9:16 · звук выкл · 1 прогон)

Выход 1080×1920 (`frames.mjs` ждёт [1080, 1920]). **Второй прогон** — только если последний кадр отличается от старта следующего клипа больше 8/255 (растворение RAMP держит ≈ 7) или кривая движения неровная (шаг между кадрами скачет на стыке).

**Negative (все три):**
```
cut, scene change, camera shake, jitter, camera rotation, horizon tilting, zoom pulsing, speed ramp, speeding up, slowing down, pause, motion stopping midway, motion blur, wind, swaying grass, moving leaves, drifting mist, people, animals, birds, insects, cars, text, letters, watermark, house changing shape, windows changing, roof changing, extra buildings, plants morphing, plants growing, new objects, flicker, fisheye, warping, CGI look
```

**К1v** — start = S1v · end = S2v
```
One continuous, slow camera move at one constant speed: the camera rises straight up out of the long grass to eye level, like a crane shot, keeping the villa in the centre of the frame the whole time. As it rises, the close grass blades slide down and out of the bottom of the frame, the focus shifts evenly from the dew drops to the house, and the garden opens up in front. The camera is already moving on the first frame and is still moving on the last frame — no speeding up, no slowing down, no pause anywhere. Only the camera moves: the garden is completely still, like a photograph — no wind, the grass, the leaves and the mist do not move. Every frame is crisp, with no motion blur. The house, the garden and the trees keep exactly the same shapes, positions and morning light throughout.
```

**К2v** — start = S2v · end = S3v
```
One continuous, slow camera move at one constant speed: the camera glides forward across the lawn and along the stepping-slab path toward the villa, gently rising from eye level to about 3.5 metres, keeping the path on the centre line of the frame. The steel-edged beds with their boxwood balls and grasses pass below on both sides, the villa grows larger ahead and the pines slide past in parallax. At the same time the soft morning light turns evenly into clear midday light, the morning haze clears and the shadows shorten, at the same steady pace as the camera. The camera is already moving on the first frame and is still moving on the last frame — no speeding up, no slowing down, no pause anywhere. Only the camera and the light change: the garden is completely still — no wind, no swaying grass, no moving leaves. Every frame is crisp, with no motion blur. The house and every plant keep exactly the same design and position throughout.
```

**К3v** — start = S3v · end = S4v · в Negative дописать `camera spinning, flying over the roof`
```
One continuous, slow drone move at one constant speed: the camera rises high above the garden, drifting back from the villa, and at the same time tilts down evenly until it looks straight down from about 28 metres. The symmetric pattern of the stepping slabs, the steel-edged beds and the rows of boxwood balls gradually unfolds below, with the terrace and the green roof of the villa along the far edge of the frame. The midday light turns evenly into warm sunset light and the shadows of the pines grow long, at the same steady pace as the camera. The camera is already moving on the first frame and is still moving on the last frame — no speeding up, no slowing down, no pause, and the tilt never jumps at the end. Only the camera and the light change: the garden is completely still — no wind, the pine crowns and the grass do not move. Every frame is crisp, with no motion blur. The house and every plant keep exactly the same design and position throughout.
```
Если наклон вниз всё равно рывком в конце — второй прогон с `rises straight up while tilting down` вместо отъезда.
Файлы: `media-src/k1v.mp4`, `k2v.mp4`, `k3v.mp4`.

## 3. Ночной луп 9:16 — К4v (играет сам; Kling 3.0 · start = end = S5v · 5 s · 1080p · 9:16 · 1 прогон)

Проверенный рецепт §40.1 (шов 0,7/255 на 16:9). Второй прогон — если шов петли > 3/255.
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY things that move are the light and the air: the warm garden lights breathe very gently, thin evening mist drifts slowly between the pines, the grass stirs barely, and the clip ends on exactly the starting look. The house, the terrace, the beds and every plant keep exactly the same position and shape.
```
**Negative:** `camera movement, zoom, pan, people, animals, birds, cars, text, watermark, deformation, morphing plants, plants growing, new objects, flicker, background change, lights turning off`
Файл: `media-src/k4v.mp4`.

## 4. Смена сезонов (крутится вкладкой по кадрам; Kling 3.0 · start + end · 5 s · 1080p · 16:9 · 1 прогон)

Сборка берёт 24 кадра и кропает 16:9 → 16:10 по центру (`loops.mjs`). Второй прогон — если смена идёт растворением (двойной контур дома на середине клипа) или рывком.

**Negative (оба):**
```
camera movement, camera shake, zoom, pan, falling snowflakes, falling leaves, flying leaves, wind, people, animals, birds, cars, text, letters, watermark, deformation, morphing plants, plants growing or changing shape, new objects, flicker, strobing, sudden cuts, speeding up, pause, motion stopping midway, cross-dissolve, crossfade, ghosting, double exposure
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

## 5. Лупы секций (играют сами; Kling 3.0 · 5 s · 1080p · start = end · 1 прогон; пропорция = у старт-кадра: 4:5 у T и R, 16:9 у B2 и Z1)

Второй прогон — если шов петли > 3/255 (§28) или пошёл «зум-пульс» (качели яркости/масштаба, §15.1). Мёртвые края по 1–2 с у светового эффекта — норма (§28), на сайте читаются как покой.

**Negative (все лупы):**
```
camera movement, zoom, pan, zoom pulsing, breathing scale, people, animals, birds, cars, text, watermark, deformation, morphing plants, plants growing, new objects, flicker, background change, lights turning on or off
```

**Тень облака** — T1, T2, Z1 · start = end = свой кадр
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: the soft shadow of a passing cloud glides slowly across the lawn from left to right and leaves the frame, and the full sunlight returns, ending on exactly the starting look. The movement is slow and continuous for the whole clip. The house, the plants, the path and the beds stay exactly the same; the grasses stir very slightly.
```
**T3** (в кадре зеркальный бассейн) — тот же промпт, в конец дописать:
```
The surface of the pool stays mirror-still, only the reflection darkens and brightens with the cloud.
```
Файлы: `media-src/loop-t1.mp4`, `loop-t2.mp4`, `loop-t3.mp4`, `loop-z1.mp4`.

**«После» в шторке** — B2 · start = end = B2 (`loops.mjs` просто зацикливает клип — петлю держит одинаковый первый и последний кадр; ведёт свет, а не ветер: так собран проверенный ночной луп, шов 0,7/255)
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY things that move are the light and the air: thin sunbeams between the pines drift slowly across the terrace and the beds, the feather reed grass and the hydrangea heads stir gently, and the clip ends on exactly the starting look. The terrace, the steps, the path, the beds and the trees keep exactly the same position and shape, and the frame never zooms.
```
Файл: `media-src/loop-b2.mp4`.

**Дорожка в лучах** — R02 · start = end = R02 (в кадре лучи в тумане между сосен и столбики-фонари — ведёт свет, как у B2)
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY things that move are the light and the air: the sunbeams between the pine trunks drift slowly across the path and the beds, the thin mist glows a little brighter and then softer, the feather reed grass stirs gently, and the clip ends on exactly the starting look. The path, the bollard lights, the beds, the boxwood balls and the trees keep exactly the same position and shape, and the frame never zooms.
```
Файл: `media-src/loop-r02.mp4`.

**Подсветка** — R04 · start = end = R04 (тумана в кадре нет — только свет)
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: the warm garden lights breathe very gently — the glow under the terrace steps, along the bed edges and at the base of the thujas brightens and dims slowly, the light on the lawn and the slabs follows it, the windows of the villa keep glowing — and the clip ends on exactly the starting look. The house, the beds, the path and every plant keep exactly the same position and shape; the blue sky stays the same.
```
Файл: `media-src/loop-r04.mp4`.

**Автополив** — R07 · start = end = R07
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that moves is the water: the sprinklers keep spraying fine arcs of water that sparkle in the low sun and drift slightly in the breeze, continuously for the whole clip, and the clip ends on exactly the starting look. The lawn, the boxwood balls, the pines and the house keep exactly the same position and shape.
```
Файл: `media-src/loop-r07.mp4`.

## 6. Порядок по эффекту на сайт (если генерить руками в интерфейсе)

1. Стиллы S1v–S5v → клипы К1v–К3v → К4v (телефон получает полный вертикальный кадр и все 24 к/с).
2. Тарифы T1–T3. 3. «После» B2. 4. Сезоны. 5. Способы R04, R07, R02. 6. Лето Z1.

Положил файлы — написать мне: соберу (`tools/frames.mjs`, `tools/loops.mjs`), проверю стыки и скорость, выложу превью. Неудобно переименовывать — кидай в «все рендеры» и напиши, какой файл что.

## 7. Спецрендеры «Сад к празднику» — Хеллоуин и Новый год (23.10; обыгрывание на сайте — план доводки §4.12)

Идея: две карточки 4:5 в блоке «Специальные условия». Стилл карточки — украшенный сад в сумерках **с выключенным светом**; когда карточка доезжает до центра экрана (на компьютере — под курсором), один раз играет клип «включение» — свечи в тыквах / гирлянды загораются, потом подсветка и окна, — и держит последний кадр. Это тот же приём, что превращение в хиро (свет приходит в синий час), и проверенный жанр Kling «меняется ТОЛЬКО свет» (§28, §34, §40.1). Опционально — луп дыхания света поверх зажжённого кадра (первый кадр лупа = последний кадр включения, звенья одной цепи §28).

Всё — эдиты поверх своих мастеров (камера и дом держатся, §40), по одной перемене за проход: свет → декор → свет. Nano Banana 2.1 · edit · 4:5 · 2K · count 2; Kling 3.0 · 5 s · 1080p · пропорция за старт-кадром.

| № | задача | модель | вход | выход (`media-src/`) | ≈ кредитов |
|---|---|---|---|---|---|
| 9a | H1 синий час → H2 тыквы и фонари → H0 всё выключено | Nano Banana 2.1 ×3 | R02 → H1 → H2 | `hw-lit.png` (H2), `hw-dark.png` (H0) | 3 × 2 × ~110 |
| 9b | включение Хеллоуин | Kling 3.0, start H0 · end H2 | H0, H2 | `hw-on.mp4` | 450 |
| 9c | луп дыхания (опция) | Kling 3.0, start = end = H2 | H2 | `loop-hw.mp4` | 450 |
| 10a | N1 зима → N2 гирлянды и ель → N0 всё выключено | Nano Banana 2.1 ×3 | R04 → N1 → N2 | `ny-lit.png` (N2), `ny-dark.png` (N0) | 3 × 2 × ~110 |
| 10b | включение Новый год | Kling 3.0, start N0 · end N2 | N0, N2 | `ny-on.mp4` | 450 |
| 10c | луп дыхания (опция) | Kling 3.0, start = end = N2 | N2 | `loop-ny.mp4` | 450 |

Итого спецрендеры ≈ **2 200** без лупов дыхания, ≈ **3 100** с ними. Базы разные нарочно: Хеллоуин — дорожка в соснах (R02, у карточки «способов» она золотым часом, здесь — синий час с тыквами), Новый год — фасад виллы (R04) в снегу.

### 7.1 Хеллоуин — база R02 (дорожка в соснах, столбики-фонари)

**H1 · свет** — the first image = R02:
```
Using the first image, change only the light: it is now blue hour, half an hour after sunset. The sky between the pine crowns is deep soft blue, the sunbeams and the golden haze are gone, the lawn and the beds are dim blue-green, and the black bollard lights along the path are on, each throwing a small warm 2700K pool of light onto the slabs and the grass beside it; the glass of the garden pavilion in the background glows warm. All light is calm and even, without glare and without lens flare. Keep exactly the same, pixel for pixel: the camera, the framing, the curving stepping-slab path, every bollard, bed, boxwood ball, grass and tree.
```
**H2 · декор** — the first image = H1 (принятый):
```
Using the first image, change only one thing: the garden has been dressed for Halloween in a restrained, elegant way. Along both edges of the stepping-slab path stand small groups of real pumpkins — deep orange, cream-white and grey-green, of different sizes — and every third pumpkin is carved with a simple classic face and glows from a candle inside with a warm flickering orange light that falls onto the slabs and the grass; a few black metal candle lanterns stand among them, and dried hydrangea heads and fallen golden leaves lie in the beds and on the lawn. Only pumpkins, lanterns and dried garden flowers — nothing else is added. Keep exactly the same, pixel for pixel: the camera, the framing, the blue-hour light, the bollard lights, the path, the beds, the boxwood balls, the grasses and the trees.
```
**H0 · всё выключено** — the first image = H2 (принятый):
```
Using the first image, change only the light: everything is switched off — the bollard lights are off, no candle burns inside any pumpkin and the carved faces are dark cut-outs, the lanterns are unlit, the pavilion glass is dark, and the whole scene is lit only by the deep blue dusk sky, dim but fully readable. Keep exactly the same, pixel for pixel: the camera, the framing, every pumpkin, lantern, leaf, bollard, bed, boxwood ball, grass and tree.
```
**HW-ON · включение** — Kling 3.0 · start = H0 · end = H2 · 5 s:
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: the candles inside the carved pumpkins light up one after another along the path, from the nearest to the farthest, their warm flickering glow spreading onto the slabs and the grass; then the bollard lights come on and the glass of the pavilion warms up, until the scene reaches exactly the look of the last frame and holds it. Everything else is completely still: the pumpkins, the lanterns, the leaves, the plants and the trees keep exactly the same position and shape.
```
**Negative:** `camera movement, zoom, pan, zoom pulsing, breathing scale, people, animals, birds, cars, text, watermark, deformation, morphing pumpkins, pumpkins moving, new objects, strobing, flames outside the pumpkins, fire spreading, background change`
Риск: Kling зажжёт всё разом, а не по очереди — приемлемо, включение всё равно читается.

**HW · луп дыхания (опция)** — Kling 3.0 · start = end = H2 · 5 s:
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY things that move are the light and the air: the candle flames inside the pumpkins flicker softly so their warm glow on the slabs breathes, thin evening mist drifts slowly between the pine trunks, the grasses stir barely, and the clip ends on exactly the starting look. The pumpkins, the lanterns, the leaves, the plants and the trees keep exactly the same position and shape.
```
**Negative:** общий негатив лупов §5 + `pumpkins moving, fire spreading`.

### 7.2 Новый год — база R04 (фасад виллы в синий час, подсветка включена)

**N1 · зима** — the first image = R04:
```
Using the first image, change only the season: it is now deep winter at the same blue hour. A smooth layer of fresh snow lies on the lawn, on the stepping slabs, on the bed edges, on every boxwood ball and on the terrace steps; the columnar thujas and the pines carry snow on their branches, the birches are bare, the sky is deep blue and clear, the air is crisp. The lighting of the estate stays exactly as it is — the warm linear light under the terrace steps and along the bed edges, the uplights at the thujas and the warm glow of the whole glass villa — now reflected softly by the snow. Keep exactly the same, pixel for pixel: the camera, the framing, the house, the terrace, the path, every bed, ball, thuja and tree.
```
**N2 · декор** — the first image = N1 (принятый):
```
Using the first image, change only one thing: the garden has been dressed for New Year in a restrained, elegant way. Fine strings of tiny warm-white lights are wrapped evenly around every columnar thuja from base to tip, the same warm micro-lights run along the top edge of the snow-covered beds, and a tall live fir tree stands at the right side of the terrace, dressed only in the same warm-white micro-lights and a few small matte brass baubles. All light is warm 2700K, calm and even — only white light, nothing inflatable, no figures. Keep exactly the same, pixel for pixel: the camera, the framing, the blue-hour light, the snow, the house, the terrace, the path, every bed, ball, thuja and tree.
```
**N0 · всё выключено** — the first image = N2 (принятый):
```
Using the first image, change only the light: everything is switched off — the light strings on the thujas, the beds and the fir are dark, the terrace and bed lighting is off, the uplights are off, the glass of the villa is dark — and the whole scene is lit only by the deep blue winter dusk reflected by the snow, dim but fully readable. Keep exactly the same, pixel for pixel: the camera, the framing, the snow, the light strings, the fir, the house, the terrace, the path, every bed, ball, thuja and tree.
```
**NY-ON · включение** — Kling 3.0 · start = N0 · end = N2 · 5 s:
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: first the strings of tiny warm-white lights come on along the thujas and the fir, one after another from the nearest to the farthest, their glow catching the snow; then the hidden lights under the terrace steps and along the beds come on, and finally the glass of the villa fills with warm light, until the scene reaches exactly the look of the last frame and holds it. Everything else is completely still: the snow, the fir, the plants and the house keep exactly the same position and shape; no snow falls.
```
**Negative:** `camera movement, zoom, pan, zoom pulsing, breathing scale, falling snowflakes, snowfall, wind, people, animals, birds, cars, text, watermark, deformation, morphing plants, lights changing color, colored lights, blinking, strobing, new objects, background change`

**NY · луп дыхания (опция)** — Kling 3.0 · start = end = N2 · 5 s:
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY thing that changes is the light: the warm-white light strings on the thujas and the fir twinkle very softly, the glow under the terrace and along the beds breathes gently, the light in the windows stays, and the clip ends on exactly the starting look. The snow, the fir, the plants and the house keep exactly the same position and shape; no snow falls.
```
**Negative:** тот же, что у NY-ON.

Приёмка стиллов (из пары count 2): дом, дорожка и растения те же, что в базе (difference-оверлей — изменился только свет/декор); декор без пластика и фигур; у H0/N0 читаемость — не чёрный кадр. Приёмка клипов: первый кадр = H0/N0 (≤ 3/255), последний = H2/N2 (≤ 5/255), между ними только свет.

## 8. Перерендер того, что уже стоит (по слову владельца 23.10: «если надо живее — можно»)

| № | что | зачем | ≈ кредитов | решение |
|---|---|---|---|---|
| 11 | пролёт 16:9 для компьютера К1–К3 промптами v2 (одна скорость, без «settles gently») | клипы первой волны тормозят в конце каждого — при ровном скролле стоп и рывок на стыках (§47); телефон получит ровные клипы, компьютер — нет | 3 × 900 = 2 700 | рекомендую, после вертикального набора |
| 12 | лупы на остальные семь «способов» (R01, R03, R05, R06, R08, R09, R10) | все десять карточек живые, не три | 7 × 450 = 3 150 | по желанию; промпты напишу по кадрам, когда скажешь |

Остальное (процесс, прайс, «до») — статика по замыслу, перерендер не нужен.
