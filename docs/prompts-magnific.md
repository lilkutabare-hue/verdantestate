# Промпты Magnific для Verdant Estate (16.10.2026)

Рефы лежат в `docs/magnific/` (JPEG ≤ 1 МБ, как требует загрузка Magnific). Нотация рефов — `@img1…`, номер = слот.
Правило серии: сначала мастер К1, потом по одной перемене. Структуру (раскладку сада) даёт наш 3D-рендер, генерация делает только фото-реализм, свет и материалы.

## Рефы

| файл | что это | куда |
|---|---|---|
| `ref-01-layout-morning.jpg` | 3D-рендер сада, утро, чёткие тени — **раскладка** для мастера | `@img1` в К1 |
| `ref-02-dawn.jpg`, `ref-03-golden-hour.jpg`, `ref-04-night.jpg` | те же рендеры в трёх светах — подсказка света для эдитов К2–К4 (можно не грузить, свет описан словами) | `@img2` в К3/К4 при желании |
| `ref-05-layout-tall-9x16.jpg` | вертикальный кроп раскладки — только если понадобится серия 9:16 | `@img1` в К1-tall |

## К1 — мастер хиро, рассвет (Nano Banana 2.1)

```
A photoreal landscape photograph of a private estate garden near Moscow at early dawn, taken from the terrace of a modern house at eye level with a 35mm lens. @img1 is a 3D layout reference: copy its composition and the position of every element exactly — the gravel path with a dark steel edge starting at the lower left and curving into the depth toward the left, the five low black bollard path lights along its right side, the long manicured lawn with even mowing stripes, the tall clipped hornbeam hedge across the back, the mature birches and pines rising behind the hedge, the flower bed on the right with white hydrangeas, clipped boxwood spheres and ornamental grasses on dark bark mulch, and the corner of the house with one large window at the left edge. Replace its 3D look with reality: real grass blades with dew, real bark and leaves, real gravel, real stucco and glass. The light is a cool pale dawn: thin ground mist lies over the lawn, the sky is soft and overcast with a faint warm glow low at the horizon on the right, the path lights are switched off and the window is dark. Everything is freshly groomed: crisp hedge edges, clean gravel, no fallen leaves. Natural sensor noise, accurate white balance, subtle HDR, and nothing else in the frame: the garden is empty of people, animals, cars, furniture, benches and planters, with no text and no watermark.
```

**Настройки:** Nano Banana 2.1 · thinking high · 16:9 · 2K · `@img1` = `ref-01-layout-morning.jpg` · 4 генерации, выбирать по композиции (дорожка ведёт в глубину, у правого края клумба крупно — это пойдёт на телефон)

Риск: модель может подтянуть «игрушечность» из 3D-рефа — если кадр выглядит рендером, добавить первой строкой `This is a photograph, not a render:` и повторить.

## К2 — утро (эдит мастера, Nano Banana 2.1)

```
Using @img1, change only the light. It is now a clear mid-morning: the mist is gone, bright sunlight comes from the upper right, short crisp shadows of the hedge, the trees and the bollard lights fall across the lawn toward the lower left, the greens are saturated, the sky is blue with a few small clouds. Keep everything else exactly the same: the camera, the framing, the shape and position of every plant, the path, the five lights, the flower bed and the house stay identical; the path lights remain switched off and the window stays dark.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = принятый К1 · 2 генерации

## К3 — золотой час (эдит мастера)

```
Using @img1, change only the light. It is now late afternoon golden hour: a low warm sun sits at the left behind the birches, long soft shadows stretch across the lawn toward the camera, warm rim light catches the grasses and the hedge top, the sky is pale gold fading to soft blue. Keep everything else exactly the same: the camera, the framing, the shape and position of every plant, the path, the five lights, the flower bed and the house stay identical; the path lights remain switched off and the window stays dark.
```

**Настройки:** те же, что К2

## К4 — синий час с подсветкой (эдит мастера)

```
Using @img1, change only the light. It is now deep blue dusk: the sky is dark blue, and the garden lighting is on — the five low path lights cast warm pools of light on the gravel, hidden uplights at the base of the birches and pines light their trunks and canopies from below in warm white, the hedge catches a soft warm glow, the large house window glows warm at the left edge, and the lawn is dim blue-green. All garden light is warm 2700K and soft, with no glare and no lens flare. Keep everything else exactly the same: the camera, the framing, the shape and position of every plant, the path, exactly five lights with no extra lamps added, the flower bed and the house stay identical.
```

**Настройки:** те же, что К2

## Что проверить до видео

- К1–К4 совпадают по кадру: наложить К2 на К1 с прозрачностью — дорожка, изгородь, фонари на месте. Если эдит «отодвинул камеру» — не чинить словами, перегенерировать эдит.
- Все четыре — JPEG до 1 МБ (для Kling старт/энд-кадры 1080p+).
- Уже на четырёх стиллах сайт работает (путь A): кладём их как `wide-00…03` в `docs/site/media/scene/` и пересобираем.

## Видео — что реально нужно

На сайте движется только сад в хиро. Остальное движение (шторка, сезоны, шкала сезона, ветвь логотипа) — код, видео не нужно.

### М1 — рассвет → золотой час (Kling 3.0, start + end)

```
Locked-off static camera on a tripod, the exact same garden view for the whole clip. Over the ENTIRE clip, from the first frame to the last, the light slowly and evenly changes from misty early dawn to warm late-afternoon sun: the ground mist thins and disappears, the sun rises and the shadows of the hedge and the trees slowly swing and shorten, the sky clears to blue and then warms to gold, the colours become warmer. The change never speeds up and never stops midway. The lawn, the hedge, the trees, the gravel path, the five lights and the house keep exactly the same shapes and positions throughout; only the leaves and the grasses stir very slightly in a light breeze.
```

**Negative:** `camera movement, camera shake, zoom, pan, people, animals, birds, cars, text, letters, watermark, deformation, morphing plants, plants growing or changing shape, new objects, flicker, strobing, sudden cuts, motion stopping midway, lights turning on`

**Настройки:** Kling 3.0 (не Omni — у него нет энд-кадра) · start = К1 · end = К3 · 10 s · 1080p · звук выкл · 2 прогона

### М2 — золотой час → ночь с подсветкой (Kling 3.0, start + end)

```
Locked-off static camera on a tripod, the exact same garden view for the whole clip. Over the ENTIRE clip, from the first frame to the last, the light slowly and evenly changes from warm golden hour to deep blue dusk: the sun sinks behind the trees, the shadows fade, the sky turns from gold to dark blue, and in the second half the garden lighting gradually comes on — the five path lights warm up first, then the uplights under the birches and pines, then the house window. The change never speeds up and never stops midway. The lawn, the hedge, the trees, the gravel path, the five lights and the house keep exactly the same shapes and positions throughout; only the leaves and the grasses stir very slightly in a light breeze.
```

**Negative:** `camera movement, camera shake, zoom, pan, people, animals, birds, cars, text, letters, watermark, deformation, morphing plants, plants growing or changing shape, new objects, flicker, strobing, sudden cuts, motion stopping midway, lights flickering, lights turning off again`

**Настройки:** Kling 3.0 · **start = последний кадр принятого М1** (не PNG К3 — так стык идеален) · end = К4 · 10 s · 1080p · 2 прогона

### М3 — то же одним дублем на Seedance 2.5 (эксперимент, запасной путь)

```
A single locked-off static shot of the same private garden for the entire 20 seconds, no camera movement at all. 0s–10s: the light changes slowly and evenly from misty early dawn to warm late-afternoon golden hour — the ground mist thins and disappears, the shadows of the hedge and the trees slowly swing and shorten, the sky clears and then warms. 10s–20s: the light continues slowly and evenly from golden hour to deep blue dusk — the sun sinks behind the trees, the shadows fade, the sky turns dark blue, and from 14s the garden lighting gradually comes on: the five path lights first, then the uplights under the birches and pines, then the house window. The lawn, the hedge, the trees, the gravel path, the five lights and the house keep exactly the same shapes and positions throughout; only the leaves and the grasses stir very slightly in a light breeze. The change never stops midway.
```

**Negative:** тот же, что М2, без `lights turning on`

**Настройки:** Seedance 2.5 · start = К1 · end = К4 · 20 s · 1080p · 1 прогон. Не подтверждено: у Seedance 2.0 старт/энд-кадры и рефы взаимоисключающие, у 2.5 — проверить в пикере. Если энд-кадра нет — только Kling (М1 + М2).

### М4 — амбиент-луп для карточек тарифов (необязательно, после всего)

```
Locked-off static camera. The ONLY thing that changes is the light: the soft shadow of a passing cloud slowly glides across the lawn from left to right and the sunlight returns, ending on exactly the starting look. The plants, the path, the lights and the house stay exactly the same; the grasses stir very slightly.
```

**Negative:** `camera movement, zoom, pan, people, animals, text, watermark, deformation, morphing plants, new objects, flicker, background change`

**Настройки:** Kling 3.0 · start = end = стилл тарифа · 5 s · 1080p · 2–3 прогона (все прогоны взаимозаменяемы и склеиваются в длинную петлю, проверено на печати mila harys 3/3)

## Что делать с результатом

1. Клипы М1 + М2 → `media-src/` → `node tools/frames.mjs` (напишу, когда появятся клипы): каждый 10-й кадр → 48 кадров 1440×810 и 36 кадров 720×1280 webp → `manifest.json`. Сайт переключится на путь B без правок блоков.
2. Стиллы секций (тарифы, 10 способов, до/после, сезоны) — промпты в `PLAN.md` §7.B–F; с принятым К3 в слоте Style, чтобы весь сайт был «снят в один день».
