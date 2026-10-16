# Промпты Magnific для Verdant Estate — v2 (16.10.2026, под бриф v2)

Бриф: `docs/brief-v2-2026-10-16.md`. Версия v1 (сад из 3D-рендера, рассвет → ночь на месте) — в git, коммит `6afa39c`; её рефы `docs/magnific/ref-01…05` к v2 не подходят: в них нет классического дома и партера.

Общее для всех картинок: **Nano Banana 2.1 · thinking high · 2K** (4K не берём, скилл §35). Негатив-поля у картинок нет: что должно быть в кадре — пишем, чего не должно — одной строкой в конце промпта. Рефы — `@img1…`, номер = слот; файлы для загрузки — JPEG до 1 МБ (скилл §37). Видео — **Kling 3.0** (не Omni: у Omni нет энд-кадра), негатив — отдельным полем.

## 0. Решения, которые я принял, разбирая бриф

1. **Весь пролёт S1–S4 — сад «до».** Конец каждого клипа = начало следующего, а S4 по брифу «до». Значит, и S1–S3 в том же состоянии: дорогой дом и партер, но три-четыре недели без ухода — газон длинный и неровный, шары и конусы обросли, плетёнку затянуло травой. Сад красивый и в «до», просто не ухоженный: это заявка, а не помойка. «После» появляется только на превращении.
2. **Мастер (M) генерим ухоженным, «до» получаем эдитом.** Ухоженный партер — прайор модели, его геометрию она рисует чётко; «обросший партер» с нуля она размоет. Плюс M — реф Style для всех секций («уровень ухода» берётся с него, брифа §6.4 это и требует).
3. **Одна перемена за эдит** (правило владельца). Где у брифа в одном кадре меняются камера и свет (S3, S4) или стрижка и свет (S5), делаю два эдита. Хиро — 9 картинок вместо 5, +4 × 75 ≈ +300 кредитов из запаса. Если кредитов жалко — S3 и S4 одним эдитом «камера + свет», риск: камера уедет и стык клипов сломается.
4. **Переход «до → после» в два шага:** S4 → S5a (стрижка, тот же закатный свет) → S5 (синий час и подсветка). На сайте: шторка-покос по скроллу, потом зажигается свет. Это лучше одного кроссфейда и бесплатно по коду.

## 1. Цепочка хиро

| кадр | откуда | что меняется | время на часах |
|---|---|---|---|
| **M** | генерация | — (мастер, ухоженный, утро) | — |
| **S2** | эдит M | сад запущен | 07:40 |
| **S1** | эдит S2 | камера в траве | 07:10 |
| S3c | эдит S2 | камера у террасы, 3–4 м | — |
| **S3** | эдит S3c | свет: день | 13:00 |
| S4c | эдит S2 | камера сверху, 25–30 м | — |
| **S4** | эдит S4c | свет: закат | 20:40 |
| **S5a** | эдит S4 | сад ухожен | 20:55 |
| **S5** | эдит S5a | синий час, подсветка | 21:30 |

Порядок прогона: M → S2 → (S1, S3c, S4c от S2 параллельно) → S3, S4 → S5a → S5. Владелец утверждает S1–S5 → клипы К1–К3.

### M — мастер, ухоженный сад, утро

```
A photograph of a private estate near Moscow in the European style, taken in the early morning from the middle of a wide lawn at eye level, 1.7 metres above the ground, with a 35mm lens, looking straight at the house. In the distance stands a two-storey classical villa with smooth light warm-white stucco, a dark grey slate hipped roof, tall white-framed French windows and a wide stone terrace with a low balustrade and three broad steps down to the garden. Between the lawn and the terrace lies a formal parterre: a straight light gravel path runs from the camera's direction to the terrace steps; on each side of it are two rectangular beds edged with low woven willow wattle borders; inside the beds stand rows of clipped boxwood balls; tall clipped yew cones mark the corners of the beds; two boxwood spirals flank the terrace steps. Mature birches, lindens and Scots pines rise behind and beside the house. The lawn in the foreground is freshly mown in even stripes and wet with dew, every hedge and topiary shape is crisp. Soft low sun from the left, long gentle shadows, a little ground mist far away, clear pale sky. Honest 35mm photography with natural sensor noise, accurate white balance and true-to-life colour. The garden is empty: no people, no animals, no cars, no garden furniture, no text.
```

**Настройки:** Nano Banana 2.1 · thinking high · 16:9 · 2K · без рефов · 2 генерации, выбрать по: дом целиком в кадре и не крупнее трети высоты, партер читается на всю глубину, ось дорожки по центру (телефонный кроп 9:16 берёт середину).
Риск: модель любит ставить на террасу мебель и кашпо — если приехали, второй прогон с `the terrace is empty stone`.

### S2 — тот же кадр, сад запущен («до»)

```
Using @img1, change only the state of the garden: it has been left without care for about four weeks in early summer. The lawn is long and uneven, with taller tufts, seed heads and a few dandelions; the mowing stripes are gone. The boxwood balls, the yew cones and the boxwood spirals keep their places and their basic shapes, but soft new shoots stick out of them and their outlines are fuzzy. Grass and weeds grow over the woven willow borders and between the gravel of the path. Keep everything else exactly the same: the camera, the framing, the house with its roof, windows and terrace, every tree, the position and size of every bed, ball, cone and spiral, and the morning light with its shadows and mist.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = M · 2 генерации
Проверка: наложить S2 на M с прозрачностью 50 % — дом, окна, кромка крыши, шары и конусы на своих местах. Камера уехала — не чинить словами, перегенерировать.

### S1 — камера в траве

```
Using @img1, change only the camera position: the camera is now lowered into the long grass of the lawn, about 5 centimetres above the ground, looking in the same direction toward the house. Grass blades and seed heads with dew drops fill the lower two thirds of the frame, the nearest ones sharp and very close, as in a macro photograph with a shallow depth of field. Through the gaps in the grass the house, the parterre and the trees are visible far away as a soft, blurred background in the upper part of the frame, in the same place on the horizon as in @img1. Keep exactly the same: the morning light and its direction, the colour of the light, the house, the trees and the state of the garden.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · 16:9 · 2K · `@img1` = S2 · `@img2` — по желанию: макро-реф травы владельца, с дописанной в конец строкой `@img2 is ONLY a reference for the lens and the depth of field — take nothing else from it.` · 2 генерации
Риск: дом в расфокусе может «переехать» по горизонту. Главное для стыка с К1 — чтобы дом стоял там же, где в S2 (по центру, у горизонта).

### S3c — камера у террасы, 3–4 м

```
Using @img1, change only the camera position: the camera has moved forward across the lawn and over the parterre and now hovers about 3.5 metres above the ground, just in front of the terrace steps, looking slightly down toward the house. The gravel path runs straight under the camera to the steps, the rows of boxwood balls and the willow-edged beds pass below on both sides, the two boxwood spirals stand at the steps, and the house façade with its French windows and the slate roof fills the upper half of the frame. Keep exactly the same: the house design, the layout of the parterre, the trees, the morning light and the overgrown state of the lawn, the topiary and the borders.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · 16:9 · 2K · `@img1` = S2 · 2 генерации

### S3 — свет: день

```
Using @img1, change only the light: it is now a clear summer midday. The sun is high, shadows are short and crisp, the greens are bright and saturated, the sky is blue with a few small white clouds, the mist is gone. Keep exactly the same: the camera, the framing, the house, the parterre, every plant, its overgrown state and its position.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S3c · 2 генерации

### S4c — вид сверху, 25–30 м

```
Using @img1, change only the camera position: the camera now looks straight down from about 28 metres above the parterre, like a drone shot pointing vertically at the ground. From above, the parterre is a clear symmetric pattern in the centre of the frame: the straight gravel path along the central axis, two rectangular willow-edged beds on each side, rows of round boxwood balls inside them, yew cones at the corners and the two spirals at the far end. The far edge of the frame shows the stone terrace and the edge of the dark slate roof; the lawn surrounds the parterre, and the crowns of birches and pines enter at the corners. Keep exactly the same: the house design, the design and proportions of the parterre, the morning light and the overgrown state of the lawn, the topiary and the borders.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · 16:9 · 2K · `@img1` = S2 · 2 генерации
Риск: самый трудный кадр серии — с вида у земли на строго сверху модель додумывает раскладку. Принимать по трём признакам: ось дорожки по центру кадра, четыре грядки симметрично, у дальнего края кадра терраса и крыша. Не сошлось за 2 прогона — третий с `@img2` = M с припиской `ONLY for the design of the parterre and the house — take nothing else`.

### S4 — свет: закат

```
Using @img1, change only the light: it is now the last minutes before sunset on a summer evening. A low warm sun from the side casts very long soft shadows of the balls, cones, spirals and trees across the lawn, the light is warm gold, the shadows are cool blue. Keep exactly the same: the camera, the framing, the house, the parterre, every plant, its overgrown state and its position.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S4c · 2 генерации

### S5a — тот же кадр, сад ухожен («после»)

```
Using @img1, change only the state of the garden: it has just been fully cared for. The lawn is freshly mown in perfectly even parallel stripes, the boxwood balls, yew cones and spirals are clipped to crisp clean geometric shapes, the woven willow borders are clean and sharp, the gravel path is raked and free of weeds. Keep exactly the same, pixel for pixel: the camera, the framing, the position and size of every bed, ball, cone and spiral, the house, the trees, and the warm sunset light with its long shadows.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S4 · 2 генерации
Проверка: difference S5a − S4. Двигаться имеют право только газон, кромки фигур и плетёнка; дом, деревья и центры шаров стоят. Сдвиг больше 2 px — перегенерировать: на шторке сдвиг виден сразу.

### S5 — синий час и подсветка

```
Using @img1, change only the light: it is now blue hour, half an hour after sunset. The sky light is deep blue and soft, the lawn is dim blue-green, and the garden lighting is on: small warm uplights at the base of every yew cone and spiral, low warm lights along both sides of the gravel path, warm light glowing from the French windows of the house onto the terrace, and the crowns of the nearest trees lit softly from below. All garden light is warm 2700K and gentle, without glare and without lens flare. Keep exactly the same, pixel for pixel: the camera, the framing, the house, the parterre, every plant and its freshly groomed state.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S5a · 2 генерации
Риск: модель добавит фонари, которых нет. Это не брак, если свет стоит по оси и симметрично; брак — если светильники видны крупными столбами на газоне.

## 2. Клипы К1–К3 (Kling 3.0, start + end, 10 s, 1080p, звук выкл)

Только после того, как владелец утвердил S1–S5. **Старт К2 и К3 — последний кадр принятого предыдущего клипа**, а не PNG (скилл §15.2): так стык идеален. Каждый клип — одно движение камеры; трава живёт весь клип.

### К1 — из травы на уровень глаз (S1 → S2)

```
One continuous, slow and smooth camera move: the camera rises straight up out of the long grass to eye level, like a crane shot, keeping the house in the centre of the frame the whole time. As it rises, the close grass blades slide down and out of the bottom of the frame, the focus shifts from the dew drops to the house, and the garden opens up in front. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the seed heads sway softly in a light breeze the whole time, never freezing. The house, the parterre and the trees keep exactly the same shapes, positions and morning light throughout.
```

**Negative:** `cut, scene change, camera shake, camera rotation, zoom pulsing, speed ramp, motion stopping midway, people, animals, birds, insects, cars, text, letters, watermark, house changing shape, roof changing, windows changing, extra buildings, plants morphing, plants growing, new objects, flicker, fisheye, warping`

**Настройки:** Kling 3.0 · start = S1 · end = S2 · 10 s · 1080p · звук выкл · 2 прогона

### К2 — полёт к дому (S2 → S3)

```
One continuous, slow and smooth camera move: the camera glides forward across the lawn and over the parterre toward the house, gently rising from eye level to about 3.5 metres, keeping the gravel path on the centre line of the frame. The rows of boxwood balls and the willow-edged beds pass below the camera on both sides, the house grows larger ahead. At the same time the morning light slowly turns into clear midday light, the mist disappears and the shadows shorten. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass sways softly in a light breeze the whole time, never freezing. The house and every plant keep exactly the same design and position throughout.
```

**Negative:** тот же, что К1

**Настройки:** Kling 3.0 · start = последний кадр принятого К1 · end = S3 · 10 s · 1080p · 2 прогона

### К3 — подъём над садом, свет в вечер (S3 → S4)

```
One continuous, slow and smooth drone move: the camera rises high above the parterre, drifting back from the house, and at the same time tilts down until it looks straight down at the parterre from about 28 metres. The symmetric pattern of the gravel path, the willow-edged beds and the rows of boxwood balls gradually unfolds below, with the terrace and the edge of the roof along the far edge of the frame. During the move the midday light slowly turns into warm sunset light and the shadows grow very long. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the tree crowns stir softly in a light breeze, never freezing. The house and every plant keep exactly the same design and position throughout.
```

**Negative:** тот же, что К1, плюс `camera spinning, horizon tilting, flying over the roof`

**Настройки:** Kling 3.0 · start = последний кадр принятого К2 · end = S4 · 10 s · 1080p · 2 прогона
Риск: два движения сразу (подъём + наклон вниз) — для дрона это одно привычное движение, но Kling может сделать разворот рывком в конце. Если так — третий прогон без слов про отъезд от дома (`rises straight up while tilting down`).

**Что с клипами дальше:** mp4 в `media-src/` с именами `k1.mp4`, `k2.mp4`, `k3.mp4`, стиллы S5a и S5 — `media-src/s5a.png`, `media-src/s5.png`; `node tools/frames.mjs` сам нарежет кадры, кропы 9:16 и `manifest.json`. Сайт переключится на кадры без правок блоков.

## 3. Стиллы секций

Для всех: `@img1` = **M** (ухоженный мастер) в слоте Style, и последней строкой каждого промпта:

`@img1 is ONLY the reference for the light, the colour grade, the lens and the level of grooming — its house, its layout and its plants are not copied. Honest 35mm photography with natural sensor noise and accurate white balance. The frame is empty of people, animals and text.`

Ниже эта строка обозначена как **[хвост]**. Дом, если он в кадре, — тот же стиль: светлая штукатурка, тёмная скатная кровля, большие окна. Все — Nano Banana 2.1 · thinking high · 2K · по 1–2 генерации.

### P1–P4 — «Как проходит сезон с нами» (4:5)

- **P1 · Осмотр и план:** `A close view of a stone terrace table in the morning: a large sheet with a hand-drawn landscape plan of a formal garden in green and grey ink — only shapes of beds, paths and trees, without any writing — held flat by a smooth river stone, a pencil and a folded measuring tape beside it. Beyond the table, out of focus, a lawn and clipped boxwood balls in soft morning light.` + [хвост]
- **P2 · График и команда:** `A pair of long-handled hedge shears and a neat canvas tool bag leaning against a tall, freshly clipped hornbeam hedge, a clean wheelbarrow with a folded tarp standing on the gravel path beside it, soft morning light along the hedge.` + [хвост]
- **P3 · Работы:** `A low close view along a freshly mown lawn: crisp parallel mowing stripes running into the depth toward clipped boxwood balls and a straight woven willow border, a few fresh grass clippings in the foreground, dew drying in the sun.` + [хвост]
- **P4 · Контроль и отчёт:** `The garden of a classical villa at blue hour, seen from its stone terrace: clipped yew cones and boxwood spirals softly lit by small warm uplights, low warm lights along a straight gravel path, the lawn in perfect stripes, the sky deep blue.` + `@img1 is ONLY the reference for the lens and the level of grooming — its house, layout and light are not copied. Honest 35mm photography with natural sensor noise and accurate white balance. The frame is empty of people, animals and text.`

**Настройки:** 4:5 · `@img1` = M

### T1–T3 — тарифы (4:5, один свет)

- **T1 · BASIC:** `A small neat garden of a classical suburban house near Moscow, seen at eye level from the edge of the lawn: a compact lawn mown in stripes, one clipped hedge along a dark wooden fence, a short gravel path to the porch, two young apple trees and a small bed of lavender with a few boxwood balls. Soft low morning sun.` + [хвост]
- **T2 · PREMIUM:** `The full garden of a large classical villa near Moscow, seen at eye level from the lawn: a wide striped lawn, tall clipped hornbeam hedges, a straight gravel path with a woven willow edge, a border of white hydrangeas, ornamental grasses and boxwood balls, mature birches, low path lights switched off. Soft low morning sun.` + [хвост]
- **T3 · ESTATE:** `The grounds of a large classical estate near Moscow seen from its raised stone terrace: a long axis of lawn leading to a line of mature pines and birches, a formal parterre with boxwood balls, yew cones and spirals in willow-edged beds, a wide gravel allée, a still rectangular reflecting pool and the glass corner of an orangery at the far right. Soft low morning sun.` + [хвост]

**Настройки:** 4:5 · `@img1` = M

### W1–W3 — разовые работы, крупные планы (4:5)

- **W1 · Газон:** `A close low view of a freshly mown striped lawn running into the depth toward a clipped hedge, dew on the blades in the foreground, a clean steel edge between the lawn and a gravel path. Soft low morning sun.` + [хвост]
- **W2 · Растения:** `A close view of a freshly clipped hornbeam hedge with a razor-straight top, in front of it a bed of white hydrangeas, ornamental grasses and boxwood balls on dark bark mulch. Soft low morning sun.` + [хвост]
- **W3 · Деревья:** `Mature birches and Scots pines on a private estate near Moscow with clean, properly pruned crowns and clear trunks above a striped lawn, dappled morning sun through the canopy.` + [хвост]

**Настройки:** 4:5 · `@img1` = M

### R01–R10 — «10 способов» (4:5)

Тексты карточек — из инфографики заказчика (`brand/10-ways-infographic.jpg`), кадры — новые, в одном свете.

1. **Обновление газона:** `A renewed, dense and even lawn in front of a classical villa, freshly overseeded and rolled into neat stripes, a steel edge along a gravel path, a clipped hedge behind. Soft low morning sun.` + [хвост]
2. **Дорожки:** `A gently curving path of fine light gravel with a dark steel edge running through a lawn between clipped boxwood balls and ornamental grasses, low black path lights along it switched off, birches at the back. Soft low morning sun.` + [хвост]
3. **Клумбы:** `A perennial border on dark bark mulch: white hydrangeas, lavender, sage, ornamental grasses and boxwood balls, edged with a low woven willow border, a striped lawn in front. Soft low morning sun.` + [хвост]
4. **Подсветка:** `A private garden at blue hour with the lighting on: warm path lights along a gravel path, uplights at the base of birches lighting their crowns, a clipped hedge softly lit, the warm windows of a classical house in the background.` + `@img1 is ONLY the reference for the lens and the level of grooming. Honest 35mm photography with natural sensor noise. The frame is empty of people, animals and text.`
5. **Живая изгородь:** `A tall dense evergreen hedge of columnar thuja along a dark wooden fence, perfectly trimmed, a striped lawn and a gravel path in front of it. Soft low morning sun.` + [хвост]
6. **Каменные композиции:** `A rock garden on a gentle slope beside a lawn: large grey granite boulders, grey decorative gravel, dwarf mountain pines, junipers and ornamental grasses. Soft low morning sun.` + [хвост]
7. **Автополив:** `Pop-up sprinklers watering a striped lawn, fine arcs of water catching the low sun, a clipped hedge and birches behind.` + [хвост]
8. **Зона отдыха:** `A wooden deck with a cedar pergola, one built-in bench with linen cushions, a round steel fire bowl and two large terracotta planters with grasses, surrounded by a lawn and clipped hedges. Soft low morning sun.` + [хвост]
9. **Сезонное обслуживание:** `A garden in early autumn kept perfectly tidy: a clean striped lawn, a freshly trimmed hedge, a bed with cut-back perennials and fresh mulch, a few golden birch leaves on the gravel path. Soft low sun.` + [хвост]
10. **Премиальное обновление:** `A completely transformed garden of a classical villa seen from its terrace: a formal parterre with boxwood balls, yew cones and spirals in willow-edged beds, a straight gravel path with low lights, a striped lawn and mature trees. Soft low morning sun.` + [хвост]

**Настройки:** 4:5 · `@img1` = M
Риск: №8 — модель плодит подушки и мебель; держать «one built-in bench» и не добавлять слов про уют.

### B1, B2 — «До и после», ракурс с террасы (16:10)

Сначала «после» (B2), потом «до» эдитом — так ракурс совпадает.

- **B2 · после:** `A photograph taken from the stone terrace of a classical villa near Moscow at eye level, looking down the garden: three broad stone steps in the foreground, below them a striped lawn, a straight gravel path leading away between two willow-edged beds of boxwood balls, a line of tall clipped yew cones, and a belt of mature birches and pines at the back. Soft low morning sun.` + [хвост]
  **Настройки:** 16:10 · `@img1` = M · 2 генерации
- **B1 · до:** `Using @img1, change only the state of the garden: it has been neglected for a whole season. The lawn is overgrown, patchy and uneven with dandelions and bare spots, the boxwood balls and yew cones have lost their shapes under loose shoots, the willow borders are hidden in weeds, the gravel path is overgrown and covered with last year's leaves. Keep exactly the same, pixel for pixel: the camera, the framing, the terrace steps, the trees, the line of the path and the position and size of every bed and plant, and the morning light.`
  **Настройки:** edit · AR как у @img1 · `@img1` = B2 · 2 генерации

### Z1–Z4 — «Круглый год», эдиты T2 (16:10)

- **Z1 · лето:** `Using @img1, change only the frame: extend the scene to a wider 16:10 horizontal frame — continue the lawn, the hedges and the trees naturally to the left and to the right. Keep the original image unchanged in the middle, with the same light.` · `@img1` = T2
- **Z2 · весна**, **Z3 · осень**, **Z4 · зима** — `@img1` = Z1, текст `Using @img1, change only the season: SEASON_LINE Keep exactly the same: the camera, the framing, and the shape and position of every plant, hedge, path and the house.`
  - весна: `early May — fresh light-green young leaves on the birches, the lawn freshly green, white tulips in the bed, cool clear spring light.`
  - осень: `early October — the birches are golden, a scattering of golden leaves on the lawn and the gravel, the hydrangeas faded to pink-beige, soft low autumn light.`
  - зима: `January — fresh snow on the lawn, on the hedge tops and on the bed, bare birch branches, dark green pines, the gravel path cleared, pale overcast winter light, the path lights softly on.`

**Настройки:** edit · 16:10 · 2 генерации на каждый

## 4. Бюджет v2

| что | шт. | ≈ кредитов |
|---|---|---|
| хиро: M, S2, S1, S3c, S3, S4c, S4, S5a, S5 | 9 | 675 |
| секции: P×4, T×3, W×3, R×10, B×2, Z×4 | 26 | 1950 |
| клипы К1–К3, Kling 3.0, 10 s, 1080p | 3 | 2700 |
| итого первым кругом | | **≈ 5325** из 5800 |
| запас | | ≈ 475 = ~6 повторов стиллов; повтор клипа не влезает |

Цена стилла взята из брифа (≈ 75); по 2 генерации на кадр в таблицу не заложены — это и есть запас. Значит: на стиллах секций по одной генерации, по две — только на хиро и B1/B2. Повтор клипа возможен только за счёт секций (например, R — по одной генерации или Z — 3 вместо 4).

## 5. Куда класть результат

| что | файл |
|---|---|
| S1, S2, S3, S4, S5a, S5 (PNG/JPEG как скачались) | `media-src/s1.png … s5.png`, `media-src/s5a.png` |
| клипы | `media-src/k1.mp4`, `k2.mp4`, `k3.mp4` |
| стиллы секций | `tools/.cache/stills/<имя>.png`: `process-1…4`, `tariff-basic/premium/estate`, `price-lawn/plants/trees`, `way-01…10`, `ba-before/after`, `season-summer/spring/autumn/winter` → `node tools/stills.mjs` |

Пока клипов нет, `node tools/frames.mjs --stills` собирает сцену из одних стиллов S1–S5 (путь A): пролёт кроссфейдами, превращение — уже настоящее.
