#!/usr/bin/env node
// Временные кадры сада до генераций Magnific: один параметрический SVG-сад в разных светах,
// сезонах и составах. Выход: docs/site/media/scene/* (кадры сцены + манифест) и docs/site/media/stills/*.
// Файлы — webp, имена только [a-z0-9-], метаданных нет. Когда появятся настоящие кадры,
// их кладут под теми же именами и запускают tools/build.mjs.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCENE = join(ROOT, 'docs/site/media/scene');
const STILLS = join(ROOT, 'docs/site/media/stills');
await mkdir(SCENE, { recursive: true });
await mkdir(STILLS, { recursive: true });

// ---------- вспомогательное ----------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;
function hex(c) { return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { return hex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]); }
const rgb = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const f1 = (n) => Math.round(n * 10) / 10;

// ---------- свет ----------
// Каждый пресет — краски сцены. Структура сада от света не зависит (то, что потом должен дать Kling).
const LIGHT = {
  dawn:    { skyTop: '#B9C3C9', skyHor: '#E8DCCB', glow: '#EFD9B8', lawnA: '#8FA06E', lawnB: '#86976A', hedge: '#5F7047', hedgeTop: '#71825A', trees: '#6E7E66', treesFar: '#8E9A8C', gravel: '#D9D2C2', mulch: '#5C4E3F', house: '#B8B3A8', window: '#A9B2B6', shadowA: 0, shadowDir: 0, mist: 0.55, lamps: 0, up: 0, tint: '#DDE1E3', tintA: 0.18, bloomA: 0.5 },
  morning: { skyTop: '#8FB4D6', skyHor: '#D7E4EC', glow: '#FFFFFF', lawnA: '#6E9A48', lawnB: '#629044', hedge: '#4A6B3A', hedgeTop: '#5E8148', trees: '#4F6E45', treesFar: '#7E9A80', gravel: '#E2DCCB', mulch: '#4E3F31', house: '#C9C4B7', window: '#8FA3B3', shadowA: 0.22, shadowDir: -1, mist: 0, lamps: 0, up: 0, tint: '#FFFFFF', tintA: 0, bloomA: 0.95 },
  golden:  { skyTop: '#B9C9D6', skyHor: '#F0D6A6', glow: '#F6DDAE', lawnA: '#8E9C4C', lawnB: '#7F9046', hedge: '#596E3A', hedgeTop: '#8A9B4F', trees: '#5B6B3B', treesFar: '#9A9A74', gravel: '#E7D4B2', mulch: '#5A4733', house: '#D6C6A8', window: '#B7A98C', shadowA: 0.3, shadowDir: 1, mist: 0, lamps: 0, up: 0, tint: '#E2B46C', tintA: 0.12, bloomA: 0.9 },
  night:   { skyTop: '#121C2E', skyHor: '#2A3A52', glow: '#34445C', lawnA: '#2E3F36', lawnB: '#293A32', hedge: '#22301F', hedgeTop: '#2E4028', trees: '#1C2822', treesFar: '#28343A', gravel: '#4C4A44', mulch: '#201A15', house: '#3A3D3F', window: '#E2B46C', shadowA: 0, shadowDir: 0, mist: 0, lamps: 1, up: 1, tint: '#0E1626', tintA: 0.22, bloomA: 0.35 },
};
// Сезонные поправки поверх утра
const SEASON = {
  spring: { lawnA: '#79A854', lawnB: '#6E9E4E', hedgeTop: '#7CA35A', trees: '#7FA65A', treesFar: '#9EBB86', flowers: 'tulips' },
  summer: {},
  autumn: { lawnA: '#7E9448', lawnB: '#748A44', trees: '#C9953A', treesFar: '#B9A26A', skyTop: '#A9BCCB', skyHor: '#E6DCC9', leaves: 1, bloomA: 0.4, bloomC: '#D8B9A6', tintA: 0.08, tint: '#E2B46C' },
  winter:  { lawnA: '#E9ECEA', lawnB: '#E3E7E5', hedge: '#4A5A42', hedgeTop: '#EDEFEA', trees: '#6A6E68', treesFar: '#9BA19B', skyTop: '#B8C0C6', skyHor: '#E3E6E6', gravel: '#CFCAC0', mulch: '#E7E9E4', snow: 1, bloomA: 0, lamps: 1, shadowA: 0 },
};

// ---------- сад ----------
// Мир 1600×1000, горизонт ~430. Кадрирование — viewBox.
function garden(o = {}) {
  const L = { ...LIGHT[o.light || 'morning'], ...(o.season ? SEASON[o.season] : {}), ...(o.override || {}) };
  const R = rng(o.seed ?? 7);
  const parts = [];
  const defs = [];
  const W = 1600, H = 1000, HOR = o.horizon ?? 430;
  const id = (n) => `${n}${o.seed ?? 7}`;

  defs.push(`<linearGradient id="${id('sky')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.skyTop}"/><stop offset=".78" stop-color="${L.skyHor}"/><stop offset="1" stop-color="${L.glow}"/></linearGradient>`);
  parts.push(`<rect width="${W}" height="${HOR + 2}" fill="url(#${id('sky')})"/>`);

  // дальний лес (за изгородью): берёзы и сосны силуэтами
  const far = [];
  const nTrees = o.trees ?? 22;
  for (let i = 0; i < nTrees; i++) {
    const x = (i / nTrees) * W + R() * 60 - 30;
    const h = 120 + R() * 160 * (o.treeScale ?? 1);
    const pine = R() < (o.pineShare ?? 0.45);
    const col = R() < 0.5 ? L.trees : mix(rgb(L.trees), rgb(L.treesFar), 0.5);
    if (pine) {
      const w = 40 + R() * 40;
      far.push(`<path d="M${f1(x)} ${HOR + 8} L${f1(x - w / 2)} ${HOR + 8} L${f1(x)} ${f1(HOR - h)} L${f1(x + w / 2)} ${HOR + 8} Z" fill="${col}"/>`);
      far.push(`<path d="M${f1(x)} ${f1(HOR - h * 0.35)} L${f1(x - w * 0.38)} ${HOR + 8} L${f1(x + w * 0.38)} ${HOR + 8} Z" fill="${mix(rgb(col), [0, 0, 0], 0.12)}"/>`);
    } else {
      const w = 60 + R() * 60;
      if (L.snow) {
        // голые ветви зимой
        for (let b = 0; b < 5; b++) far.push(`<path d="M${f1(x)} ${HOR + 8} Q${f1(x + (R() - 0.5) * 60)} ${f1(HOR - h * 0.5)} ${f1(x + (R() - 0.5) * w)} ${f1(HOR - h * (0.6 + R() * 0.4))}" stroke="${col}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
      } else {
        far.push(`<ellipse cx="${f1(x)}" cy="${f1(HOR - h * 0.62)}" rx="${f1(w / 2)}" ry="${f1(h * 0.42)}" fill="${col}"/>`);
        far.push(`<ellipse cx="${f1(x + w * 0.18)}" cy="${f1(HOR - h * 0.45)}" rx="${f1(w * 0.36)}" ry="${f1(h * 0.3)}" fill="${mix(rgb(col), rgb(L.skyHor), 0.1)}"/>`);
      }
      far.push(`<rect x="${f1(x - 3)}" y="${f1(HOR - h * 0.5)}" width="6" height="${f1(h * 0.5 + 8)}" fill="${L.snow ? '#DADCD6' : mix(rgb(col), [250, 248, 240], 0.55)}"/>`);
    }
  }
  parts.push(far.join(''));

  // подсветка стволов ночью
  if (L.up) {
    defs.push(`<radialGradient id="${id('up')}" cx=".5" cy="1" r=".9"><stop offset="0" stop-color="#E2B46C" stop-opacity=".55"/><stop offset="1" stop-color="#E2B46C" stop-opacity="0"/></radialGradient>`);
    for (let i = 0; i < 5; i++) {
      const x = 260 + i * 300 + R() * 80;
      parts.push(`<ellipse cx="${x}" cy="${HOR + 6}" rx="70" ry="190" fill="url(#${id('up')})"/>`);
    }
  }

  // изгородь (стриженый граб) или забор с туями для маленького сада
  const hedgeTop = o.hedgeTop ?? (HOR - 40);
  if (o.fence) {
    parts.push(`<rect x="0" y="${hedgeTop}" width="${W}" height="${HOR + 60 - hedgeTop}" fill="${mix(rgb(L.mulch), [120, 100, 80], 0.35)}"/>`);
    for (let x = 0; x < W; x += 28) parts.push(`<rect x="${x}" y="${hedgeTop}" width="2" height="${HOR + 60 - hedgeTop}" fill="${mix(rgb(L.mulch), [0, 0, 0], 0.25)}"/>`);
    if (o.thuja) for (let x = 20; x < W; x += 70) parts.push(`<path d="M${x} ${HOR + 60} L${x - 26} ${HOR + 60} L${x} ${hedgeTop - 90 - (x % 5) * 6} L${x + 26} ${HOR + 60} Z" fill="${L.hedge}"/><path d="M${x} ${HOR + 60} L${x - 14} ${HOR + 60} L${x} ${hedgeTop - 80 - (x % 5) * 6} Z" fill="${L.hedgeTop}" opacity=".6"/>`);
  } else {
    const shaggy = o.overgrown ? 1 : 0;
    let d = `M0 ${HOR + 60} L0 ${hedgeTop}`;
    for (let x = 0; x <= W; x += 40) d += ` L${x} ${f1(hedgeTop + (shaggy ? (R() - 0.5) * 26 : 0))}`;
    d += ` L${W} ${HOR + 60} Z`;
    parts.push(`<path d="${d}" fill="${L.hedge}"/>`);
    parts.push(`<rect x="0" y="${hedgeTop}" width="${W}" height="${L.snow ? 14 : 10}" fill="${L.hedgeTop}"/>`);
    if (shaggy) for (let i = 0; i < 60; i++) parts.push(`<path d="M${f1(R() * W)} ${hedgeTop + 4} q${f1((R() - 0.5) * 30)} -${f1(20 + R() * 30)} ${f1((R() - 0.5) * 20)} -${f1(30 + R() * 40)}" stroke="${L.hedgeTop}" stroke-width="2" fill="none"/>`);
  }

  // газон с полосами покоса (перспектива к точке схода)
  const VX = o.vanish ?? 880, VY = HOR - 60;
  const stripes = o.stripes ?? 14;
  parts.push(`<rect x="0" y="${HOR + 56}" width="${W}" height="${H - HOR - 56}" fill="${L.lawnA}"/>`);
  const baseY = HOR + 58;
  for (let i = 0; i < stripes; i++) {
    const x0 = -600 + (i / stripes) * 2800, x1 = -600 + ((i + 1) / stripes) * 2800;
    if (i % 2) continue;
    parts.push(`<path d="M${x0} ${H} L${x1} ${H} L${f1(VX + (x1 - VX) * 0.06)} ${baseY} L${f1(VX + (x0 - VX) * 0.06)} ${baseY} Z" fill="${L.lawnB}"${o.overgrown ? ' opacity=".35"' : ''}/>`);
  }
  if (o.overgrown) {
    for (let i = 0; i < 90; i++) parts.push(`<circle cx="${f1(R() * W)}" cy="${f1(baseY + 40 + R() * (H - baseY - 40))}" r="${f1(2 + R() * 4)}" fill="#E8D77A" opacity=".8"/>`);
    for (let i = 0; i < 18; i++) parts.push(`<ellipse cx="${f1(R() * W)}" cy="${f1(baseY + 60 + R() * (H - baseY - 60))}" rx="${f1(30 + R() * 80)}" ry="${f1(8 + R() * 18)}" fill="#A99B62" opacity=".45"/>`);
  }
  if (L.leaves) for (let i = 0; i < 70; i++) parts.push(`<ellipse cx="${f1(R() * W)}" cy="${f1(baseY + 20 + R() * (H - baseY - 20))}" rx="${f1(4 + R() * 5)}" ry="${f1(2 + R() * 3)}" fill="#D9A84A" opacity=".85" transform="rotate(${f1(R() * 180)} ${f1(R() * W)} ${f1(R() * H)})"/>`);

  // тени от изгороди и деревьев (утро — вправо-вниз, золотой час — влево-вниз, длинные)
  if (L.shadowA) {
    const dir = L.shadowDir, len = dir > 0 ? 420 : 160;
    parts.push(`<path d="M0 ${baseY} L${W} ${baseY} L${f1(W + dir * len)} ${baseY + len * 0.55} L${f1(dir * len)} ${baseY + len * 0.55} Z" fill="#1E2A16" opacity="${L.shadowA}"/>`);
    for (let i = 0; i < 6; i++) {
      const x = 120 + i * 280 + R() * 60;
      parts.push(`<ellipse cx="${f1(x + dir * len * 0.9)}" cy="${f1(baseY + len * 0.5 + 30)}" rx="${f1(70 + R() * 50)}" ry="${f1(22 + R() * 14)}" fill="#1E2A16" opacity="${f1(L.shadowA * 0.8)}"/>`);
    }
  }

  // бассейн/партер для усадьбы
  if (o.pool) {
    parts.push(`<path d="M560 ${baseY + 120} L1040 ${baseY + 120} L1120 ${baseY + 260} L480 ${baseY + 260} Z" fill="${mix(rgb(L.skyTop), rgb(L.skyHor), 0.5)}" stroke="${L.gravel}" stroke-width="6"/>`);
  }
  if (o.parterre) {
    for (let i = 0; i < 6; i++) parts.push(`<rect x="${560 + i * 90}" y="${baseY + 300}" width="60" height="44" rx="8" fill="${L.hedge}"/>`);
  }

  // дорожка: гравий со стальной кромкой, из левого нижнего угла в глубину
  if (o.path !== false) {
    const px = o.pathEnd ?? 900;
    const left = `M-40 ${H} C 260 ${H - 220}, 420 ${H - 260}, ${px - 30} ${baseY}`;
    const right = `L${px + 30} ${baseY} C 560 ${H - 200}, 420 ${H - 120}, 380 ${H}`;
    parts.push(`<path d="${left} ${right} Z" fill="${L.gravel}"/>`);
    parts.push(`<path d="${left}" stroke="${mix(rgb(L.gravel), [0, 0, 0], 0.45)}" stroke-width="3" fill="none"/>`);
    parts.push(`<path d="M380 ${H} C 420 ${H - 120}, 560 ${H - 200}, ${px + 30} ${baseY}" stroke="${mix(rgb(L.gravel), [0, 0, 0], 0.45)}" stroke-width="3" fill="none"/>`);
    if (o.overgrown) for (let i = 0; i < 40; i++) parts.push(`<ellipse cx="${f1(120 + R() * 560)}" cy="${f1(H - 40 - R() * 300)}" rx="${f1(5 + R() * 9)}" ry="${f1(3 + R() * 4)}" fill="${R() < 0.5 ? '#7E8C4A' : '#B88B4A'}" opacity=".8"/>`);
    // фонари вдоль дорожки
    const lamps = [[470, H - 130, 1], [690, H - 270, 0.78], [830, baseY + 110, 0.6]];
    if (L.lamps) defs.push(`<radialGradient id="${id('pool')}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E2B46C" stop-opacity=".75"/><stop offset="1" stop-color="#E2B46C" stop-opacity="0"/></radialGradient>`);
    for (const [lx, ly, s] of lamps) {
      if (L.lamps) parts.push(`<ellipse cx="${lx}" cy="${ly + 6}" rx="${f1(150 * s)}" ry="${f1(60 * s)}" fill="url(#${id('pool')})"/>`);
      parts.push(`<rect x="${lx - 3 * s}" y="${ly - 60 * s}" width="${6 * s}" height="${60 * s}" fill="#22251F"/><rect x="${lx - 9 * s}" y="${ly - 66 * s}" width="${18 * s}" height="${8 * s}" rx="2" fill="#22251F"/>`);
      if (L.lamps) parts.push(`<rect x="${lx - 7 * s}" y="${ly - 60 * s}" width="${14 * s}" height="${5 * s}" fill="#F3D08E"/>`);
    }
  }

  // автополив: дуги воды
  if (o.sprinklers) {
    for (let i = 0; i < 4; i++) {
      const x = 300 + i * 330, y = baseY + 220 + (i % 2) * 120;
      for (let k = 0; k < 7; k++) parts.push(`<path d="M${x} ${y} q${f1(60 + k * 22)} -${f1(70 + k * 10)} ${f1(150 + k * 30)} -8" stroke="#F4F7F4" stroke-width="${f1(1.2 + k * 0.2)}" fill="none" opacity="${f1(0.35 + k * 0.06)}"/>`);
    }
  }

  // клумба справа: мульча, гортензии, самшитовые шары, злаки
  if (o.bed !== false) {
    const bx = o.bedX ?? 1040, by = baseY + 70;
    parts.push(`<path d="M${bx} ${by + 50} C ${bx + 120} ${by - 10}, ${W + 60} ${by - 20}, ${W + 60} ${by + 60} L${W + 60} ${by + 260} C ${W - 200} ${by + 300}, ${bx + 60} ${by + 240}, ${bx - 40} ${by + 180} Z" fill="${L.mulch}"/>`);
    if (!L.snow) {
      const bloom = L.bloomC || '#F4F1E6';
      for (let i = 0; i < 9; i++) {
        const cx = bx + 60 + R() * 440, cy = by + 50 + R() * 120, r = 18 + R() * 22;
        parts.push(`<circle cx="${f1(cx)}" cy="${f1(cy + 26)}" r="${f1(r * 0.9)}" fill="${L.hedge}"/>`);
        for (let k = 0; k < 6; k++) parts.push(`<circle cx="${f1(cx + (R() - 0.5) * r)}" cy="${f1(cy + (R() - 0.5) * r * 0.8)}" r="${f1(r * 0.42)}" fill="${bloom}" opacity="${f1(L.bloomA)}"/>`);
      }
      for (let i = 0; i < 5; i++) {
        const cx = bx + 20 + i * 110 + R() * 30, cy = by + 190 + R() * 40, r = 26 + R() * 14;
        parts.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${L.hedge}"/><circle cx="${f1(cx - r * 0.3)}" cy="${f1(cy - r * 0.3)}" r="${f1(r * 0.5)}" fill="${L.hedgeTop}" opacity=".5"/>`);
      }
      for (let i = 0; i < 7; i++) {
        const gx = bx + 80 + i * 70 + R() * 40, gy = by + 120 + R() * 80;
        for (let k = -3; k <= 3; k++) parts.push(`<path d="M${f1(gx)} ${f1(gy + 40)} q${k * 8} -40 ${k * 16} -${f1(70 + R() * 30)}" stroke="${mix(rgb(L.hedgeTop), [230, 200, 120], 0.45)}" stroke-width="1.6" fill="none"/>`);
      }
      if (L.flowers === 'tulips') for (let i = 0; i < 30; i++) parts.push(`<ellipse cx="${f1(bx + 40 + R() * 480)}" cy="${f1(by + 60 + R() * 170)}" rx="4" ry="7" fill="#F6F2E4"/>`);
    } else {
      for (let i = 0; i < 5; i++) parts.push(`<circle cx="${f1(bx + 60 + i * 110)}" cy="${f1(by + 190)}" r="30" fill="${L.hedge}"/><ellipse cx="${f1(bx + 60 + i * 110)}" cy="${f1(by + 165)}" rx="28" ry="10" fill="#EDEFEA"/>`);
    }
  }

  // валуны (каменная композиция)
  if (o.rocks) {
    for (let i = 0; i < 7; i++) {
      const cx = 200 + R() * 1200, cy = baseY + 140 + R() * 300, r = 40 + R() * 60;
      parts.push(`<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(r)}" ry="${f1(r * 0.55)}" fill="#8C8A82"/><ellipse cx="${f1(cx - r * 0.2)}" cy="${f1(cy - r * 0.18)}" rx="${f1(r * 0.6)}" ry="${f1(r * 0.3)}" fill="#A5A39A"/>`);
      parts.push(`<path d="M${f1(cx + r)} ${f1(cy + 10)} l-22 0 l11 -${f1(50 + R() * 30)} z" fill="${L.hedge}"/>`);
    }
  }

  // настил с перголой (зона отдыха)
  if (o.deck) {
    parts.push(`<path d="M520 ${H} L1180 ${H} L1080 ${baseY + 200} L620 ${baseY + 200} Z" fill="#8E7658"/>`);
    for (let i = 0; i < 12; i++) parts.push(`<path d="M${540 + i * 55} ${H} L${626 + i * 40} ${baseY + 200}" stroke="#7A6448" stroke-width="2"/>`);
    for (const x of [660, 1040]) parts.push(`<rect x="${x}" y="${baseY - 160}" width="14" height="360" fill="#6E5A42"/>`);
    parts.push(`<rect x="620" y="${baseY - 170}" width="470" height="12" fill="#6E5A42"/>`);
    for (let i = 0; i < 9; i++) parts.push(`<rect x="${640 + i * 52}" y="${baseY - 178}" width="8" height="24" fill="#6E5A42"/>`);
    parts.push(`<rect x="700" y="${baseY + 120}" width="300" height="34" rx="4" fill="#C9BBA0"/>`);
    parts.push(`<circle cx="860" cy="${baseY + 260}" r="34" fill="#4A4642"/>`);
  }

  // теплица у правого края (усадьба)
  if (o.greenhouse) {
    parts.push(`<path d="M1380 ${HOR + 56} L1380 ${HOR - 70} L1500 ${HOR - 130} L1620 ${HOR - 70} L1620 ${HOR + 56} Z" fill="${mix(rgb(L.skyHor), [255, 255, 255], 0.3)}" stroke="#7E8A7A" stroke-width="3" opacity=".9"/>`);
    for (let x = 1400; x < 1620; x += 40) parts.push(`<path d="M${x} ${HOR + 56} L${x} ${HOR - 70 + (1500 - Math.abs(1500 - x)) * -0.5}" stroke="#7E8A7A" stroke-width="2"/>`);
  }

  // угол дома слева с большим окном
  if (o.house !== false) {
    parts.push(`<rect x="0" y="130" width="190" height="${HOR + 140 - 130}" fill="${L.house}"/>`);
    parts.push(`<rect x="0" y="130" width="190" height="14" fill="${mix(rgb(L.house), [0, 0, 0], 0.3)}"/>`);
    parts.push(`<rect x="34" y="200" width="130" height="250" fill="${L.window}"/>`);
    if (L.lamps) { defs.push(`<linearGradient id="${id('win')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E2B46C" stop-opacity=".35"/><stop offset="1" stop-color="#E2B46C" stop-opacity="0"/></linearGradient>`); parts.push(`<path d="M164 200 L420 260 L420 560 L164 450 Z" fill="url(#${id('win')})"/>`); }
    parts.push(`<rect x="97" y="200" width="4" height="250" fill="${mix(rgb(L.house), [0, 0, 0], 0.35)}"/>`);
  }

  // туман на рассвете
  if (L.mist) {
    defs.push(`<linearGradient id="${id('mist')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3F1EA" stop-opacity="0"/><stop offset=".45" stop-color="#F3F1EA" stop-opacity="${L.mist}"/><stop offset="1" stop-color="#F3F1EA" stop-opacity="0"/></linearGradient>`);
    parts.push(`<rect x="0" y="${HOR - 60}" width="${W}" height="420" fill="url(#${id('mist')})"/>`);
  }
  // общий тон
  if (L.tintA) parts.push(`<rect width="${W}" height="${H}" fill="${L.tint}" opacity="${L.tintA}"/>`);
  // лёгкое виньетирование — как у объектива
  defs.push(`<radialGradient id="${id('vig')}" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#${id('vig')})"/>`);

  return { defs: defs.join(''), body: parts.join('') };
}

function svgDoc(g, vb, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid slice"><defs>${g.defs}</defs>${g.body}</svg>`;
}
// viewBox под пропорции из мира 1600×1000 c фокусом
function viewBox(aspect, focus = [0.56, 0.55]) {
  const W = 1600, H = 1000;
  let w, h;
  if (aspect >= W / H) { w = W; h = W / aspect; } else { h = H; w = H * aspect; }
  const x = Math.max(0, Math.min(W - w, focus[0] * W - w / 2));
  const y = Math.max(0, Math.min(H - h, focus[1] * H - h / 2));
  return [f1(x), f1(y), f1(w), f1(h)];
}
async function render(g, aspect, w, out, { focus, q = 80 } = {}) {
  const h = Math.round(w / aspect);
  const svg = svgDoc(g, viewBox(aspect, focus), w, h);
  const buf = await sharp(Buffer.from(svg), { density: 72 }).resize(w, h).webp({ quality: q, effort: 5 }).toBuffer();
  await writeFile(out, buf);
  return buf.length;
}

// ---------- сцена хиро: 4 стилла × 2 кропа ----------
const FOCUS = [0.56, 0.55];
const times = ['dawn', 'morning', 'golden', 'night'];
const manifest = { v: 1, n: 4, focus: FOCUS, clock: ['06:40', '21:30'], placeholder: true, sets: { wide: { w: 1440, h: 810, frames: [] }, tall: { w: 720, h: 1280, frames: [] } }, poster: { wide: 'poster-wide.webp', tall: 'poster-tall.webp' } };
let total = 0;
for (let i = 0; i < times.length; i++) {
  const g = garden({ light: times[i], seed: 7 });
  const fw = `wide-0${i}.webp`, ft = `tall-0${i}.webp`;
  total += await render(g, 16 / 9, 1440, join(SCENE, fw), { focus: FOCUS, q: 78 });
  total += await render(g, 9 / 16, 720, join(SCENE, ft), { focus: FOCUS, q: 78 });
  manifest.sets.wide.frames.push(fw); manifest.sets.tall.frames.push(ft);
}
const g0 = garden({ light: 'dawn', seed: 7 });
const pw = await render(g0, 16 / 9, 960, join(SCENE, 'poster-wide.webp'), { focus: FOCUS, q: 70 });
const pt = await render(g0, 9 / 16, 540, join(SCENE, 'poster-tall.webp'), { focus: FOCUS, q: 70 });
await writeFile(join(SCENE, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`scene: 8 frames ${(total / 1024).toFixed(0)} KB, posters ${(pw / 1024).toFixed(0)}+${(pt / 1024).toFixed(0)} KB`);

// ---------- стиллы секций ----------
const STILL = {
  // тарифы (4:5), поздний день
  'tariff-basic':   { light: 'golden', seed: 11, fence: true, thuja: true, trees: 10, treeScale: 0.7, bed: true, bedX: 1120, pathEnd: 760, horizon: 470, house: false, stripes: 10 },
  'tariff-premium': { light: 'golden', seed: 7 },
  'tariff-estate':  { light: 'golden', seed: 23, trees: 30, pool: true, parterre: true, greenhouse: true, bed: false, pathEnd: 820, house: false, stripes: 18 },
  // прайс (4:5)
  'price-lawn':     { light: 'golden', seed: 31, horizon: 300, stripes: 22, bed: false, house: false, path: false, trees: 14, treeScale: 0.6 },
  'price-plants':   { light: 'golden', seed: 37, horizon: 360, hedgeTop: 180, bed: true, bedX: 200, path: false, house: false, trees: 0 },
  'price-trees':    { light: 'golden', seed: 41, horizon: 520, trees: 9, treeScale: 2.4, pineShare: 0.4, bed: false, path: false, house: false, hedgeTop: 500 },
  // 10 способов (4:5)
  'way-01': { light: 'golden', seed: 51, horizon: 380, stripes: 20, bed: false, pathEnd: 1200 },
  'way-02': { light: 'golden', seed: 52, horizon: 420, pathEnd: 700, bed: true, bedX: 1000, house: false },
  'way-03': { light: 'golden', seed: 53, horizon: 400, bedX: 300, path: false, house: false },
  'way-04': { light: 'night',  seed: 54 },
  'way-05': { light: 'golden', seed: 55, fence: true, thuja: true, horizon: 460, bed: false, house: false, pathEnd: 1300 },
  'way-06': { light: 'golden', seed: 56, rocks: true, bed: false, path: false, house: false, horizon: 440 },
  'way-07': { light: 'golden', seed: 57, sprinklers: true, bed: false, path: false, house: false, horizon: 420 },
  'way-08': { light: 'golden', seed: 58, deck: true, bed: false, path: false, house: false, horizon: 440 },
  'way-09': { light: 'morning', season: 'autumn', seed: 59 },
  'way-10': { light: 'golden', seed: 60, rocks: true, deck: false, trees: 26 },
  // до / после (16:10)
  'ba-before': { light: 'morning', seed: 7, overgrown: true },
  'ba-after':  { light: 'morning', seed: 7 },
  // сезоны (16:10)
  'season-spring': { light: 'morning', season: 'spring', seed: 7 },
  'season-summer': { light: 'morning', season: 'summer', seed: 7 },
  'season-autumn': { light: 'morning', season: 'autumn', seed: 7 },
  'season-winter': { light: 'morning', season: 'winter', seed: 7 },
};
let st = 0, count = 0;
for (const [name, o] of Object.entries(STILL)) {
  const wide = name.startsWith('ba-') || name.startsWith('season-');
  const aspect = wide ? 16 / 10 : 4 / 5;
  const g = garden(o);
  st += await render(g, aspect, wide ? 1440 : 1000, join(STILLS, `${name}-l.webp`), { q: 78 });
  st += await render(g, aspect, wide ? 720 : 560, join(STILLS, `${name}-s.webp`), { q: 76 });
  count += 2;
}
console.log(`stills: ${count} files ${(st / 1024).toFixed(0)} KB`);
