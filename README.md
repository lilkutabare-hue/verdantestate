# Verdant Estate — сайт

Имиджевый одностраничник для сервиса ухода за частными садами (Москва и МО). Живёт в Тильде блоками T123, тяжёлое — на GitHub Pages. План и характер — `PLAN.md`, тексты — `docs/brief-2026-10-09.md`, решения — `docs/decisions.md`.

## Где что

| что | где |
|---|---|
| исходники секций (каждая = блок T123) | `src/01-header.html … 13-footer.html`, общий код HEAD — `src/head.html` |
| 3D-сцена хиро (three.js) | `src3d/garden3d.js` → сборка `docs/site/js/garden3d.js` |
| запасной движок на кадрах | `docs/site/js/scene.js` + `docs/site/media/scene/manifest.json` |
| медиа, шрифт, движки (раздаёт Pages) | `docs/site/` |
| превью для заказчика | `docs/index.html` (корень Pages) |
| блоки для вставки в Тильду | `dist/t123-NN.html`, `dist/head.html`; стенд с обёртками Тильды — `dist/preview.html` |
| временные кадры из SVG (до рендеров) | `tools/placeholders.mjs` |
| стиллы из 3D-сцены | `tools/stills.html` (в браузере на стенде) → `tools/stills.mjs` (webp) |

## Команды

```bash
npm install
```

```bash
node tools/bundle.mjs && node tools/build.mjs
```

```bash
node tools/serve.mjs
```

Стенд: `http://localhost:5181/` — превью как на Pages; `http://localhost:5181/dist/preview.html` — обёртки Тильды.

Стиллы из 3D: открыть `http://localhost:5181/tools/stills.html` (рендерит и шлёт PNG в `tools/.cache/stills/`), затем `node tools/stills.mjs` и пересобрать.

## Как устроена страница

- Один HEAD (`dist/head.html`, 8 КБ): шрифт Cormorant Garamond с Pages, токены, базовые стили `.ve-*`, реестр `window.VE` (адреса с версией, появление по IntersectionObserver, общий префилл формы).
- Секция = блок T123 с разметкой, `<style>` и `<script>`, не зависит от соседей. Стили скоуплены `.ve-`, Тильду не трогают.
- Хиро: секция 320svh, внутри sticky-экран с `<canvas>`. Прогресс читается из нативного скролла. Режимы: `garden3d.js` (WebGL2) или `scene.js` (кадры). Отладка: `?ve3d=0` принудительно кадры, `?ve3d=1` принудительно 3D; `VE.hero.hold(p)` замораживает время суток.
- Версия сборки — хэш исходников, подставляется во все адреса (`?v=`).

## Что ещё не решено (владелец/заказчик)

См. `PLAN.md` §9 и `docs/decisions.md`: контакты и юрлицо, куда уходит заявка, вектор логотипа от заказчика (сейчас трассировка), рендеры Magnific для секций.
