# VERDANT ESTATE — план имиджевого сайта с моушн-сценой на скролле

Для нового чата: **Fable 5.1, effort high**. Папка проекта: `~/Documents/xtc/verdantestate/` (свой git, в репо XTC ничего не класть).
Хостинг: Тильда, секции сайта — блоки T123 с настоящей разметкой, тяжёлое (кадры сцены, медиа, движок) — GitHub Pages (решено 09.10.2026, см. §8–9). Составлен 09.10.2026 по брифу `docs/brief-2026-10-09.md`, логотипу `brand/logo-ve.jpg`, инфографике `brand/10-ways-infographic.jpg` и docx-дампу `docs/docx-verdant-estate-v1.md` (старая концепция, только для тона).

---

## 0. Как начинать новый чат (чек-лист для модели)

1. Загрузить скилл `хтс-веб-дизайн` ПЕРВЫМ (почерк владельца, техника, карта скиллов). Прочитать `references/почерк.md` и `references/техника.md`. Вторым — `хтс-тильда`: §2 (правила вставки в T123, лимиты, что ломает Тильда), §4 (локальный стенд), §8 только как запасной путь. Сайт живёт на Тильде блоками T123, решено 09.10.2026.
2. Прочитать этот план целиком и `docs/brief-2026-10-09.md`. Тексты сайта берутся из брифа дословно, цифры не выдумывать.
3. `git init` в этой папке, если ещё нет. Коммит после каждой принятой правки.
4. Работать по правилу «**одна перемена за круг**»: сделал → показал (скриншот/раскадровка/превью) → слово владельца → дальше. Пять правок разом не показывать.
5. Любое движение сначала раскадровкой (3–5 кадров по времени) ДО того, как тратить генерации Magnific или часы кода.
6. Промпты для Magnific отдавать строго по формату скилла `anthropic-skills:magnific-prompting` (промпт EN одним блоком + строка «Настройки»; у Seedream негатив внутри промпта, у Kling — отдельным полем). Промпты из §7 этого плана — стартовые, уточнять по правилу одного изменения.
7. Без агентов и воркфлоу: один чат, одна линия работы.
8. Для правок и проверки использовать скиллы по карте: `animate`/`micro-interaction` (движение), `svg-animation` (линии), `60fps-animation` (если лагает), `хтс-адаптация` (матрица 20 устройств перед сдачей), `break-ui` (худшие данные), `mobile-native` (ощущение на телефоне). Не подключать стекло/частицы/3D — не в характере.

---

## 1. Что это за сайт (характер одной фразой)

**Тихий, дорогой, медленный сад. Как частный клуб: мало слов, много воздуха, двигается сад, а не интерфейс.**

Для кого: владельцы частных домов и усадеб в Москве и МО с бюджетом 60–190 тыс. ₽/мес на уход. Они не ищут «садовника», они покупают отсутствие забот. Сайт должен **показывать состояние ухоженного сада в любое время суток и года** — это и есть продукт.

Что продаём: **постоянное управление садом** (подписка BASIC / PREMIUM / ESTATE). Разовые работы и «сад под ключ» — вторичные. Акции — только бонусы, никаких «-30%».

Что НЕ делаем:
- Кино вместо сайта: автоплей-ролики на весь экран, заставки, интро, прелоадеры с логотипом. Вход сразу в суть.
- Перехват скролла (Lenis, Locomotive, свой скролл). Нативный скролл, сцена только **читает** прогресс.
- Переворот темы на скролле, гигантскую типографику, параллакс между блоками, «плавающие» расстояния.
- Подписи, бейджи, счётчики поверх картинок. Выдуманные цифры доверия («14 лет», «180 объектов»).
- Стекло, частицы, 3D, кастомный курсор.
- Генерацию людей, рук, букв и логотипа нейросетью. Лого — наш файл, текст — HTML.

---

## 2. Что у нас есть

| ресурс | где | заметка |
|---|---|---|
| Логотип (монограмма VE + лавровая ветвь в круге + VERDANT ESTATE / LANDSCAPING & GARDEN DESIGN) | `brand/logo-ve.jpg`, 1254² растр | Нужен вектор: спросить у заказчика; если нет — трассировать (potrace/vtracer) или перерисовать ветвь и круг вручную в SVG. Монограмма — отдельный SVG для шапки. |
| Инфографика «10 способов» | `brand/10-ways-infographic.jpg` 1536×1024 | Фото в ней маленькие (~300 px) и разного света — на сайт не идут, перегенерируем на Magnific в одном свете (§7.E). Тексты карточек берём. |
| Бриф с текстами и ценами | `docs/brief-2026-10-09.md` | Источник правды. |
| Старое превью (12.09.2026, концепция «ландшафтная студия») | артефакт `https://claude.ai/code/artifact/dcea6622-b1a8-400c-a651-01a576a105c2` | Концепция устарела (там проектирование/стройка). Из него можно взять только механику шторки «до/после» и калькулятора. Не копировать визуал. |
| Magnific (Seedream 5 PRO, Kling 3.0, апскейлер) | — | Фото и видео делаем сами по промптам §7. |

Цветовая база бренда (с логотипа): тёмный оливково-зелёный ≈ `#3C4A2B` на сливочном ≈ `#F8F6F0`. Логотип — классический римский серифный капс.

---

## 3. Дизайн-система

### Палитра (одна светлая тема, без тёмной)
```
--paper:   #F7F4EC   фон, «бумага»
--paper-2: #EFEBE0   подложки, карточки без рамок
--ink:     #2F3B24   текст, монограмма (чуть темнее лого для контраста)
--moss:    #5E6E45   второстепенный текст, иконки, линии прогресса
--line:    rgba(47,59,36,.14)
--lamp:    #E2B46C   только внутри визуалов ночи (свет фонарей) и в ОДНОМ месте UI — активная точка на шкале времени. На кнопках не использовать.
```
Кнопка — заливка `--ink`, текст `--paper`, радиус 999, высота 52 на телефоне. Вторая кнопка — контурная. Никакого золота на UI.

### Типографика
- **Заголовки:** один серифный файл, самохост, woff2. Гарнитура класса Garamond (Cormorant Garamond 500/600 или EB Garamond) — под логотип. Это единственный внешний шрифт, он оправдан брендом. Заголовки строчными с заглавной, НЕ капсом; капс только для брендовых слов (VERDANT ESTATE, PRIVATE GARDEN SERVICE, BASIC/PREMIUM/ESTATE) с трекингом .14em и мелким кеглем.
- **Текст и интерфейс:** системный гротеск `-apple-system, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif`. 16–17 px на телефоне, 17–18 на компьютере, line-height 1.5.
- **Цены:** `font-variant-numeric: tabular-nums`, разряды через узкий неразрывный пробел U+202F, «₽» обычным знаком.
- Кегли заголовков: телефон h1 40 / h2 30, компьютер h1 72 / h2 44. Без «гигантской» типографики.

### Сетка и воздух
- Телефон: поля 20 px, одна колонка, секции 72 px между собой.
- Компьютер: контейнер 1240 px, поля 40, секции 120 px. Текстовые колонки не шире 56ch.
- Картинки — без рамок и теней, радиус 8 (телефон) / 12 (компьютер). Карточки без «карточности»: тон `--paper-2` или просто хэйрлайн сверху.

### Движение (общее)
- Появление: `opacity 0→1`, `translateY 12px→0`, `.5s cubic-bezier(.2,.9,.2,1)`, лесенка по детям 60 мс, по IntersectionObserver, один раз.
- Hover: `translateY(-2px)` на кнопках, картинки без зума. Active `scale(.97)`.
- Всё на `transform`/`opacity`. Сцена хиро — canvas, но скролл нативный.
- `prefers-reduced-motion: reduce` — сцена показывает стилл, появления без движения.
- Рамка фокуса только для клавиатуры.

---

## 4. Структура страницы (одна страница, мобильный first)

Две раскладки проектируются отдельно: телефон (9:16, одна колонка, сцена во весь экран) и компьютер (16:9, сцена во весь экран, текст слева).

### 4.1 Шапка
Шапка своя (блок T123), шапку и подвал Тильды на странице не включать: страница состоит только из наших блоков T123 по секциям.
Слева монограмма VE (SVG, 28 px), по центру ничего, справа телефон (на компьютере) и кнопка «Рассчитать». Прозрачная поверх сцены, после первого экрана — тонкая сливочная полоса с хэйрлайном. Уходит вниз при скролле вниз, возвращается при 10 px вверх.

### 4.2 ХИРО — сцена «Один день сада» (главный моушн-элемент)
Закреплённый экран (sticky) высотой 100svh внутри секции высотой 320svh (телефон) / 300vh (компьютер). Пока пользователь прокручивает эти три экрана, кадр сада **проживает день**: рассвет с туманом → ясное утро → золотой час → синий час с включённой подсветкой. Камера неподвижна. Растения, дорожки и дом не меняются — меняется только свет. Это буквальная иллюстрация «сад под контролем в любое время суток» и самая надёжная вещь для генерации (Kling «меняется только свет» проверен 3/3 в скилле Magnific §34).

Поверх кадра — текст, который разворачивается главами по прогрессу p:
- p 0–.25: `VERDANT ESTATE` / `PRIVATE GARDEN SERVICE` (мелкий капс) и h1 «Сад, за которым не нужно следить».
- p .25–.5: строка «Один договор.»
- p .5–.75: «Один ответственный.»
- p .75–1: «Весь сад под контролем.» + кнопка «Рассчитать стоимость» (появляется один раз и остаётся).
Каждая строка приезжает снизу на 12 px и остаётся; предыдущие не исчезают — к концу стоит весь слоган. Текст слева снизу на компьютере, снизу на телефоне, над ним мягкий градиент к `--ink` 40 % для читаемости (градиент, не блюр).

Маленькая деталь в углу: **часы** `06:40 → 21:30`, табличные цифры 12 px, тикают с прогрессом (линейно по p). Единственный «интерфейсный» элемент сцены. Когда наступает ночь (p > .8), точка перед часами становится `--lamp`.

На телефоне сцена — вертикальный кроп 9:16 того же кадра (центр чуть правее, где дорожка). Если кроп не читается — отдельная серия 9:16 (§7.A, шаг 6).

**Движок сцены** — §5.

### 4.3 «Сад, за которым не нужно следить» — манифест
Текст из брифа. Три короткие колонки (на телефоне — три строки с хэйрлайнами): **Планируем** · **Организуем** · **Контролируем**. Никаких иконок. Появление лесенкой.

### 4.4 Постоянный уход — тарифы
Три тарифа BASIC / PREMIUM / ESTATE. На компьютере три колонки; на телефоне **горизонтальный скроллер со snap**, карточка 84 % ширины, видно край следующей. У каждого тарифа — свой кадр сада (§7.B): маленький сад → полноценный сад → усадьба, в одном свете (поздний день). Под кадром: имя капсом, «от 60 000 ₽ / месяц», одна строка «для кого», список буллетов, кнопка «Рассчитать» (контурная, ведёт в форму с предвыбранным тарифом).
Движение: кадр в карточке дышит — `scale 1 → 1.03` за 12 с туда-обратно, только когда карточка на экране. На тач без hover-эффектов.

### 4.5 Почему цена индивидуальная — «Соберите свой сад»
Интерактив вместо абзаца. Список факторов из брифа как чипсы: площадь (слайдер 4–60 соток), газон, деревья, кустарники, цветники, живые изгороди, автополив, рельеф, состояние сада. Пользователь отмечает, что есть, и видит внизу не цену, а **ориентир**: «Похоже на PREMIUM · от 110 000 ₽ / месяц · точную цифру скажем после осмотра». Правило ориентира простое и честное: площадь до 10 соток и ≤2 факторов → BASIC; до 25 соток или 3–5 факторов → PREMIUM; больше → ESTATE. Выбор уезжает в форму (prefill). Текст «Два участка одинаковой площади…» остаётся как подпись к блоку.

### 4.6 Экономика — «Один договор — весь сад» (главный аргумент, «глазами»)
Сезон с апреля по ноябрь как горизонтальная шкала. Два ряда:
- **Разовые вызовы** — на шкале одна за другой вспыхивают точки: покос · обрезка · уборка · полив · арборист · подготовка к зиме, у каждой три мелких слова «поиск · расчёт · выезд». Точки лежат неровно, как и в жизни.
- **Verdant Estate** — одна непрерывная линия через весь сезон, с ровными метками визитов.
Линия и точки **рисуются по мере прокрутки** (SVG `stroke-dashoffset` и `opacity`, привязаны к прогрессу блока, без закрепления). На телефоне шкала вертикальная (апрель сверху), ряды — две колонки. Под шкалой пять строк «в результате…» из брифа. Никаких выдуманных рублей и процентов — сравниваем количество действий, а не деньги.

### 4.7 Разовые работы — прайс
Три вкладки: Газон · Растения · Деревья. Типографическая таблица: название слева, «от 1 500 ₽ / сотка» справа табличными цифрами, строки через хэйрлайн, появляются лесенкой. На компьютере справа от таблицы одна картинка категории (§7.C), меняется с вкладкой через кроссфейд .4s. Фраза «Если вам не нужен постоянный уход…» — над таблицей. Под таблицей тихая строка: «Сложные работы — по смете».

### 4.8 Сад под ключ — «10 способов»
Горизонтальная лента из 10 карточек (нативный скролл со snap, на компьютере drag колёсиком и мышью, без перехвата). Карточка: кадр 4:5 (§7.E), номер мелким серифом, заголовок, одна строка описания. Никаких подписей поверх фото. Это блок апсейла, он после прайса.

### 4.9 До / после — шторка
«Сад до обслуживания — и через один сезон». Два кадра одного ракурса (§7.D): запущенный и ухоженный. Шторка тянется пальцем/мышью (input range поверх, `clip-path`). Подписи «до»/«после» мелким капсом по углам — единственные подписи поверх фото на сайте, они функциональны.

### 4.10 Круглый год — сезоны
Четыре вкладки Весна · Лето · Осень · Зима. Один и тот же кадр сада в четырёх сезонах (§7.F), кроссфейд .6s. Справа список работ сезона (составить из брифа: стрижка, обрезка, обработки, подкормки, подготовка к зиме, уборка). Цветовой тон страницы НЕ меняется.

### 4.11 Бонусы вместо скидок
Заголовок «Специальные условия». Три-четыре тихих блока: **Первый аудит сада** · **Сезонный комплекс в первый месяц** · **Приоритетный выезд** · **Дополнительные часы специалиста**. Без процентов, без таймеров, без «только до».

### 4.12 Форма — «Рассчитать стоимость»
Поля: имя, телефон (маска +7), площадь (из §4.5), чипсы «что есть на участке» (из §4.5), тариф (из §4.4), комментарий. Чекбокс согласия. Кнопка «Отправить». После отправки — текст «Перезвоним в течение дня» без конфетти. Поля от 16 px, чтобы iOS не зумил. Куда уходит заявка — открытый вопрос §9.

### 4.13 Подвал
Логотип целиком (круг с ветвью и надписью), «Москва и Московская область», телефон, Telegram, WhatsApp, почта, политика. Ветвь логотипа **дорисовывается** при появлении подвала (SVG stroke, 1.4 с) — единственное украшение подвала; если владелец скажет «лишнее», убрать.

---

## 5. Движок сцены хиро (scroll-scrub)

### Принцип
Нативный скролл. Секция `.scene` высотой 320svh; внутри `.scene__stage` `position: sticky; top: 0; height: 100svh` с `<canvas>`. В `rAF` читаем `scrollY`, считаем `p = clamp((scrollY - top) / (height - vh), 0, 1)`, целевой кадр `t = p * (N - 1)`. Отрисованный кадр догоняет целевой: `cur += (t - cur) * 0.18` за кадр, рисуем `floor(cur)` и `ceil(cur)` с альфой дробной части (**смешивание соседних кадров**, поэтому кадров нужно мало). Цикл засыпает, когда `|t - cur| < .01`, и при `document.hidden`.

Cover-кроп считаем сами: по соотношению сторон холста и кадра, фокус-точка кадра задаётся в манифесте (`focus: [0.56, 0.55]`), чтобы на телефоне в кадре оставалась дорожка.

### Два пути (строим A, потом апгрейд до B)
- **Путь A — четыре стилла.** Рассвет / утро / золотой час / ночь (§7.A, шаги 1–4). N = 4, смешивание по p. Весит ~600 КБ, работает на любом телефоне, нулевой риск. **Это первый milestone**, его показываем владельцу до генерации видео.
- **Путь B — кадровая последовательность из Kling.** Два клипа по 10 с (рассвет→золотой час, золотой час→ночь), склейка по последнему кадру первого клипа. Из 480 кадров берём **N = 48** (каждый 10-й), смешивание делает движение плавным. Тени реально ползут, туман тает, фонари зажигаются — вот это и есть «моушн видео скролл».

### Бюджет и форматы (путь B)
| | компьютер | телефон |
|---|---|---|
| размер кадра | 1440×810 | 720×1280 (кроп 9:16) |
| кадров | 48 | 36 |
| формат | AVIF q55 + WebP q72 запасной | то же |
| целевой вес серии | ≤ 4.5 МБ | ≤ 2.2 МБ |
| первый экран | постер (кадр 0) как `<img>` в HTML, ≤ 90 КБ, грузится до скриптов | то же |

Загрузка: сначала 6 опорных кадров равномерно по серии (0, 9, 18, …), потом остальные по три; пока кадр не загружен, рисуем ближайший загруженный. `decode()`/`createImageBitmap` до рисования. Выбор размера по `devicePixelRatio × ширина` и `Save-Data`. Все пути с номером сборки (`?v=`).

### Приёмка сцены числами
- LCP (постер) ≤ 1.5 с на 4G эмуляции.
- Нет кадров дольше 32 мс при скролле на iPhone (мерить на живом телефоне, не в headless).
- Серия догружается не дольше 6 с на 4G; до этого сцена уже работает на опорных кадрах.
- `prefers-reduced-motion` → постер и кроссфейд в ночной стилл в конце секции.
- Консоль пустая.

### Подготовка кадров — скрипт `tools/frames.mjs`
Вход: mp4 из Kling. ffmpeg → PNG каждый k-й кадр → два кропа (16:9 и 9:16 по focus) → AVIF/WebP в два размера → `media/scene/manifest.json` (список файлов, N, focus, размеры). Имена только `[a-z0-9-]`. Метаданные вычищены.

---

## 6. Этапы работы (каждый этап = показ владельцу)

| № | этап | результат показа |
|---|---|---|
| 0 | Папка, git, репо на GitHub с Pages из `docs/` (медиа, кадры, движок сцены), исходники секций в `src/`, сборщик `tools/build.mjs` → `dist/t123-NN.html`, локальный стенд с обёртками Тильды | — |
| 1 | **Первый экран статикой** на одном кадре-постере (временно — любой кадр из §7.A шаг 1, можно черновой) + типографика + шапка | скриншоты телефон/компьютер — характер утверждаем здесь |
| 2 | Раскадровка сцены «один день»: 5 кадров по p с текстом и часами (можно схемой) | раскадровка, до генераций |
| 3 | Генерация мастера хиро (§7.A шаг 1) → 2–4 прогона → выбор | 4 картинки на выбор |
| 4 | Эдиты утро/золотой час/ночь (§7.A шаги 2–4) → путь A в движке | живая сцена на стиллах |
| 5 | Секции 4.3–4.4 (манифест, тарифы) с кадрами §7.B | страница до тарифов |
| 6 | Секции 4.5–4.6 (конструктор, экономика на скролле) | сначала раскадровка линии, потом код |
| 7 | Секции 4.7–4.11 (прайс, 10 способов, шторка, сезоны, бонусы) с кадрами §7.C–F | по одной секции за круг |
| 8 | Форма и подвал, выбор бэкенда заявки | рабочая отправка |
| 9 | Kling-клипы (§7.A шаги 5–6) → `tools/frames.mjs` → путь B | сцена с настоящим движением, сравнить с A |
| 10 | `break-ui`, `хтс-адаптация` (20 устройств), замеры на живом телефоне, вес | таблица чисел |
| 11 | Пуш медиа в Pages, блоки `dist/t123-NN.html` отдать Роме для вставки (нумерация блоков неприкосновенна), публикация в Тильде руками владельца, проверка с адреса заказчика с `?cb=` | ссылка |

Этап 9 стоит после всего остального специально: сайт на пути A уже целый и показуемый, видео — апгрейд, который не блокирует сдачу.

---

## 7. Промпты для Magnific (стартовые, по правилу одного изменения)

Общие правила: промпт на английском, без «beautiful/8K»; людей, рук, животных, текста и логотипов в кадре нет; у Seedream исключения внутри промпта; у Kling негатив отдельным полем и `static camera`. Рефы — `@img1…`, роль каждого проговаривается. Тир и AR ставить в пикере, не словами. Черновики — дешёвой моделью, финал — Seedream 5 PRO с тем же промптом.

**Единый свет серии:** все стиллы для секций (B, C, E) делаются с принятым мастером хиро в слоте Style как `@img1` — «ONLY for light, colour grade, lens and level of grooming — take nothing of its layout». Так весь сайт выглядит снятым в один день.

### 7.A Хиро — «Один день сада»

**Шаг 1. Мастер (рассвет).**
```
Private estate garden near Moscow at early dawn, seen from the terrace of a modern house at eye level, wide view. A long manicured lawn with even mowing stripes runs from the foreground to a line of tall clipped hornbeam hedges and mature birches and pines at the back. A gravel path with a steel edge curves from the lower left into the depth; on the right a bed of white hydrangeas, ornamental grasses and clipped boxwood spheres on dark mulch; a few low black path lights along the gravel, switched off; the corner of the house with a large window at the left edge. Cool pale morning light, thin ground mist over the lawn, dew on the grass, soft overcast sky with a faint warm glow at the horizon. Everything freshly groomed: crisp hedge edges, clean gravel, no fallen leaves. Photoreal landscape photography, 35mm lens look, natural sensor noise, accurate white balance, subtle HDR, and nothing else in frame: no people, no animals, no cars, no furniture, no text, no watermark.
```
**Настройки:** Seedream 5 PRO · 16:9 · 2K (2848×1600) · thinking ON · без рефов · 4 генерации, выбираем по композиции (дорожка ведёт в глубину, у правого края есть что крупно показать на телефоне)
Риск: модель любит ставить скамейку/кашпо — в хвосте уже запрещено; если приезжает, добавить `no bench, no planters`.

**Шаг 2. Утро (эдит мастера).**
```
Same garden as @img1, identical camera, identical composition, identical lawn, hedges, trees, gravel path, flower bed, path lights and house. Only change: it is now a clear mid-morning — the mist is gone, bright sunlight comes from the upper right, short crisp shadows of the hedges and trees fall across the lawn, greens are saturated, the sky is blue with a few small clouds. STRUCTURE LOCK: the shape and position of every plant, the path, the lamps and the house stay pixel-identical to @img1; nothing is added, removed or moved; no people, no text, no watermark.
```
**Настройки:** Seedream 5 PRO · edit · AR как у @img1 · 2K · @img1 = принятый мастер · 2 генерации

**Шаг 3. Золотой час (эдит мастера).**
```
Same garden as @img1, identical camera, identical composition, identical lawn, hedges, trees, gravel path, flower bed, path lights and house. Only change: late afternoon golden hour — a low warm sun from the left behind the birches, long soft shadows stretch across the lawn toward the camera, warm rim light on the grasses and hedge tops, the sky pale gold to soft blue; the path lights are still OFF. STRUCTURE LOCK: the shape and position of every plant, the path, the lamps and the house stay pixel-identical to @img1; nothing is added, removed or moved; no people, no text, no watermark.
```
**Настройки:** те же, что шаг 2

**Шаг 4. Синий час с подсветкой (эдит мастера).**
```
Same garden as @img1, identical camera, identical composition, identical lawn, hedges, trees, gravel path, flower bed, path lights and house. Only change: deep blue dusk — the sky is dark blue, and the garden lighting is ON: the low path lights cast warm pools of light on the gravel, hidden uplights at the base of the birches and pines light the trunks and canopies from below in warm white, the hedges catch a soft warm glow, the large house window glows warm at the left edge; the lawn is dim blue-green. The light is warm 2700K, soft, no glare, no lens flare. STRUCTURE LOCK: the shape and position of every plant, the path, the lamps and the house stay pixel-identical to @img1; nothing is added, removed or moved; no extra lamps; no people, no text, no watermark.
```
**Настройки:** те же, что шаг 2
Риск: модель может дорисовать лишние фонари — `no extra lamps` уже стоит; если всё равно, region edit по дорожке.

**Шаг 5. Kling: рассвет → золотой час (путь B).**
```
Locked-off static camera on a tripod, the exact same garden view for the whole clip. Over the ENTIRE clip, from the first frame to the last, the light slowly and evenly changes from misty early dawn to warm late-afternoon sun: the ground mist thins and disappears, the sun rises and the shadows of the hedges and trees slowly swing and shorten, the sky clears to blue and then warms to gold, colours become warmer. The change never speeds up and never stops midway. The lawn, hedges, trees, gravel path, lamps and house keep exactly the same shapes and positions throughout; only the leaves and grasses stir very slightly in a light breeze.
```
**Негатив:** `camera movement, camera shake, zoom, pan, people, animals, birds, cars, text, letters, watermark, deformation, morphing plants, plants growing or changing shape, new objects, flicker, strobing, sudden cuts, motion stopping midway, lights turning on`
**Настройки:** Kling 3.0 (НЕ Omni — у него нет энд-кадра) · start = шаг 1 · end = шаг 3 · 10 s · 1080p · звук выкл · 2 прогона

**Шаг 6. Kling: золотой час → ночь с подсветкой.**
```
Locked-off static camera on a tripod, the exact same garden view for the whole clip. Over the ENTIRE clip, from the first frame to the last, the light slowly and evenly changes from warm golden hour to deep blue dusk: the sun sinks behind the trees, the shadows fade, the sky turns from gold to dark blue, and in the second half the garden lighting gradually comes on — the path lights warm up first, then the uplights under the birches and pines, then the house window. The change never speeds up and never stops midway. The lawn, hedges, trees, gravel path, lamps and house keep exactly the same shapes and positions throughout; only the leaves and grasses stir very slightly in a light breeze.
```
**Негатив:** тот же, что шаг 5, без `lights turning on`, плюс `lights flickering, lights turning off again`
**Настройки:** Kling 3.0 · **start = ПОСЛЕДНИЙ кадр принятого клипа шага 5** (не PNG шага 3 — так стык идеален) · end = шаг 4 · 10 s · 1080p · 2 прогона

Если серия 9:16 для телефона всё же нужна (кроп не читается): сначала эдит мастера `Extend the scene to a 9:16 vertical frame: keep @img1 pixel-identical in the centre and continue the lawn below and the sky above` → повторить шаги 2–6 на вертикали. Это второй набор кредитов, решать после кропа.

### 7.B Тарифы — три сада в одном свете
База для всех трёх: `@img1` = принятый золотой час (шаг 3) в Style, `take ONLY the light, colour grade, lens and level of grooming from @img1 — do not copy its layout`.

**BASIC**
```
Small private garden of a suburban house near Moscow, seen from the terrace at eye level: a compact neat lawn, one clipped hedge along a wooden fence, a short gravel path, two young fruit trees, a simple flower bed with lavender and boxwood. Late afternoon warm sun, long soft shadows. @img1 is the truth for light, colour grade, lens and level of grooming only — take nothing of its layout. Photoreal landscape photography, natural sensor noise, accurate white balance, and nothing else in frame: no people, no animals, no furniture, no text, no watermark.
```
**PREMIUM**
```
Full private garden of a large house near Moscow, seen from the terrace at eye level: a wide striped lawn, tall clipped hornbeam hedges, a curving gravel path with steel edging, a mixed border of hydrangeas, ornamental grasses and boxwood spheres, mature birches, discreet path lights and a visible drip-irrigation line in the bed. Late afternoon warm sun, long soft shadows. @img1 is the truth for light, colour grade, lens and level of grooming only — take nothing of its layout. Photoreal landscape photography, natural sensor noise, accurate white balance, and nothing else in frame: no people, no animals, no furniture, no text, no watermark.
```
**ESTATE**
```
Large estate grounds near Moscow seen from a raised terrace at eye level: a long axis of lawn leading to a line of mature pines and birches, several rooms of clipped hedges, a wide gravel allée, a formal parterre with boxwood, a small still reflecting pool, specimen trees with uplights at their base, the edge of a greenhouse at the far right. Late afternoon warm sun, long soft shadows. @img1 is the truth for light, colour grade, lens and level of grooming only — take nothing of its layout. Photoreal landscape photography, natural sensor noise, accurate white balance, and nothing else in frame: no people, no animals, no furniture, no text, no watermark.
```
**Настройки (все три):** Seedream 5 PRO · 4:5 · 2K · @img1 в Style · по 2 генерации

### 7.C Прайс — три картинки категорий (Газон / Растения / Деревья)
```
Close view of a freshly mown striped lawn near Moscow, the mowing lines running into the depth toward a clipped hedge, dew on the blades in the foreground, a steel lawn edge along a gravel path. Late afternoon warm sun. @img1 is the truth for light, colour grade and lens only. Photoreal, natural sensor noise, no people, no tools, no text, no watermark.
```
```
Close view of a freshly trimmed hornbeam hedge with a razor-straight top and a bed of white hydrangeas, ornamental grasses and boxwood spheres on dark bark mulch in front of it, near Moscow. Late afternoon warm sun, soft shadows. @img1 is the truth for light, colour grade and lens only. Photoreal, natural sensor noise, no people, no tools, no text, no watermark.
```
```
Mature birch and pine trees on a private estate near Moscow with clean, properly pruned crowns and clear trunks, a striped lawn beneath them, dappled late afternoon sun through the canopy. @img1 is the truth for light, colour grade and lens only. Photoreal, natural sensor noise, no people, no tools, no text, no watermark.
```
**Настройки:** Seedream 5 PRO · 4:5 · 1.5K · @img1 = золотой час в Style · по 1–2 генерации

### 7.D До / после — пара одного ракурса
«После» = принятое утро (шаг 2) или отдельный кадр. «До» — эдит с замком структуры:
```
Same garden as @img1, identical camera, identical composition, identical trees, hedges, path and house. Only change: the garden has been neglected for one season — the lawn is overgrown, uneven and patchy with dandelions and bare spots, the hedges are shaggy and uncut with loose shoots, the gravel path has weeds and fallen leaves, the flower bed is overgrown with dry stems, the boxwood spheres have lost their shape, the mulch is covered with leaves. Same daylight as @img1. STRUCTURE LOCK: every tree, hedge, lamp, the path line and the house stay in exactly the same place and size; nothing is added or removed; no people, no tools, no text, no watermark.
```
**Настройки:** Seedream 5 PRO · edit · AR как у @img1 · 2K · @img1 = утро · 2 генерации
Риск: модель может «вырастить» деревья — в замке это запрещено; если плывёт, region edit только по газону и изгородям.

### 7.E «10 способов» — десять кадров 4:5 в одном свете
Для всех: `@img1` = золотой час в Style, хвост у каждого одинаковый:
`Late afternoon warm sun, long soft shadows. @img1 is the truth for light, colour grade, lens and level of grooming only — take nothing of its layout. Photoreal landscape photography, natural sensor noise, accurate white balance, and nothing else in frame: no people, no animals, no tools, no text, no watermark.`

1. Газон: `A renewed striped lawn in front of a modern house near Moscow, dense and even, freshly overseeded and rolled, a steel edge along a gravel path, a clipped hedge behind.` + хвост
2. Дорожки: `A winding path of fine light gravel with a steel edge curving through a lawn between clipped boxwood and ornamental grasses, low black path lights along it, trees at the back.` + хвост
3. Клумбы: `A decorative perennial border on dark bark mulch: white hydrangeas, lavender, sage, ornamental grasses and boxwood spheres, edged with white marble chippings, lawn in front.` + хвост
4. Подсветка (исключение по свету — ночь): `Private garden at blue hour with garden lighting on: warm path lights along a gravel path, uplights at the base of birches lighting the canopies, a clipped hedge softly lit, a warm glowing house window. @img1 is the truth for the plants and level of grooming only. Photoreal, natural sensor noise, no lens flare, and nothing else in frame: no people, no animals, no text, no watermark.`
5. Живая изгородь: `A tall dense evergreen hedge of columnar thuja along a dark wooden fence, perfectly trimmed, a striped lawn in front, a gravel path along it.` + хвост
6. Каменные композиции: `A rock garden with large grey granite boulders, grey decorative gravel, dwarf pines, junipers and ornamental grasses on a gentle slope beside a lawn.` + хвост
7. Автополив: `Pop-up sprinklers watering a striped lawn with fine arcs of water catching the low sun, a clipped hedge and birches behind.` + хвост (движение воды можно потом оживить лупом Kling, см. 7.G)
8. Зона отдыха: `A wooden deck with a cedar pergola, a built-in bench with linen cushions, a round fire bowl, large terracotta planters with grasses, string lights switched off, a lawn and hedges around.` + хвост
9. Сезонное обслуживание: `A garden in early autumn being kept tidy: a clean striped lawn, a freshly trimmed hedge, a bed with cut-back perennials and fresh mulch, a few golden birch leaves on the gravel path.` + хвост
10. Премиальное обновление: `A completely transformed private garden near Moscow: a curving gravel path with path lights, perennial borders, boulders, clipped hedges, specimen trees and a deck, all in one composition seen from the house terrace.` + хвост

**Настройки:** Seedream 5 PRO · 4:5 · 1.5K · @img1 в Style · по 1–2 генерации; черновик пачки — Seedream 5.0 Lite, финал — Pro с тем же текстом
Риск: №8 — мебель; подушки и шезлонги модель любит плодить, держать «a built-in bench» и не добавлять слов про комфорт.

### 7.F Сезоны — четыре эдита одного кадра
База `@img1` = утро (шаг 2). Один эдит на сезон, замок структуры:
- Весна: `Only change: early May — fresh light-green young leaves on the birches, the lawn freshly green, white tulips and daffodils in the bed, cool clear spring light.`
- Лето: само утро (шаг 2), без генерации.
- Осень: `Only change: early October — the birches are golden, a scattering of golden leaves on the lawn and gravel, the hydrangeas faded to pink-beige, soft low autumn light.`
- Зима: `Only change: January — fresh snow on the lawn, hedge tops and bed, bare birch branches, dark green pines, the gravel path cleared, pale overcast winter light, the path lights softly ON.`
Каждый: `Same garden as @img1, identical camera and composition. ` + строка сезона + ` STRUCTURE LOCK: every plant, the path, the lamps and the house stay in exactly the same place and size; nothing is added or removed; no people, no text, no watermark.`
**Настройки:** Seedream 5 PRO · edit · AR как у @img1 · 2K · по 2 генерации

### 7.G Амбиент-лупы (необязательно, после всего)
Коротких лупов для фона тарифов/зоны отдыха — по проверенной схеме «меняется только свет», start = end одна картинка:
```
Locked-off static camera. The ONLY thing that changes is the light: the soft shadow of a passing cloud slowly glides across the lawn from left to right and the sunlight returns, ending on exactly the starting look. Plants, path, lamps and house stay exactly the same; the grasses stir very slightly.
```
**Негатив:** `camera movement, zoom, pan, people, animals, text, watermark, deformation, morphing plants, new objects, flicker, background change`
**Настройки:** Kling 3.0 · start = end = кадр · 5 s · 1080p · 2–3 прогона — все прогоны взаимозаменяемы и склеиваются в длинную петлю
Отдавать как `<video muted playsinline loop>` 720p, ≤ 1.5 МБ, только когда на экране. Ветер по листве отдельно не просить (ломается на «дыхание зумом»).

### Что НЕ генерируем
Логотип и буквы (композит/SVG), людей и руки, интерфейс, вертикальный хиро до проверки кропа, «4K через модель» (только апскейлер при нужде).

---

## 8. Структура папки и технический стандарт

```
verdantestate/
  PLAN.md                     этот план
  docs/                       бриф, docx-дамп, решения владельца (вести decisions.md)
  brand/                      лого, инфографика, вектор лого когда появится
  media-src/                  сырые выгрузки Magnific (png/mp4), имена латиницей, не в git если > 50 МБ суммарно → отдельный репо/LFS
  src/                        исходники секций — то, что станет блоками T123
    head.html                 общий код в HEAD сайта Тильды: токены, шрифт (@font-face с Pages), базовые стили, реестр `VE` (лимит 64 КБ)
    01-header.html            каждая секция = свой файл: разметка + `<style>` + `<script>` этой секции (лимит блока 84 КБ)
    02-hero.html              разметка сцены и текст глав; сам движок подгружается модулем с Pages
    03-manifest.html
    04-tariffs.html
    05-builder.html
    06-economics.html
    07-pricelist.html
    08-ways.html
    09-before-after.html
    10-seasons.html
    11-bonuses.html
    12-form.html
    13-footer.html
  dist/                       собранные блоки `t123-01.html … t123-13.html` + `head.html` — это вставляется в Тильду; `preview.html` — все блоки в обёртках Тильды для стенда
  docs/site/                  ← раздаёт GitHub Pages (Pages умеет только корень или /docs); бриф и решения лежат рядом в docs/
    js/scene.js               движок сцены хиро (canvas, манифест, загрузка кадров) — ES-модуль, грузится из блока 02
    media/                    кадры сцены (scene/), стиллы (tariffs/, ways/, seasons/, ba/), амбиент-лупы — адреса с `?v=<hash>`
    fonts/                    один woff2
  tools/
    build.mjs                 src → dist: инлайнит стили, проверяет `node --check` скриптов и баланс CSS-скобок, считает размер каждого блока против 84 КБ, собирает preview.html
    frames.mjs                mp4 → кадры → кропы → avif/webp → manifest.json
    images.mjs                стиллы → 3 размера (720/1440/2560) avif+webp, метаданные вычищены
    shots.mjs                 снимки через puppeteer с viewport, document.fonts.ready, пауза 2.8 с
```

- Ванильный HTML/CSS/JS на ES-модулях, без сборщика. Одна страница. Версия сборки в адресе каждого css/js/медиа с первого дня.
- **Схема хостинга (решено 09.10.2026): страница на Тильде собрана из наших блоков T123, по блоку на секцию, с настоящей разметкой, стилями и лёгким JS внутри. На GitHub Pages (`docs/site/`) живёт только тяжёлое: кадры сцены, стиллы, лупы, шрифт и движок сцены как ES-модуль.** Так тексты и цены правятся прямо в Тильде без пересборки, а медиа не упирается в лимиты и кеш Тильды. Схема «один загрузчик в T123» (`хтс-тильда` §8) остаётся запасной, если блоки начнут упираться в лимиты.
- Лимиты Тильды: HEAD 64 КБ, блок 84 КБ. `tools/build.mjs` считает размер каждого собранного блока и падает при переполнении; большой скрипт режется на поздний блок, нумерация блоков после первой вставки не меняется (новое — только поздним куском).
- Общее для всех блоков (токены, `@font-face`, базовые правила, реестр `window.VE`) — в HEAD сайта; секция не зависит от соседей и работает, если её вставили одну. Стили скоупятся префиксом `.ve-` и не трогают `.t-*`.
- Pages отдаёт CORS `*` и верные типы для `.js/.json/.webp/.avif/.mp4`: модуль сцены и `fetch` манифеста кадров со страницы Тильды работают без настроек (проверено на mila harys). Кеш Pages 600 с, поэтому медиа с `?v=<hash>`; у Тильды свой кеш — живую страницу проверять с `?cb=<число>`.
- Что ломает Тильда и что учесть в коде: на тегах в документе только `addEventListener('load'|'error')` — `tilda-fallback` затирает `onerror`; в комментариях блоков не писать литеральный `<script>`; никаких секретов в блоках и HEAD (всё публично); `position:fixed`/`sticky` проверять внутри обёрток `.t-body > .t-records > .t-rec > .t123` на стенде `dist/preview.html` — если `.t-rec` режет sticky сцены, блок 02 переносит сцену в собственный контейнер в `body` при старте; Тильда не оптимизирует картинки из T123 — размеры и форматы готовим сами.
- Публикует в Тильде только владелец: «Сохранить и закрыть» → «Опубликовать» (публикация выкатывает весь неопубликованный код страницы). Модель отдаёт `dist/t123-NN.html` и говорит, какие блоки изменились.
- Если медиа перевалит за ~100 МБ, выносить в отдельный репо `verdant-media` по той же схеме.
- Высоты `svh/dvh` с запасным `vh`; `env(safe-area-inset-*)`; зум не блокируем; `touch-action: pan-y` на горизонтальных скроллерах не ставить (им нужен pan-x) — только на шторке.
- Раскладка следит за размером сама (ResizeObserver + проверка в цикле кадров): встроенные браузеры Telegram/Instagram растягивают окно без события.
- На таче без blur и backdrop-filter на движущихся слоях.
- Библиотек нет вовсе. Если что-то понадобится с CDN — через очередь зеркал (Cloudflare в РФ режет).

---

## 9. Открытые вопросы (решает владелец/заказчик, не модель)

1. ~~Хостинг и стек~~ — **решено 09.10.2026: Тильда (у заказчика уже подписка), секции — блоки T123 с настоящей разметкой, тяжёлое — GitHub Pages.** Осталось уточнить: имя репозитория и аккаунт (по умолчанию `github.com/lilkutabare-hue/verdant-estate`, Pages из `docs/`), адрес страницы в Тильде, кто вставляет блоки (Рома).
2. **Куда уходит заявка:** A) форма Тильды своим блоком на той же странице (приёмка заявок в CRM Тильды и на почту из коробки, стилизуем под сайт, наша кнопка скроллит к ней и подставляет значения в поля); B) своя форма → Cloudflare Worker → Telegram (как у Авито-бота). Рекомендую A: заказчик уже платит за Тильду и увидит заявки там. До решения — своя форма с `mailto:`-заглушкой.
3. **Контакты и юрлицо** для подвала и политики. Без них — плейсхолдеры, помеченные в `docs/decisions.md`.
4. **Вектор логотипа** — есть у заказчика или трассируем.
5. **Серифный шрифт** — утвердить на этапе 1 по скриншоту (Cormorant Garamond vs EB Garamond); если владелец скажет «только системные» — заголовки системным серифом (`Georgia`/`Times`), это тоже допустимо.
6. **Серия 9:16** для телефона — только если кроп мастера не читается (этап 4).
7. **Реальные фото объектов** — если появятся, они заменяют сгенерированные в «10 способов» и «до/после»; сцена хиро остаётся генерацией.

---

## 10. Приёмка перед сдачей

- Матрица `хтс-адаптация`: 20 устройств × портрет/ландшафт, встроенные браузеры Telegram и Instagram.
- `break-ui`: длинные имена в форме, 0 выбранных чипсов, 60 соток, узкий экран 320, крупный шрифт системы.
- Вес первой загрузки на телефоне ≤ 1.2 МБ до интерактива (постер + css + js + шрифт), серия сцены догружается после.
- Рывки: нет кадров > 32 мс при скролле хиро на iPhone среднего класса; замер на живом телефоне.
- Консоль чистая, все адреса с версией, кеш проверен с адреса заказчика.
- Скриншоты телефон/компьютер каждой секции в `docs/shots/` при сдаче.

---

## 11. Журнал решений

Вести в `docs/decisions.md`: дата · что показали · что сказал владелец · что сделали. Принятые приёмы — в кейс `хтс-веб-дизайн/references/кейсы/verdant-estate.md` после сдачи, новые правила — в `почерк.md`, удачные промпты — в скилл Magnific (§«мясо-мувы»).
