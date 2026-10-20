# Промпты Magnific для Verdant Estate — v3 (18.10.2026)

Бриф: `docs/brief-v2-2026-10-16.md`. **Отличие от брифа:** дом не классический, а современный подмосковный особняк в футуристичном ключе (решение владельца 18.10 после первых прогонов M). v2 (классическая вилла, плетёнка, спирали) и v1 — в git.

## 0. Как пользоваться (прочитать один раз)

1. **Разрешение — 2K в пикере, перед каждым запуском.** Первые M пришли в 1K: на 1K кадр мыльный и сразу читается как ИИ. Слово «2K» в тексте ничего не меняет, меняет только переключатель.
2. Модель для картинок — **Nano Banana 2.1, thinking high**. Видео — **Kling 3.0** (не Omni: у Omni нет энд-кадра).
3. Промпт копируется блоком целиком. У картинок поля Negative нет, всё нужное уже внутри текста.
4. **Порядок:** сначала все стиллы (хиро, затем секции), потом клипы К1–К3, потом всё одной пачкой мне на сборку.
5. Каждый эдит меняет одну вещь. Если в эдите уехали камера или дом — словами не чинить, перегенерировать.
6. Готовые картинки скидываете мне, я сверяю наложением и говорю, что брать.

## 1. Библия сцены — один и тот же сад во всех кадрах

Эти слова повторяются во всех промптах дословно: так модель держит один и тот же дом и сад во всей серии. Если в каком-то кадре они поплыли, искать расхождение со списком ниже.

| что | как пишем | почему так |
|---|---|---|
| место | a private estate in the Moscow region, Rublyovka, on a large flat plot cut into an old forest of tall Scots pines with orange upper trunks, silver birches and a dark wall of Norway spruce behind | «Подмосковье» модель узнаёт только по приметам; «European style» уводит во Францию |
| дом | a contemporary two-storey villa, bold and futuristic yet real and buildable: long horizontal volumes, the upper floor cantilevered far over the terrace on a thin white concrete slab, walls of honed dark graphite basalt and warm vertical larch slats, floor-to-ceiling frameless glass, a flat roof with a sedum green roof | «футуристичный» без «real and buildable» = sci-fi-концепт; конкретные материалы = фото, а не рендер |
| терраса | a wide terrace of large pale limestone slabs, three long low floating steps down to the garden | |
| сад | a modern formal garden: a straight path of large pale limestone stepping slabs set into the lawn on the axis of the house; on each side two long rectangular beds edged with thin dark bronze-coloured steel; in the beds clipped boxwood balls in neat rows among soft drifts of feather reed grass (Calamagrostis 'Karl Foerster') and white panicle hydrangeas; tall narrow columnar thujas at the corners of the beds | растения, которые реально растут под Москвой; бронзовая сталь — акцент палитры сайта |
| газон | a wide lawn of dense fine grass | |
| палитра | deep leaf green #1F4D2E, fresh grass green #2E7D46, warm graphite, honey larch, muted bronze #B08D57, pale northern sky | палитра сайта; HEX модель держит лучше слов |
| камера | Sony A7R V, 35mm lens, f/8, ISO 100, tripod at eye level, straight verticals | конкретная камера даёт оптику и шум настоящей съёмки |
| реализм | real photograph for an architecture magazine, natural sensor grain, subtle lens vignetting, true-to-life muted colours, real weathering on stone and wood, a few pine needles in the slab joints, imperfect natural light | мелкие несовершенства — главный признак «не ИИ» |
| пусто | the scene is empty of people, animals, cars and garden furniture, with no text and no logos | |

**Состояния сада:**
- **«после» (M, S5a, S5, все секции):** газон свежескошен ровными полосами, шары и туи стриженые, кромки стали чистые, в швах плит ни травинки.
- **«до» (S1–S4):** сад 4 недели без ухода — газон длинный и неровный, с колосками и одуванчиками, полос нет; шары и туи держат место и форму, но обросли мягкими побегами; злаки полегли; трава закрыла сталь бордюров и проросла в швах плит.

## 2. Хиро: цепочка кадров

| кадр | откуда | что меняется | часы |
|---|---|---|---|
| **M** ✅ | генерация | мастер: сад ухожен, утро (принят 18.10, левый из пары) | — |
| **S2** ✅ | эдит M | сад «до» (принят 18.10, правый из пары) | 07:40 |
| **S1** ✅ | эдит S2 | камера в траве (принят 18.10, левый) | 07:10 |
| S3c ✅ | эдит S2 | камера у террасы, 3–4 м (принят 18.10, левый) | — |
| **S3** ✅ | эдит S3c | свет: день (принят 18.10, левый) | 13:00 |
| S4c ✅ | эдит S2 | камера сверху, 28 м (принят 18.10, левый; грядок две, как в M) | — |
| **S4** ✅ | эдит S4c | свет: закат (принят 18.10, левый) | 20:40 |
| **S5a** ✅ | эдит S4 | сад «после» (принят 18.10, левый; плиты стали прямоугольными, сдвиг 1–2 % — норма для шторки) | 20:55 |
| **S5** ✅ | эдит S5a | синий час, подсветка (принят 18.10, левый) | 21:30 |

Порядок: M → S2 → (S1, S3c, S4c) → S3, S4 → S5a → S5 → утверждение → клипы.

### M — мастер

```
A real photograph for an architecture magazine of a private estate in the Moscow region, Rublyovka, taken in the early summer morning from the middle of a wide lawn at eye level, 1.7 metres above the ground, with a Sony A7R V and a 35mm lens at f/8, looking straight at the house along the axis of the garden. The plot is cut into an old forest of tall Scots pines with orange upper trunks and silver birches, with a dark wall of Norway spruce behind. In the distance stands a contemporary two-storey villa, bold and futuristic yet real and buildable: long horizontal volumes, the upper floor cantilevered far over the terrace on a thin white concrete slab, walls of honed dark graphite basalt and warm vertical larch slats, floor-to-ceiling frameless glass reflecting the pines, a flat roof edged with sedum. A wide terrace of large pale limestone slabs with three long, low floating steps leads down to a modern formal garden: a straight path of large pale limestone stepping slabs set into the lawn runs from the camera to the steps; on each side are two long rectangular beds edged with thin dark bronze-coloured steel, filled with neat rows of clipped boxwood balls among soft drifts of feather reed grass and white panicle hydrangeas; tall narrow columnar thujas stand at the corners of the beds. The lawn in the foreground is dense fine grass, freshly mown in even stripes and wet with dew. Low soft sun from the left falls through the pines in long gentle shadows, a thin mist hangs between the trunks, the sky is pale and clear. Colours are calm and true to life: deep leaf green #1F4D2E, fresh grass green #2E7D46, warm graphite, honey larch, muted bronze #B08D57. Natural sensor grain, subtle lens vignetting, straight verticals, real weathering on stone and wood, a few pine needles in the slab joints. The scene is empty of people, animals, cars and garden furniture, with no text and no logos.
```

**Настройки:** Nano Banana 2.1 · thinking high · 16:9 · **2K (проверить в пикере)** · без рефов · 4 генерации
**Как выбрать:** дом целиком в кадре и не выше трети кадра; ось дорожки по центру (телефон берёт середину кадра); дом выглядит построенным, а не концептом; хвойный лес вокруг читается как Подмосковье.
Риск: дом выйдет слишком «фантастическим» (кривые формы, парящие капсулы). Тогда в начале второго прогона: `The house is an existing built project, photographed for a magazine — not a concept rendering.`

### S2 — тот же кадр, сад «до»

```
Using @img1, change only the state of the garden: it has been left without care for four weeks in early summer. The lawn is long and uneven, with taller tufts, grass seed heads and a few dandelions, and the mowing stripes are gone. The boxwood balls and the columnar thujas keep their places and their basic shapes, but soft new shoots stick out of them and their outlines are fuzzy. The feather reed grass has partly flopped over, grass has grown over the bronze steel edging of the beds and up between the limestone stepping slabs. Keep everything else exactly the same: the camera and framing, the villa with every window, slab and volume, the terrace and steps, every pine, birch and spruce, the position and size of every bed, ball and thuja, and the morning light with its shadows and mist.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = M · 2 генерации
**Проверка:** наложить S2 на M с прозрачностью 50 %: дом, окна, кромка крыши и шары должны стоять на местах.

### S1 — камера в траве

```
Using @img1, change only the camera position: the camera is lowered into the long grass of the lawn, about 5 centimetres above the ground, looking in the same direction toward the house. Grass blades and seed heads with dew drops fill the lower two thirds of the frame, the nearest ones razor sharp and very close, like a macro photograph at f/2.8 with a shallow depth of field and soft round bokeh. Through the gaps in the grass the villa, the garden and the pines appear far away as a soft blurred background in the upper part of the frame, at the same place on the horizon as in @img1. Keep exactly the same: the morning light and its direction, the colours, the house, the trees and the overgrown state of the garden.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · 16:9 · 2K · `@img1` = S2 · 2 генерации. Если есть свой реф макро травы — `@img2` и в конце: `@img2 is ONLY a reference for the lens and the depth of field — take nothing else from it.`
**Главное:** дом в размытии стоит там же, где в S2 (по центру, на горизонте). На этом держится стык с клипом К1.

### S3c — камера у террасы, 3–4 м

```
Using @img1, change only the camera position: the camera has moved forward across the lawn and along the stepping-slab path and now hovers about 3.5 metres above the ground, just in front of the terrace steps, looking slightly down toward the house. The limestone stepping slabs run straight under the camera to the floating steps, the steel-edged beds with their boxwood balls and grasses pass below on both sides, and the villa fills the upper half of the frame: the cantilevered upper floor on its thin white slab, the graphite basalt walls, the larch slats and the tall frameless glass reflecting the pines. Keep exactly the same: the design of the house, the layout of the garden, the trees, the morning light and the overgrown state of the lawn, the shrubs and the edging.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · 16:9 · 2K · `@img1` = S2 · 2 генерации

### S3 — свет: день

```
Using @img1, change only the light: it is now a clear summer midday. The sun is high, shadows are short and crisp, the greens are fresh and saturated, the sky is clear blue with a few small white clouds, the mist is gone, and the glass of the villa reflects the bright sky and the pines. Keep exactly the same: the camera, the framing, the house, the garden, every plant, its overgrown state and its position.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S3c · 2 генерации

### S4c — вид сверху, 28 м

```
Using @img1, change only the camera position: the camera now looks straight down from about 28 metres above the garden, like a drone shot pointing vertically at the ground. From above, the garden is a clear symmetric pattern in the centre of the frame: the line of pale limestone stepping slabs along the central axis, two long rectangular steel-edged beds on each side with rows of round boxwood balls among the grasses, a columnar thuja at every corner. Even under the overgrowth, the rectangular outlines of the beds, the rows of boxwood balls and the line of slabs stay clearly readable from above. The far edge of the frame shows the limestone terrace and part of the flat roof of the villa with its sedum green roof and a long skylight; the lawn surrounds the garden, and the crowns of Scots pines and birches enter at the corners. Keep exactly the same: the design of the house, the design and proportions of the garden, the morning light and the overgrown state of the lawn, the shrubs and the edging.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · 16:9 · 2K · `@img1` = S2 · 2 генерации
**Как принять:** ось из плит по центру кадра, четыре грядки симметрично, у дальнего края терраса и зелёная крыша. Самый трудный кадр серии: если за 2 прогона не сошлось, третий прогон с `@img2` = M и припиской `@img2 is ONLY a reference for the design of the garden and the house — take nothing else from it.`

### S4 — свет: закат

```
Using @img1, change only the light: it is now the last minutes before sunset on a summer evening. A low warm sun from the side, through the pines, casts very long soft shadows of the boxwood balls, the thujas and the tree trunks across the lawn; the light is warm honey gold, the shadows are cool blue-green, the green roof glows softly. Keep exactly the same: the camera, the framing, the house, the garden, every plant, its overgrown state and its position.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S4c · 2 генерации

### S5a — тот же кадр, сад «после»

```
Using @img1, change only the state of the garden: it has just been fully cared for. The lawn is freshly mown in perfectly even parallel stripes, the boxwood balls and columnar thujas are clipped to crisp clean shapes, the feather reed grass stands upright, the bronze steel edging is clean and sharp, the joints between the limestone slabs are free of grass. Keep exactly the same, pixel for pixel: the camera, the framing, the position and size of every bed, ball and thuja, the house, the trees, and the warm sunset light with its long shadows. @img2 is ONLY the reference for how the groomed garden looks — the bronze steel edging, the clipped balls, the upright grasses and the clean slabs; its camera and light are not copied.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S4 · `@img2` = M · 2 генерации
**Почему @img2:** S2 вышел заросшим сильнее, чем просили (18.10): бордюры скрыты, плиты в траве. Без M модель придумает «после» по-своему.
**Проверка:** разница S5a − S4. Меняться имеют право только газон, кромки фигур и бордюры. Сдвиг дома или центров шаров больше 2 px — перегенерировать: на шторке это видно сразу.

### S5 — синий час и подсветка

```
Using @img1, change only the light: it is now blue hour, half an hour after sunset. The sky light is deep blue and soft, the lawn is dim blue-green, and the lighting of the estate is on: warm hidden linear light under the floating terrace steps and along the edges of the beds, small warm uplights at the base of every thuja, the trunks and crowns of the nearest pines washed softly from below, and the whole glass of the villa glowing warm from inside onto the terrace. All light is warm 2700K, calm and even, without glare and without lens flare. Keep exactly the same, pixel for pixel: the camera, the framing, the house, the garden, every plant and its freshly groomed state.
```

**Настройки:** Nano Banana 2.1 · edit · thinking high · AR как у @img1 · 2K · `@img1` = S5a · 2 генерации
Риск: модель добавит светильники-столбики на газон. Брак — только если это крупные столбы; симметричный свет по оси — норма.

## 3. Клипы К1–К3 (Kling 3.0, start + end, 10 s, 1080p, звук выкл)

Делаются после всех стиллов, все три сразу. Старт и конец — принятые стиллы, поэтому конец К1 и начало К2 — один и тот же кадр S2, конец К2 и начало К3 — S3. Микросдвиги на стыках я сглаживаю при сборке сайта. Каждый клип — одно движение камеры, трава живёт весь клип.

**Negative (общий для трёх):** `cut, scene change, camera shake, camera rotation, zoom pulsing, speed ramp, motion stopping midway, people, animals, birds, insects, cars, text, letters, watermark, house changing shape, windows changing, roof changing, extra buildings, plants morphing, plants growing, new objects, flicker, fisheye, warping, CGI look`

### К1 — из травы на уровень глаз (S1 → S2)

```
One continuous, slow and smooth camera move: the camera rises straight up out of the long grass to eye level, like a crane shot, keeping the villa in the centre of the frame the whole time. As it rises, the close grass blades slide down and out of the bottom of the frame, the focus shifts from the dew drops to the house, and the garden opens up in front. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the seed heads sway softly in a light breeze the whole time, never freezing, and thin mist drifts slowly between the pines. The house, the garden and the trees keep exactly the same shapes, positions and morning light throughout.
```

**Настройки:** Kling 3.0 · start = S1 · end = S2 · 10 s · 1080p · 2 прогона

### К2 — полёт к дому (S2 → S3)

```
One continuous, slow and smooth camera move: the camera glides forward across the lawn and along the stepping-slab path toward the villa, gently rising from eye level to about 3.5 metres, keeping the path on the centre line of the frame. The steel-edged beds with their boxwood balls and grasses pass below on both sides, the villa grows larger ahead and the pines slide past in parallax. At the same time the soft morning light slowly turns into clear midday light, the mist disappears and the shadows shorten. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the reed grass sway softly in a light breeze the whole time, never freezing. The house and every plant keep exactly the same design and position throughout.
```

**Настройки:** Kling 3.0 · start = S2 · end = S3 · 10 s · 1080p · 2 прогона

### К3 — подъём над садом, свет в вечер (S3 → S4)

```
One continuous, slow and smooth drone move: the camera rises high above the garden, drifting back from the villa, and at the same time tilts down until it looks straight down from about 28 metres. The symmetric pattern of the stepping slabs, the steel-edged beds and the rows of boxwood balls gradually unfolds below, with the terrace and the green roof of the villa along the far edge of the frame. During the move the midday light slowly turns into warm sunset light and the shadows of the pines grow very long. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the pine crowns stir softly in a light breeze, never freezing. The house and every plant keep exactly the same design and position throughout.
```

**Negative:** общий + `camera spinning, horizon tilting, flying over the roof`
**Настройки:** Kling 3.0 · start = S3 · end = S4 · 10 s · 1080p · 2 прогона
Риск: Kling может сделать разворот вниз рывком в конце. Тогда третий прогон без слов про отъезд: `rises straight up while tilting down`.

## 4. Стиллы секций

Во всех: `@img1` = **принятый M** в слоте Style. В конец каждого промпта дописывается **[хвост]**:

`@img1 is ONLY the reference for the light, the colour grade, the lens, the materials and the level of grooming — its exact house and layout are not copied. Real photograph for an architecture magazine, Sony A7R V, natural sensor grain, subtle lens vignetting, true-to-life muted colours, real weathering on stone and wood. The scene is empty of people, animals, cars and text.`

Дом в кадре всегда того же языка: графитовый базальт, вертикальные ламели лиственницы, стекло в пол, консоль на тонкой белой плите. Лес — сосны, берёзы, ель. Все — Nano Banana 2.1 · thinking high · **2K в пикере** · 2 генерации, выбрать лучшую.

### P1–P4 — «Как проходит сезон с нами» (4:5)

- **P1 · Осмотр и план:** `A close view of a pale limestone terrace table in the early morning: a large sheet of thick paper with a hand-drawn landscape plan of a modern formal garden in green and graphite ink — only the shapes of beds, stepping slabs, balls and trees, without any writing — held flat by a smooth dark river stone, a graphite pencil and a brass measuring tape beside it. Beyond the table, out of focus, a lawn, clipped boxwood balls and pine trunks in soft morning light.` + [хвост]
- **P2 · График и команда:** `A pair of long-handled hedge shears with wooden handles and a neat waxed canvas tool bag leaning against a freshly clipped columnar thuja, a clean steel wheelbarrow on the limestone stepping slabs beside it, soft morning light falling through the pines.` + [хвост]
- **P3 · Работы:** `A low close view along a freshly mown lawn: crisp parallel mowing stripes running into the depth toward clipped boxwood balls and a straight bronze-coloured steel edge, a few fresh grass clippings in the foreground, dew drying in the morning sun.` + [хвост]
- **P4 · Контроль и отчёт:** `The garden of a contemporary villa near Moscow at blue hour, seen from its limestone terrace: columnar thujas softly lit by small warm uplights, warm hidden linear light along the steel-edged beds and under the floating steps, the lawn in perfect stripes, pine trunks washed softly from below, a deep blue sky.` + `@img1 is ONLY the reference for the lens, the materials and the level of grooming — its light is not copied. @img2 is ONLY the reference for the style of the garden lighting — warm hidden linear light and small uplights — its camera and layout are not copied.` + последние два предложения [хвоста]. Рефы: `@img1` = M, `@img2` = S5.

### T1–T3 — тарифы (4:5, один свет)

- **T1 · BASIC:** `A compact neat garden of a modern single-storey house of graphite brick and larch near Moscow, seen at eye level from the edge of the lawn: a small lawn mown in stripes, one clipped hedge along a dark slatted fence, a short path of pale stepping slabs to the glass entrance, two young apple trees, a small bed of lavender with a few boxwood balls, birches behind the fence. Soft low morning sun.` + [хвост]
- **T2 · PREMIUM:** `The full garden of a large contemporary villa near Moscow, seen at eye level from the lawn: a wide striped lawn, tall clipped hornbeam hedges, a path of pale limestone stepping slabs, a long bed edged with bronze-coloured steel with white panicle hydrangeas, feather reed grass and boxwood balls, mature birches and Scots pines, the cantilevered glass volume of the villa at the back. Soft low morning sun.` + [хвост]
- **T3 · ESTATE:** `The grounds of a large contemporary estate near Moscow, seen from its raised limestone terrace: a long axis of lawn leading to an old forest of Scots pines, a modern formal garden of steel-edged beds with boxwood balls, columnar thujas and grasses, a long still reflecting pool of dark water mirroring the pines, a glass garden pavilion at the far right. Soft low morning sun.` + [хвост]
  ✅ принят 18.10 левый: плоский каменный борт террасы. 1 из 2 дал классическую балюстраду — «raised terrace» тянет классику, поэтому в B2 и R10 дописано «no balustrade».

### W1–W3 — разовые работы, крупные планы (4:5)

- **W1 · Газон:** `A close low view of a freshly mown striped lawn running into the depth toward a clipped hedge, dew on the blades in the foreground, a clean bronze-coloured steel edge between the lawn and pale limestone stepping slabs. Soft low morning sun through pines.` + [хвост]
- **W2 · Растения:** `A close view of a freshly clipped hornbeam hedge with a razor-straight top, in front of it a bed of white panicle hydrangeas, feather reed grass and boxwood balls on dark bark mulch, edged with bronze-coloured steel. Soft low morning sun.` + [хвост]
- **W3 · Деревья:** `Tall Scots pines with orange upper trunks and silver birches on a private estate near Moscow, with clean, properly pruned crowns and clear trunks above a striped lawn, dappled morning sun through the canopy.` + [хвост]

### R01–R10 — «10 способов» (4:5)

Тексты карточек — из инфографики заказчика; кадры новые, в одном свете.

1. **Обновление газона:** `A renewed, dense and even lawn in front of a contemporary villa of graphite basalt and larch, freshly overseeded and rolled into neat stripes, a bronze steel edge along pale stepping slabs, pines behind. Soft low morning sun.` + [хвост]
2. **Дорожки:** `A path of large pale limestone stepping slabs set into a lawn, curving gently between clipped boxwood balls and feather reed grass, slim black bollard lights beside it switched off, pine trunks at the back. Soft low morning sun.` + [хвост]
3. **Клумбы:** `A modern perennial border on dark bark mulch, edged with bronze-coloured steel: white panicle hydrangeas, catmint, sage, feather reed grass and boxwood balls, a striped lawn in front. Soft low morning sun.` + [хвост]
4. **Подсветка:** `A contemporary garden near Moscow at blue hour with the lighting on: warm hidden linear light along the beds and under the floating terrace steps, uplights at the base of pines washing their orange trunks, the glass villa glowing warm behind.` + `@img1 is ONLY the reference for the lens, the materials and the level of grooming. @img2 is ONLY the reference for the style of the garden lighting — warm hidden linear light and small uplights — its camera and layout are not copied. Real photograph for an architecture magazine, natural sensor grain, no lens flare. The scene is empty of people, animals, cars and text.` Рефы: `@img1` = M, `@img2` = S5.
5. **Живая изгородь:** `A tall dense hedge of columnar thujas along a dark slatted larch fence, perfectly trimmed, a striped lawn and pale stepping slabs in front of it. Soft low morning sun.` + [хвост]
6. **Каменные композиции:** `A rock garden on a gentle slope beside a lawn: large grey granite boulders, dark grey gravel, dwarf mountain pines, junipers and feather reed grass, tall Scots pines behind. Soft low morning sun.` + [хвост]
7. **Автополив:** `Pop-up sprinklers watering a striped lawn, fine arcs of water catching the low sun as bright droplets, clipped boxwood balls and pine trunks behind.` + [хвост]
8. **Зона отдыха:** `A wooden larch deck under a minimalist flat steel pergola beside a contemporary villa, one long built-in bench with linen cushions, a round dark steel fire bowl and two large concrete planters with grasses, a lawn and pines around. Soft low morning sun.` + [хвост]
9. **Сезонное обслуживание:** `A contemporary garden in early autumn kept perfectly tidy: a clean striped lawn, a freshly trimmed hedge, a bed with cut-back perennials and fresh mulch, a few golden birch leaves on the pale stepping slabs. Soft low sun.` + [хвост]
10. **Премиальное обновление:** `A completely transformed garden of a contemporary villa near Moscow, seen from its limestone terrace with a plain modern stone edge and no balustrade: a modern formal garden of steel-edged beds with boxwood balls, columnar thujas and grasses, a path of pale stepping slabs with slim lights, a striped lawn and old Scots pines.` + [хвост]

Риск: №8 — модель плодит подушки и мебель; держать «one long built-in bench» и не добавлять слов про уют.

### B1, B2 — «До и после», ракурс с террасы (16:9)

Сначала «после» (B2), потом «до» эдитом — так ракурс совпадёт.

- **B2 · после:** `A real photograph taken from the limestone terrace of a contemporary villa near Moscow at eye level, looking down the garden: three long low floating steps with a plain modern stone edge in the foreground — no balustrade, no balusters, no classical details — below them a striped lawn, a path of pale stepping slabs leading away between two steel-edged beds of boxwood balls and feather reed grass, a line of columnar thujas, and an old forest of Scots pines and birches at the back. Soft low morning sun.` + [хвост]
  **Настройки:** 16:9 · `@img1` = M · 2 генерации
- **B1 · до:** `Using @img1, change only the state of the garden: it has been neglected for a whole season. The lawn is overgrown, patchy and uneven with dandelions and bare spots, the boxwood balls and thujas have lost their shapes under loose shoots, the grasses have collapsed, weeds hide the steel edging and grow between the stepping slabs, last year's pine needles and birch leaves lie everywhere. Keep exactly the same, pixel for pixel: the camera, the framing, the terrace steps, the trees, the line of the path, the position and size of every bed and plant, and the morning light.`
  **Настройки:** edit · AR как у @img1 · `@img1` = B2 · 2 генерации

### Z1–Z4 — «Круглый год», эдиты T2 (16:9)

- **Z1 · лето:** `Using @img1, change only the frame: extend the scene to a wider 16:9 horizontal frame — continue the lawn, the hedges, the pines and the birches naturally to the left and to the right. Keep the original image unchanged in the middle, with the same light.` · `@img1` = T2
- **Z2 · весна, Z3 · осень, Z4 · зима** — `@img1` = Z1, текст: `Using @img1, change only the season: СТРОКА_СЕЗОНА Keep exactly the same: the camera, the framing, and the shape and position of every plant, hedge, path and the house.`
  - весна: `early May — fresh light-green young leaves on the birches, the lawn freshly green, white tulips in the bed, cool clear spring light.`
  - осень: `early October — the birches are golden, a scattering of golden leaves on the lawn and the slabs, the hydrangeas faded to pink-beige, the reed grass straw-coloured, soft low autumn light.`
  - зима: `January — deep fresh snow on the lawn, on the hedge tops and on the boxwood balls, bare birch branches, dark green pines dusted with snow, the stepping slabs cleared, pale overcast winter light, warm light glowing from the windows of the villa.`

**Настройки:** edit · 16:9 · 2 генерации на каждый

## 5. Куда класть результат

Проще всего — просто скидывать мне в чат, разложу сам. Если раскладывать вручную:

| что | файл |
|---|---|
| S1, S2, S3, S4, S5a, S5 | `media-src/s1.png … s5.png`, `media-src/s5a.png` |
| клипы | `media-src/k1.mp4`, `k2.mp4`, `k3.mp4` |
| стиллы секций | `tools/.cache/stills/<имя>.png`: `process-1…4`, `tariff-basic/premium/estate`, `price-lawn/plants/trees`, `way-01…10`, `ba-before/after`, `season-summer/spring/autumn/winter` |

## 6. Видео второй волны (21.10.2026) — для качества на телефоне и живых секций

### 6.1 Вертикальный пролёт 9:16 — S1v–S4v и К1v–К3v

Сейчас телефон получает кроп из 16:9 и теряет половину кадра. Делаем вертикальные стиллы эдитами принятых S1–S4 (тот же сад, та же камера, кадр продолжен вверх и вниз), затем те же три клипа в 9:16.

**S1v … S4v** — Nano Banana 2.1 · edit · thinking high · **9:16** · 2K · `@img1` = S1 (S2, S3, S4) · 2 генерации
```
Using @img1, change only the frame: extend the scene to a 9:16 vertical frame — keep the original image unchanged in the middle, and continue the sky and the tree crowns naturally above, the lawn and the grass naturally below. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```
Для S4v (вид сверху) вместо неба и газона: `continue the lawn and the pine crowns naturally above and below`.
Проверка: наложить S2v на S2 по центру — середина совпадает пиксель в пиксель; иначе перегенерировать.

**К1v, К2v, К3v** — Kling 3.0 · start/end = S1v→S2v, S2v→S3v, S3v→S4v · 10 s · 1080p · **9:16** · промпты и негатив те же, что у К1–К3 (раздел 3). Клипы → `media-src/k1v.mp4 … k3v.mp4`; `tools/frames.mjs` берёт их для серии tall (доработка: если есть kNv.mp4 — tall-кадры из них, а не кропом).

### 6.2 Лупы секций (Kling 3.0, start = end = стилл, 5 s, 1080p)

Проверенная схема «меняется только свет» (§7.G плана, тетрадь Magnific §28/§34): все прогоны одного промпта взаимозаменяемы и клеятся в длинную петлю.

- **T1, T2, T3** (тарифы): 
```
Locked-off static camera. The ONLY thing that changes is the light: the soft shadow of a passing cloud slowly glides across the lawn from left to right and the sunlight returns, ending on exactly the starting look. The house, the plants, the path and the beds stay exactly the same; the grasses stir very slightly.
```
- **B2** (шторка «после»):
```
Locked-off static camera. The ONLY things that move are the air and the light: the feather reed grass and the hydrangeas sway softly in a light breeze, thin sunbeams between the pines drift slowly, and the clip ends on exactly the starting look. The terrace, the steps, the path, the beds and the trees keep exactly the same position and shape.
```
- **Z1** (лето в «Круглый год»): промпт T1–T3.

**Negative (все):** `camera movement, zoom, pan, people, animals, birds, cars, text, watermark, deformation, morphing plants, plants growing, new objects, flicker, background change, lights turning on`
**Настройки:** по 2 прогона на кадр; файлы → `media-src/loop-t1.mp4`, `loop-t2.mp4`, `loop-t3.mp4`, `loop-b2.mp4`, `loop-z1.mp4`.
