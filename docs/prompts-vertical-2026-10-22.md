# Вертикальный пролёт 9:16 для телефона — что генерить, по порядку (22.10.2026)

Зачем: сейчас телефон получает кроп из горизонтального кадра и теряет половину сцены. С вертикальной серией телефон видит полный кадр, а сборка (`tools/frames.mjs`) берёт её автоматически. Всё ниже — копировать блоками целиком. Файлы класть в `media-src/` под указанными именами, мастера — в «все рендеры/».

Порядок строгий: сначала шесть стиллов, потом три клипа, потом ночной луп. Каждый шаг от принятого предыдущего.

## Шаг 1. Стиллы S1v, S2v, S3v, S4v — расширение кадра

Nano Banana 2.1 · edit · thinking high · **9:16** · 2K · `@img1` = соответствующий принятый горизонтальный стилл (S1, S2, S3, S4) · 2 генерации каждый.

Для S1v, S2v, S3v:
```
Using @img1, change only the frame: extend the scene to a 9:16 vertical frame — keep the original image unchanged in the middle, and continue the sky and the tree crowns naturally above, the lawn and the grass naturally below. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```

Для S4v (вид сверху):
```
Using @img1, change only the frame: extend the scene to a 9:16 vertical frame — keep the original image unchanged in the middle, and continue the lawn and the pine crowns naturally above and below. Keep exactly the same: the camera, the light, the house, the garden and every plant.
```

Проверка: наложить S2v на S2 по центру — середина совпадает пиксель в пиксель, иначе перегенерировать.
Файлы: `media-src/s1v.png`, `s2v.png`, `s3v.png`, `s4v.png`.

## Шаг 2. S5av — сад «после» от S4v

Nano Banana 2.1 · edit · thinking high · AR как у @img1 (9:16) · 2K · `@img1` = **S4v** · `@img2` = M · 2 генерации.
```
Using @img1, change only the state of the garden: it has just been fully cared for. The lawn is freshly mown in perfectly even parallel stripes, the boxwood balls and columnar thujas are clipped to crisp clean shapes, the feather reed grass stands upright, the bronze steel edging is clean and sharp, the joints between the limestone slabs are free of grass. Keep exactly the same, pixel for pixel: the camera, the framing, the position and size of every bed, ball and thuja, the house, the trees, and the warm sunset light with its long shadows. @img2 is ONLY the reference for how the groomed garden looks — the bronze steel edging, the clipped balls, the upright grasses and the clean slabs; its camera and light are not copied.
```
Проверка: разница S5av − S4v. Меняться имеют право только газон, кромки фигур и бордюры. Сдвиг дома или центров шаров больше 2 px — перегенерировать.
Файл: `media-src/s5av.png`.

## Шаг 3. S5v — синий час и подсветка от S5av

Nano Banana 2.1 · edit · thinking high · AR как у @img1 (9:16) · 2K · `@img1` = **S5av** · 2 генерации.
```
Using @img1, change only the light: it is now blue hour, half an hour after sunset. The sky light is deep blue and soft, the lawn is dim blue-green, and the lighting of the estate is on: warm hidden linear light under the floating terrace steps and along the edges of the beds, small warm uplights at the base of every thuja, the trunks and crowns of the nearest pines washed softly from below, and the whole glass of the villa glowing warm from inside onto the terrace. All light is warm 2700K, calm and even, without glare and without lens flare. Keep exactly the same, pixel for pixel: the camera, the framing, the house, the garden, every plant and its freshly groomed state.
```
Файл: `media-src/s5v.png`.

## Шаг 4. Клипы К1v, К2v, К3v

Kling 3.0 · start + end · 10 s · 1080p · **9:16** · звук выкл · 2 прогона каждый.

**Negative (общий для трёх):**
```
cut, scene change, camera shake, camera rotation, zoom pulsing, speed ramp, motion stopping midway, people, animals, birds, insects, cars, text, letters, watermark, house changing shape, windows changing, roof changing, extra buildings, plants morphing, plants growing, new objects, flicker, fisheye, warping, CGI look
```

**К1v** — start = S1v · end = S2v
```
One continuous, slow and smooth camera move: the camera rises straight up out of the long grass to eye level, like a crane shot, keeping the villa in the centre of the frame the whole time. As it rises, the close grass blades slide down and out of the bottom of the frame, the focus shifts from the dew drops to the house, and the garden opens up in front. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the seed heads sway softly in a light breeze the whole time, never freezing, and thin mist drifts slowly between the pines. The house, the garden and the trees keep exactly the same shapes, positions and morning light throughout.
```

**К2v** — start = S2v · end = S3v
```
One continuous, slow and smooth camera move: the camera glides forward across the lawn and along the stepping-slab path toward the villa, gently rising from eye level to about 3.5 metres, keeping the path on the centre line of the frame. The steel-edged beds with their boxwood balls and grasses pass below on both sides, the villa grows larger ahead and the pines slide past in parallax. At the same time the soft morning light slowly turns into clear midday light, the mist disappears and the shadows shorten. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the reed grass sway softly in a light breeze the whole time, never freezing. The house and every plant keep exactly the same design and position throughout.
```

**К3v** — start = S3v · end = S4v · Negative: общий + `camera spinning, horizon tilting, flying over the roof`
```
One continuous, slow and smooth drone move: the camera rises high above the garden, drifting back from the villa, and at the same time tilts down until it looks straight down from about 28 metres. The symmetric pattern of the stepping slabs, the steel-edged beds and the rows of boxwood balls gradually unfolds below, with the terrace and the green roof of the villa along the far edge of the frame. During the move the midday light slowly turns into warm sunset light and the shadows of the pines grow very long. The move lasts the ENTIRE clip from the first frame to the last, at an even speed, and settles gently on the final frame. The grass and the pine crowns stir softly in a light breeze, never freezing. The house and every plant keep exactly the same design and position throughout.
```
Если Kling делает разворот вниз рывком в конце — третий прогон со словами `rises straight up while tilting down` вместо отъезда.

Файлы: `media-src/k1v.mp4`, `k2v.mp4`, `k3v.mp4`.

## Шаг 5. Ночной луп К4v

Kling 3.0 · start = end = **S5v** · 5 s · 1080p · 9:16 · звук выкл · 2 прогона.
```
Locked-off static camera, the exact same view from the first frame to the last. The ONLY things that move are the light and the air: the warm garden lights breathe very gently, thin evening mist drifts slowly between the pines, the grass stirs barely, and the clip ends on exactly the starting look. The house, the terrace, the beds and every plant keep exactly the same position and shape.
```
**Negative:** `camera movement, zoom, pan, people, animals, birds, cars, text, watermark, deformation, morphing plants, plants growing, new objects, flicker, background change, lights turning off`
Файл: `media-src/k4v.mp4`.

## Сборка после того, как всё лежит в media-src/

```bash
node tools/frames.mjs --per=32 --fmt=webp --tallfmt=jpg --q=58 --tallw=600 && node tools/build.mjs && node tools/deploy.mjs --publish
```

`frames.mjs` сам увидит `k1v..k3v.mp4` и `s4v/s5av/s5v` и соберёт tall-серию из них; `k4v.mp4` подхватывается тоже: на телефоне ночной луп будет вертикальным.
