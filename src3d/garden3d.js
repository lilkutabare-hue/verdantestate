// Verdant Estate · 3D-сад «Один день» · three.js
// Сцена с физически корректным светом: солнце ходит по скроллу, тени ползут, туман тает, фонари зажигаются.
// Собирается esbuild'ом в docs/site/js/garden3d.js (три.js внутри, tree-shaking). Экспорт: mount(root, opts), GardenScene.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Color, Vector2, Vector3, MathUtils, Group, Mesh, InstancedMesh, Object3D,
  PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry, IcosahedronGeometry, BufferGeometry, BufferAttribute, Float32BufferAttribute,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, SpriteMaterial, Sprite,
  DirectionalLight, HemisphereLight, AmbientLight, PointLight, SpotLight,
  CanvasTexture, SRGBColorSpace, RepeatWrapping, DoubleSide, BackSide, FogExp2, PCFSoftShadowMap, ACESFilmicToneMapping,
  CatmullRomCurve3, PMREMGenerator, LinearSRGBColorSpace, Matrix4, Quaternion, Euler, NormalBlending,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ---------- утилиты ----------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lerp = MathUtils.lerp, clamp = MathUtils.clamp, smooth = MathUtils.smoothstep;
const col = (h) => new Color(h);
const mixc = (a, b, t) => a.clone().lerp(b, t);
const DEG = Math.PI / 180;

// значение-шум на канвасе
function valueNoise(size, seed, oct = 4, scale = 8) {
  const R = rng(seed); const grid = []; const g = 64;
  for (let i = 0; i < g * g; i++) grid.push(R());
  const at = (x, y) => grid[((y & (g - 1)) * g + (x & (g - 1)))];
  const smoothv = (t) => t * t * (3 - 2 * t);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 1, f = scale / size, norm = 0;
    for (let o = 0; o < oct; o++) {
      const px = x * f, py = y * f, x0 = Math.floor(px), y0 = Math.floor(py), tx = smoothv(px - x0), ty = smoothv(py - y0);
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      v += amp * lerp(lerp(a, b, tx), lerp(c, d, tx), ty); norm += amp; amp *= 0.5; f *= 2;
    }
    out[y * size + x] = v / norm;
  }
  return out;
}
function canvasTex(size, draw, { srgb = true, repeat = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); draw(ctx, size);
  const t = new CanvasTexture(c); if (srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t;
}
function noiseFill(ctx, size, noise, lo, hi, extra) {
  const img = ctx.createImageData(size, size), d = img.data;
  for (let i = 0; i < size * size; i++) {
    const n = noise[i], r = lo[0] + (hi[0] - lo[0]) * n, g = lo[1] + (hi[1] - lo[1]) * n, b = lo[2] + (hi[2] - lo[2]) * n;
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    if (extra) extra(d, i, n);
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- текстуры (все процедурные, без сети) ----------
function makeTextures(q) {
  const T = {};
  const S = q.texSize;
  // газон: полосы покоса + зерно
  T.lawn = canvasTex(S, (ctx, s) => {
    const n = valueNoise(s, 11, 5, 14), n2 = valueNoise(s, 12, 2, 3);
    noiseFill(ctx, s, n, [62, 104, 38], [112, 152, 66], (d, i, v) => {
      const x = i % s; const stripe = Math.floor(x / (s / 2)) % 2 ? 0.86 : 1.0; const t = n2[i];
      d[i * 4] *= stripe * (0.9 + 0.2 * t); d[i * 4 + 1] *= stripe * (0.9 + 0.2 * t); d[i * 4 + 2] *= stripe;
    });
  }, { repeat: 20 });
  T.lawnRough = canvasTex(S / 2, (ctx, s) => noiseFill(ctx, s, valueNoise(s, 13, 3, 20), [210, 210, 210], [255, 255, 255]), { srgb: false, repeat: 20 });
  // гравий
  T.gravel = canvasTex(S, (ctx, s) => {
    noiseFill(ctx, s, valueNoise(s, 21, 4, 24), [196, 186, 166], [228, 220, 200]);
    const R = rng(22); for (let i = 0; i < s * 9; i++) { const g = 150 + R() * 90; ctx.fillStyle = `rgb(${g},${g - 6},${g - 18})`; ctx.beginPath(); ctx.arc(R() * s, R() * s, 0.8 + R() * 2.2, 0, 7); ctx.fill(); }
  }, { repeat: 6 });
  // мульча
  T.mulch = canvasTex(S / 2, (ctx, s) => {
    noiseFill(ctx, s, valueNoise(s, 31, 4, 18), [48, 34, 24], [96, 72, 50]);
    const R = rng(32); for (let i = 0; i < s * 4; i++) { ctx.fillStyle = `rgba(${70 + R() * 60},${50 + R() * 40},${30 + R() * 20},.8)`; ctx.save(); ctx.translate(R() * s, R() * s); ctx.rotate(R() * 6.3); ctx.fillRect(-3, -1, 6 + R() * 6, 2); ctx.restore(); }
  }, { repeat: 4 });
  // листва изгороди (плотные мелкие листья)
  T.hedge = canvasTex(S / 2, (ctx, s) => {
    ctx.fillStyle = '#35592a'; ctx.fillRect(0, 0, s, s);
    const R = rng(41); for (let i = 0; i < s * 6; i++) { const g = 95 + R() * 80; ctx.fillStyle = `rgb(${g * .55},${g},${g * .35})`; ctx.save(); ctx.translate(R() * s, R() * s); ctx.rotate(R() * 6.3); ctx.beginPath(); ctx.ellipse(0, 0, 2 + R() * 3, 1.2 + R() * 1.5, 0, 0, 7); ctx.fill(); ctx.restore(); }
  }, { repeat: 12 });
  T.hedgeBump = canvasTex(S / 2, (ctx, s) => noiseFill(ctx, s, valueNoise(s, 42, 5, 40), [60, 60, 60], [255, 255, 255]), { srgb: false, repeat: 12 });
  // кора берёзы
  T.bark = canvasTex(S / 2, (ctx, s) => {
    noiseFill(ctx, s, valueNoise(s, 51, 3, 6), [222, 220, 212], [246, 244, 238]);
    const R = rng(52); for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(30,28,26,${.5 + R() * .5})`; const w = 6 + R() * 40, h = 1.5 + R() * 4; ctx.fillRect(R() * s, R() * s, w, h); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(40,36,32,.85)'; ctx.fillRect(0, R() * s, s, 2 + R() * 6); }
  }, { repeat: 1 });
  T.bark.repeat.set(1, 4);
  T.pineBark = canvasTex(S / 4, (ctx, s) => noiseFill(ctx, s, valueNoise(s, 53, 4, 10), [58, 44, 34], [112, 84, 60]), { repeat: 1 }); T.pineBark.repeat.set(1, 5);
  // карточка листвы (альфа)
  const leafCard = (seed, pal, count, lw, lh) => canvasTex(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s); const R = rng(seed);
    for (let i = 0; i < count; i++) {
      const c = pal[Math.floor(R() * pal.length)]; const cx = s / 2 + (R() - .5) * s * .8, cy = s / 2 + (R() - .5) * s * .8;
      if (Math.hypot(cx - s / 2, cy - s / 2) > s * .46) continue;
      ctx.fillStyle = c; ctx.save(); ctx.translate(cx, cy); ctx.rotate(R() * 6.3); ctx.beginPath(); ctx.ellipse(0, 0, lw * (.7 + R() * .6), lh * (.7 + R() * .6), 0, 0, 7); ctx.fill(); ctx.restore();
    }
  }, { repeat: 1 });
  T.birchLeaf = leafCard(61, ['#4f7d2e', '#5d8f36', '#6ea03f', '#3f6a26', '#7fae4a'], 110, 9, 5);
  T.birchLeafSpring = leafCard(62, ['#8dc45a', '#a0d06a', '#79b24c', '#b6dc7e'], 90, 7, 4);
  T.birchLeafAutumn = leafCard(63, ['#d9a23a', '#e5b64a', '#c88a2c', '#f0c85a', '#b87a24'], 110, 9, 5);
  T.pineNeedle = canvasTex(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s); const R = rng(71); ctx.lineCap = 'round';
    for (let i = 0; i < 420; i++) { const a = R() * 6.3, r = R() * s * .42, x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r; const g = 60 + R() * 50; ctx.strokeStyle = `rgb(${g * .4},${g},${g * .45})`; ctx.lineWidth = 1.5 + R(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + 1.2) * 18, y + Math.sin(a + 1.2) * 18); ctx.stroke(); }
  }, { repeat: 1 });
  T.thuja = leafCard(72, ['#2f5a2a', '#3a6b32', '#447a3a', '#2a4f26'], 140, 7, 3);
  // туман, облака
  T.mist = canvasTex(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s); const R = rng(81);
    for (let i = 0; i < 26; i++) { const x = R() * s, y = R() * s, r = 30 + R() * 70; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  }, { srgb: false });
  T.cloud = canvasTex(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s); const R = rng(91);
    for (let i = 0; i < 40; i++) { const x = s * .2 + R() * s * .6, y = s * .35 + R() * s * .3, r = 18 + R() * 40; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  }, { srgb: false });
  // доски настила
  T.wood = canvasTex(S / 2, (ctx, s) => {
    noiseFill(ctx, s, valueNoise(s, 101, 4, 3), [92, 66, 44], [138, 104, 70], (d, i, v) => { const y = Math.floor(i / s); if (y % (s / 8) < 2) { d[i * 4] *= .45; d[i * 4 + 1] *= .45; d[i * 4 + 2] *= .45; } });
  }, { repeat: 1 });
  T.wood.repeat.set(1, 3);
  T.stucco = canvasTex(S / 2, (ctx, s) => noiseFill(ctx, s, valueNoise(s, 111, 5, 30), [196, 190, 176], [224, 218, 204]), { repeat: 3 });
  T.snow = canvasTex(S / 2, (ctx, s) => noiseFill(ctx, s, valueNoise(s, 121, 5, 24), [228, 232, 236], [250, 252, 255]), { repeat: 20 });
  return T;
}

// ---------- геометрии ----------
function bladeGeometry(h = 0.16, w = 0.028, segs = 3) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, y = t * h, bend = t * t * 0.05, ww = w * (1 - t * 0.9);
    pos.push(-ww / 2, y, bend, ww / 2, y, bend); uv.push(0, t, 1, t);
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function ribbonAlongCurve(curve, width, segments, y = 0.02) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, p = curve.getPointAt(t), tan = curve.getTangentAt(t); const nx = -tan.z, nz = tan.x;
    const w = width(t);
    pos.push(p.x + nx * w / 2, y, p.z + nz * w / 2, p.x - nx * w / 2, y, p.z - nz * w / 2); uv.push(0, t * 12, 1, t * 12);
  }
  for (let i = 0; i < segments; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function displace(geo, amp, seed, freq = 1.5) {
  const R = rng(seed), p = geo.attributes.position, n = valueNoise(64, seed, 3, 4);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = n[(Math.abs(Math.floor(x * freq * 7 + y * 3)) % 64) * 64 + (Math.abs(Math.floor(z * freq * 7 + y * 5)) % 64)] - 0.5;
    const l = Math.hypot(x, y, z) || 1;
    p.setXYZ(i, x + x / l * k * amp, y + y / l * k * amp, z + z / l * k * amp);
  }
  p.needsUpdate = true; geo.computeVertexNormals(); return geo;
}

// ---------- шейдер неба ----------
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const SKY_FRAG = `
uniform vec3 uZenith, uHorizon, uGround, uSunDir, uSunColor; uniform float uGlow, uNight, uHaze, uGain;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(h,0.,1.), 0.38));
  sky = mix(sky, uHorizon, uHaze * exp(-max(h,0.)*9.0));
  float sd = max(dot(d, uSunDir), 0.0);
  vec3 sun = uSunColor * (pow(sd, 900.0)*2.2 + pow(sd, 16.0)*0.35*uGlow + pow(sd, 3.0)*0.10*uGlow);
  vec3 c = mix(uGround, sky + sun, smoothstep(-0.03, 0.01, h));
  float st = step(0.9992, hash(floor(d*420.0))) * smoothstep(0.03, 0.25, h) * uNight;
  c += vec3(st) * (0.6 + 0.4*hash(floor(d*97.0)));
  gl_FragColor = vec4(c * uGain, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------- сцена ----------
export class GardenScene {
  constructor(canvas, opts = {}) {
    this.opts = opts;
    const mobile = opts.mobile ?? (Math.min(innerWidth, innerHeight) < 700 || /Mobi|Android/i.test(navigator.userAgent));
    this.q = { mobile, texSize: mobile ? 256 : 512, grass: mobile ? 12000 : 32000, shadow: mobile ? 1024 : 2048, bloom: !mobile, dpr: mobile ? 1.25 : 1.5, env: !mobile, ...(opts.quality || {}) };
    this.renderer = new WebGLRenderer({ canvas, antialias: !this.q.bloom, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.stills });
    const r = this.renderer;
    r.outputColorSpace = SRGBColorSpace; r.toneMapping = ACESFilmicToneMapping; r.toneMappingExposure = 1;
    r.shadowMap.enabled = true; r.shadowMap.type = PCFSoftShadowMap;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(50, 1, 0.1, 500);
    this.camera.position.set(0.3, 1.62, 0.4);
    this.look = new Vector3(1.1, 0.75, -14);
    this.time = 0; this.p = 0.0; this.season = 'summer'; this.variant = opts.variant || 'master';
    this.T = makeTextures(this.q);
    this.state = {};
    this.build();
    this.setTime(0.0);
  }

  // --- построение ---
  build() {
    const S = this.scene, T = this.T, V = this.variant, R = rng(7), q = this.q;
    const far = V === 'estate' ? 52 : V === 'basic' ? 17 : 31; this.far = far;

    // небо
    this.sky = new Mesh(new SphereGeometry(400, 32, 16), new ShaderMaterial({ side: BackSide, depthWrite: false, uniforms: {
      uZenith: { value: col('#8fb4d6') }, uHorizon: { value: col('#d7e4ec') }, uGround: { value: col('#50603a') }, uSunDir: { value: new Vector3(0, 1, 0) },
      uSunColor: { value: col('#fff2d8') }, uGlow: { value: 1 }, uNight: { value: 0 }, uHaze: { value: 0.3 }, uGain: { value: 1.4 } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG }));
    S.add(this.sky);
    S.fog = new FogExp2(0xd7e4ec, 0.006);

    // свет
    this.sun = new DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    const sh = this.sun.shadow; sh.mapSize.set(q.shadow, q.shadow); sh.camera.near = 1; sh.camera.far = 220; sh.camera.left = -34; sh.camera.right = 34; sh.camera.top = 30; sh.camera.bottom = -far - 10; sh.bias = -0.0006; sh.normalBias = 0.03; sh.radius = 2;
    this.sunTarget = new Object3D(); this.sunTarget.position.set(0, 0, -far * 0.45); S.add(this.sunTarget); this.sun.target = this.sunTarget; S.add(this.sun);
    this.hemi = new HemisphereLight(0x8fb4d6, 0x5a6b3a, 0.9); S.add(this.hemi);
    this.amb = new AmbientLight(0x1a2438, 0); S.add(this.amb);

    // земля: газон
    const lawnMat = this.lawnMat = new MeshStandardMaterial({ map: T.lawn, roughnessMap: T.lawnRough, roughness: 0.95, metalness: 0, color: 0xffffff });
    const ground = new Mesh(new PlaneGeometry(160, 160, 1, 1), lawnMat); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -40); ground.receiveShadow = true; S.add(ground);
    this.ground = ground;

    // терраса под камерой
    const deck = new Mesh(new BoxGeometry(14, 0.12, 2.6), new MeshStandardMaterial({ map: T.wood, roughness: 0.8 })); deck.position.set(-2, 0.06, 0.2); deck.receiveShadow = true; deck.castShadow = true; S.add(deck);
    const edge = new Mesh(new BoxGeometry(14, 0.1, 0.12), new MeshStandardMaterial({ color: 0x3a3a36, roughness: 0.6, metalness: 0.4 })); edge.position.set(-2, 0.09, -1.1); S.add(edge);

    // трава инстансами
    this.buildGrass();

    // изгородь или забор
    if (V === 'basic') this.buildFence(far); else this.buildHedge(far);

    // деревья за изгородью
    this.trees = new Group(); S.add(this.trees);
    this.buildTrees(far);

    // дорожка
    this.buildPath(far);

    // клумба
    if (V !== 'estate') this.buildBed();
    if (V === 'estate') this.buildEstate(far);

    // дом слева
    this.buildHouse();
    for (const x of (this.opts.extras || [])) { if (x === 'rocks') this.buildRocks(); if (x === 'sprinklers') this.buildSprinklers(); if (x === 'deck') this.buildDeck(); }

    // туман и облака
    this.buildMistAndClouds(far);

    // пост-обработка
    if (q.bloom) {
      const c = this.composer = new EffectComposer(this.renderer);
      c.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new Vector2(512, 512), 0.0, 0.55, 0.92); c.addPass(this.bloom);
      c.addPass(new OutputPass());
    }
    if (q.env) { this.pmrem = new PMREMGenerator(this.renderer); this.envScene = new Scene(); this.envScene.add(this.sky.clone()); this.envScene.children[0].material = this.sky.material; }
  }

  buildGrass() {
    const S = this.scene, q = this.q, R = rng(3);
    const geo = bladeGeometry(0.12, 0.026, 3);
    const mat = this.grassMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: DoubleSide });
    mat.defines = { USE_UV: '' };
    this.uTime = { value: 0 }; this.uSway = { value: 0.03 }; const uTime = this.uTime, uSway = this.uSway;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime; sh.uniforms.uSway = uSway;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uSway;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float ph = instanceMatrix[3].x * 1.9 + instanceMatrix[3].z * 1.3;
          float sw = sin(uTime*1.3 + ph) * 0.6 + sin(uTime*2.1 + ph*1.7) * 0.4;
          float k = uv.y * uv.y;
          transformed.x += sw * uSway * k; transformed.z += sw * uSway * 0.6 * k;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= (0.62 + 0.38 * vUv.y);');
    };
    const n = q.grass; const m = this.grass = new InstancedMesh(geo, mat, n); m.receiveShadow = true;
    const d = new Object3D(); const c = new Color();
    for (let i = 0; i < n; i++) {
      // плотнее у камеры, реже вдаль
      const t = Math.pow(R(), 1.6); const z = -1.4 - t * 17; const x = (R() - 0.5) * (12 + t * 26);
      d.position.set(x, 0, z); d.rotation.set(0, R() * Math.PI, (R() - 0.5) * 0.25); const s = 0.8 + R() * 0.6; d.scale.set(s, s * (0.8 + R() * 0.6), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      const stripe = (Math.floor((x + 100) / 2) % 2) ? 0.86 : 1.0; c.setHSL(0.25 + R() * 0.04, 0.5 + R() * 0.2, (0.34 + R() * 0.12) * stripe); m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true; S.add(m);
  }

  buildHedge(far) {
    const S = this.scene, T = this.T;
    const mat = this.hedgeMat = new MeshStandardMaterial({ map: T.hedge, bumpMap: T.hedgeBump, bumpScale: 0.35, roughness: 0.85 });
    const geo = new BoxGeometry(90, 2.3, 1.3, 90, 6, 2); displace(geo, 0.16, 5, 0.8);
    const h = new Mesh(geo, mat); h.position.set(0, 1.15, -far); h.castShadow = true; h.receiveShadow = true; S.add(h); this.hedge = h;
    // «комнаты» из изгородей у усадьбы — короткие поперечные
    if (this.variant === 'estate') for (const x of [-16, 16]) { const g2 = new BoxGeometry(1.2, 2.0, 18, 2, 4, 18); displace(g2, 0.12, 6, 0.8); const m2 = new Mesh(g2, mat); m2.position.set(x, 1, -far * 0.55); m2.castShadow = m2.receiveShadow = true; S.add(m2); }
  }
  buildFence(far) {
    const S = this.scene, T = this.T;
    const wood = new MeshStandardMaterial({ map: T.wood, roughness: 0.85, color: 0x9a8a78 });
    for (let x = -24; x <= 24; x += 0.16) { const b = new Mesh(new BoxGeometry(0.12, 1.7, 0.03), wood); b.position.set(x, 0.85, -far); b.castShadow = true; S.add(b); }
    // туи вдоль забора
    const cards = new InstancedMesh(new PlaneGeometry(0.9, 0.9), new MeshStandardMaterial({ map: T.thuja, alphaTest: 0.5, side: DoubleSide, roughness: 0.9 }), 900);
    const d = new Object3D(); const R = rng(9); let i = 0;
    for (let x = -22; x <= 22 && i < 900; x += 1.5) { const h = 2.2 + R() * 0.6; for (let k = 0; k < 28 && i < 900; k++) { const y = R() * h, rr = 0.42 * (1 - y / h) + 0.08; const a = R() * 6.3; d.position.set(x + Math.cos(a) * rr * R(), y + 0.1, -far + 0.7 + Math.sin(a) * rr * R()); d.rotation.set((R() - .5) * 1.2, R() * 6.3, (R() - .5) * 1.2); d.updateMatrix(); cards.setMatrixAt(i++, d.matrix); } }
    cards.count = i; cards.castShadow = true; cards.receiveShadow = true; S.add(cards);
  }

  buildTrees(far) {
    const T = this.T, R = rng(23), G = this.trees, V = this.variant;
    const birchMat = new MeshStandardMaterial({ map: T.bark, roughness: 0.8 });
    const pineMat = new MeshStandardMaterial({ map: T.pineBark, roughness: 0.95 });
    const leafMat = this.leafMat = new MeshStandardMaterial({ map: T.birchLeaf, alphaTest: 0.45, side: DoubleSide, roughness: 0.75, color: 0xffffff });
    const needleMat = new MeshStandardMaterial({ map: T.pineNeedle, alphaTest: 0.4, side: DoubleSide, roughness: 0.9 });
    const leafGeo = new PlaneGeometry(1.5, 1.5), needleGeo = new PlaneGeometry(1.7, 1.7);
    const nB = V === 'basic' ? 5 : V === 'estate' ? 22 : 13, nP = V === 'basic' ? 2 : V === 'estate' ? 14 : 8;
    const leaves = new InstancedMesh(leafGeo, leafMat, nB * 70), needles = new InstancedMesh(needleGeo, needleMat, nP * 90);
    const d = new Object3D(); let li = 0, ni = 0; this.uplightSpots = [];
    const placeX = () => (R() - 0.5) * (V === 'estate' ? 70 : 54);
    for (let i = 0; i < nB; i++) {
      const x = placeX(), z = -far - 3 - R() * 10, h = (V === 'basic' ? 4 : 9) + R() * 5, r = 0.14 + R() * 0.08;
      const trunk = new Mesh(new CylinderGeometry(r * 0.55, r, h, 8, 1), birchMat); trunk.position.set(x, h / 2, z); trunk.castShadow = true; G.add(trunk);
      for (let b = 0; b < 3; b++) { const br = new Mesh(new CylinderGeometry(r * 0.25, r * 0.45, h * 0.45, 6, 1), birchMat); br.position.set(x + (R() - .5) * 1.2, h * 0.72, z + (R() - .5) * 1.2); br.rotation.set((R() - .5) * 0.9, 0, (R() - .5) * 0.9); br.castShadow = true; G.add(br); }
      for (let k = 0; k < 70; k++) { const a = R() * 6.3, rr = Math.pow(R(), 0.5) * (1.6 + h * 0.14), y = h * 0.55 + (R() - 0.3) * h * 0.5; d.position.set(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr); d.rotation.set((R() - .5) * 2, R() * 6.3, (R() - .5) * 2); const s = 0.7 + R() * 0.8; d.scale.set(s, s, s); d.updateMatrix(); leaves.setMatrixAt(li++, d.matrix); }
      if (i % 3 === 0) this.uplightSpots.push(new Vector3(x, 0.05, z + 1.2));
    }
    for (let i = 0; i < nP; i++) {
      const x = placeX(), z = -far - 6 - R() * 12, h = 11 + R() * 6, r = 0.25;
      const trunk = new Mesh(new CylinderGeometry(r * 0.5, r, h, 7, 1), pineMat); trunk.position.set(x, h / 2, z); trunk.castShadow = true; G.add(trunk);
      for (let k = 0; k < 90; k++) { const t = R(), y = h * 0.35 + t * h * 0.62, rr = (1 - t) * 2.4 * Math.pow(R(), 0.4) + 0.2, a = R() * 6.3; d.position.set(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr); d.rotation.set((R() - .5) * 2.4, R() * 6.3, (R() - .5) * 2.4); const s = 0.8 + R() * 0.7; d.scale.set(s, s, s); d.updateMatrix(); needles.setMatrixAt(ni++, d.matrix); }
      if (i % 3 === 1) this.uplightSpots.push(new Vector3(x, 0.05, z + 1.5));
    }
    leaves.count = li; needles.count = ni; leaves.castShadow = needles.castShadow = true; leaves.receiveShadow = needles.receiveShadow = false;
    G.add(leaves); G.add(needles); this.leaves = leaves;
    // подсветка стволов снизу (ночь)
    this.uplights = this.uplightSpots.slice(0, this.q.mobile ? 3 : 5).map((p) => { const s = new SpotLight(0xffd39a, 0, 16, 0.55, 0.7, 1.2); s.position.copy(p); s.target.position.set(p.x, 9, p.z - 0.8); G.add(s); G.add(s.target); return s; });
  }

  buildPath(far) {
    const S = this.scene, T = this.T, V = this.variant;
    const pts = V === 'basic' ? [new Vector3(1.6, 0, 0.2), new Vector3(2.0, 0, -4), new Vector3(0.5, 0, -9), new Vector3(-2.5, 0, -far + 1)]
      : [new Vector3(1.6, 0, 0.4), new Vector3(2.4, 0, -5), new Vector3(1.2, 0, -11), new Vector3(-2.5, 0, -19), new Vector3(-4.5, 0, -far + 1)];
    const curve = this.pathCurve = new CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    const gravel = new Mesh(ribbonAlongCurve(curve, (t) => 1.5 - t * 0.3, 80, 0.015), new MeshStandardMaterial({ map: T.gravel, roughness: 0.95 })); gravel.receiveShadow = true; S.add(gravel);
    const steel = new MeshStandardMaterial({ color: 0x2b2b28, roughness: 0.45, metalness: 0.7 });
    for (const side of [1, -1]) {
      const pos = [], idx = [], n = 80;
      for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t), nx = -tan.z, nz = tan.x, w = (1.5 - t * 0.3) / 2 * side; pos.push(p.x + nx * w, 0.0, p.z + nz * w, p.x + nx * w, 0.06, p.z + nz * w); }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new Mesh(g, steel); m.material.side = DoubleSide; S.add(m);
    }
    // фонари
    this.lamps = []; const post = new MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, metalness: 0.6 });
    const nL = V === 'basic' ? 3 : 5;
    for (let i = 0; i < nL; i++) {
      const t = 0.1 + i * (0.8 / (nL - 1)), p = curve.getPointAt(t), tan = curve.getTangentAt(t), nx = -tan.z, nz = tan.x, off = (1.5 - t * 0.3) / 2 + 0.35;
      const g = new Group(); g.position.set(p.x + nx * off, 0, p.z + nz * off);
      const stem = new Mesh(new CylinderGeometry(0.025, 0.03, 0.55, 8), post); stem.position.y = 0.28; stem.castShadow = true; g.add(stem);
      const cap = new Mesh(new BoxGeometry(0.16, 0.05, 0.16), post); cap.position.y = 0.58; cap.castShadow = true; g.add(cap);
      const glow = new Mesh(new BoxGeometry(0.13, 0.01, 0.13), new MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xffc27a, emissiveIntensity: 0 })); glow.position.y = 0.552; g.add(glow);
      const light = new PointLight(0xffc27a, 0, 7, 1.8); light.position.y = 0.5; g.add(light);
      S.add(g); this.lamps.push({ g, glow, light });
    }
  }

  buildBed() {
    const S = this.scene, T = this.T, R = rng(31);
    const shape = new PlaneGeometry(9, 5.5, 8, 6); displace(shape, 0.0, 1);
    const mulch = new Mesh(shape, new MeshStandardMaterial({ map: T.mulch, roughness: 1 })); mulch.rotation.x = -Math.PI / 2; mulch.position.set(7.5, 0.012, -9.5); mulch.receiveShadow = true; S.add(mulch);
    const box = this.boxMat = new MeshStandardMaterial({ map: T.hedge, bumpMap: T.hedgeBump, bumpScale: 0.5, roughness: 0.8 });
    for (let i = 0; i < 6; i++) { const r = 0.32 + R() * 0.18; const g = displace(new IcosahedronGeometry(r, 3), r * 0.12, 40 + i); const m = new Mesh(g, box); m.position.set(4.2 + i * 1.25 + R() * 0.4, r * 0.85, -7.6 - R() * 1.2); m.castShadow = m.receiveShadow = true; S.add(m); }
    // гортензии
    const bloom = this.bloomMat = new MeshStandardMaterial({ color: 0xf6f1e4, roughness: 0.95 }); const leafy = new MeshStandardMaterial({ map: T.hedge, roughness: 0.9, color: 0x9fcf7a });
    const heads = new InstancedMesh(new SphereGeometry(0.11, 8, 6), bloom, 260); const d = new Object3D(); let hi = 0;
    for (let i = 0; i < 9; i++) { const cx = 4.5 + R() * 6.5, cz = -11.3 + R() * 2.4, h = 0.6 + R() * 0.4; const bush = new Mesh(displace(new IcosahedronGeometry(0.55, 2), 0.1, 60 + i), leafy); bush.position.set(cx, h * 0.6, cz); bush.scale.set(1, 0.9, 1); bush.castShadow = bush.receiveShadow = true; S.add(bush); for (let k = 0; k < 28 && hi < 260; k++) { const a = R() * 6.3, rr = R() * 0.5; d.position.set(cx + Math.cos(a) * rr, h + 0.25 + (R() - .5) * 0.3, cz + Math.sin(a) * rr); const s = 0.7 + R() * 0.7; d.scale.set(s, s * 0.8, s); d.updateMatrix(); heads.setMatrixAt(hi++, d.matrix); } }
    heads.count = hi; heads.castShadow = heads.receiveShadow = true; S.add(heads); this.heads = heads;
    // злаки
    const gm = new InstancedMesh(bladeGeometry(0.9, 0.025, 4), new MeshStandardMaterial({ color: 0xc7b36a, roughness: 0.9, side: DoubleSide }), 1200); let gi = 0;
    for (let i = 0; i < 8; i++) { const cx = 4 + R() * 7, cz = -8.2 - R() * 3; for (let k = 0; k < 150 && gi < 1200; k++) { const a = R() * 6.3, rr = R() * 0.25; d.position.set(cx + Math.cos(a) * rr, 0, cz + Math.sin(a) * rr); d.rotation.set((R() - .5) * 0.8, a, (R() - .5) * 0.8); const s = 0.6 + R() * 0.8; d.scale.set(1, s, 1); d.updateMatrix(); gm.setMatrixAt(gi++, d.matrix); } }
    gm.count = gi; gm.castShadow = true; S.add(gm);
  }

  buildEstate(far) {
    const S = this.scene, T = this.T;
    // партер
    const box = new MeshStandardMaterial({ map: T.hedge, bumpMap: T.hedgeBump, bumpScale: 0.4, roughness: 0.8 });
    for (let i = 0; i < 6; i++) for (const side of [-1, 1]) { const m = new Mesh(new BoxGeometry(2.2, 0.5, 0.5), box); m.position.set(side * (6 + (i % 2) * 2.8), 0.25, -14 - i * 3.2); m.castShadow = m.receiveShadow = true; S.add(m); }
    // зеркальный бассейн
    const pool = new Mesh(new PlaneGeometry(4, 14), new MeshPhysicalMaterial({ color: 0x3b5566, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.2 })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.02, -24); S.add(pool);
    const rim = new Mesh(new BoxGeometry(4.5, 0.12, 14.5), new MeshStandardMaterial({ color: 0xb9b3a4, roughness: 0.7 })); rim.position.set(0, -0.02, -24); S.add(rim);
    const inner = new Mesh(new PlaneGeometry(4, 14), new MeshBasicMaterial({ color: 0x1d2a33 })); inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.01, -24); S.add(inner);
  }

  buildRocks() {
    const S = this.scene, R = rng(88), stone = new MeshStandardMaterial({ color: 0x8c8a82, roughness: 0.9 });
    const patch = new Mesh(new PlaneGeometry(7, 5), new MeshStandardMaterial({ map: this.T.gravel, roughness: 1, color: 0xb9b6ad })); patch.rotation.x = -Math.PI / 2; patch.position.set(-3.5, 0.012, -9); patch.receiveShadow = true; S.add(patch);
    for (let i = 0; i < 7; i++) { const r = 0.35 + R() * 0.55; const m = new Mesh(displace(new IcosahedronGeometry(r, 2), r * 0.3, 90 + i), stone); m.position.set(-6 + R() * 5, r * 0.55, -7.5 - R() * 3.5); m.scale.set(1, 0.65, 1); m.rotation.y = R() * 6; m.castShadow = m.receiveShadow = true; S.add(m); }
    const needle = new InstancedMesh(new PlaneGeometry(0.8, 0.8), new MeshStandardMaterial({ map: this.T.pineNeedle, alphaTest: 0.4, side: DoubleSide, roughness: 0.9 }), 300); const d = new Object3D(); let i = 0;
    for (let k = 0; k < 4; k++) { const cx = -5.5 + R() * 4.5, cz = -8 - R() * 3; for (let j = 0; j < 70 && i < 300; j++) { const a = R() * 6.3, rr = R() * 0.5, y = R() * 0.8; d.position.set(cx + Math.cos(a) * rr * (1 - y * 0.6), y + 0.1, cz + Math.sin(a) * rr * (1 - y * 0.6)); d.rotation.set((R() - .5) * 2, R() * 6, (R() - .5) * 2); d.scale.setScalar(0.5 + R() * 0.5); d.updateMatrix(); needle.setMatrixAt(i++, d.matrix); } }
    needle.count = i; needle.castShadow = true; S.add(needle);
  }
  buildSprinklers() {
    const S = this.scene, R = rng(99);
    const mat = new MeshBasicMaterial({ color: 0xf4f8fb, transparent: true, opacity: 0.55, depthWrite: false });
    this.water = [];
    for (let k = 0; k < 4; k++) {
      const cx = -5 + k * 3.6, cz = -8 - (k % 2) * 4, g = new Group(); g.position.set(cx, 0.05, cz);
      for (let j = 0; j < 9; j++) { const geo = new BufferGeometry(); const pos = []; const a = (j / 9) * 1.4 - 0.3; for (let t = 0; t <= 1.001; t += 0.05) { const d = t * 3.2, h = Math.sin(t * Math.PI) * 0.9; pos.push(Math.cos(a) * d, h, Math.sin(a) * d); } geo.setAttribute('position', new Float32BufferAttribute(pos, 3)); const l = new Mesh(new CylinderGeometry(0.004, 0.012, 1, 3), mat); l.visible = false; g.add(l); const line = new Group(); line.userData.pos = pos; g.add(line); }
      S.add(g); this.water.push(g);
    }
    // капли как инстансы маленьких сфер вдоль дуг
    const drops = new InstancedMesh(new SphereGeometry(0.012, 4, 3), mat, 4000); const d = new Object3D(); let i = 0;
    for (const g of this.water) for (let j = 0; j < 9; j++) { const a = (j / 9) * 1.4 - 0.3; for (let t = 0; t < 1 && i < 4000; t += 0.009) { const dd = t * 3.2, h = Math.sin(t * Math.PI) * 0.9 + (R() - .5) * 0.06; d.position.set(g.position.x + Math.cos(a) * dd, h + 0.05, g.position.z + Math.sin(a) * dd); d.updateMatrix(); drops.setMatrixAt(i++, d.matrix); } }
    drops.count = i; S.add(drops);
  }
  buildDeck() {
    const S = this.scene, T = this.T;
    const wood = new MeshStandardMaterial({ map: T.wood, roughness: 0.8 }), dark = new MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8 });
    const deck = new Mesh(new BoxGeometry(6, 0.16, 4.5), wood); deck.position.set(-2.5, 0.08, -7.5); deck.castShadow = deck.receiveShadow = true; S.add(deck);
    for (const [x, z] of [[-5, -5.5], [0, -5.5], [-5, -9.5], [0, -9.5]]) { const p = new Mesh(new BoxGeometry(0.16, 2.6, 0.16), dark); p.position.set(x, 1.3, z); p.castShadow = true; S.add(p); }
    for (const z of [-5.5, -9.5]) { const b = new Mesh(new BoxGeometry(5.3, 0.14, 0.16), dark); b.position.set(-2.5, 2.6, z); b.castShadow = true; S.add(b); }
    for (let i = 0; i < 9; i++) { const r = new Mesh(new BoxGeometry(0.08, 0.12, 4.6), dark); r.position.set(-5 + i * 0.62, 2.7, -7.5); r.castShadow = true; S.add(r); }
    const bench = new Mesh(new BoxGeometry(3.2, 0.42, 0.6), wood); bench.position.set(-2.5, 0.37, -9.1); bench.castShadow = true; S.add(bench);
    const cushion = new Mesh(new BoxGeometry(3.0, 0.1, 0.55), new MeshStandardMaterial({ color: 0xd9cfbb, roughness: 1 })); cushion.position.set(-2.5, 0.63, -9.1); S.add(cushion);
    const bowl = new Mesh(new CylinderGeometry(0.42, 0.3, 0.3, 24), new MeshStandardMaterial({ color: 0x3b3835, roughness: 0.7, metalness: 0.3 })); bowl.position.set(-2.5, 0.31, -7.2); bowl.castShadow = true; S.add(bowl);
  }
  buildHouse() {
    const S = this.scene, T = this.T;
    const wall = new MeshStandardMaterial({ map: T.stucco, roughness: 0.9 });
    const h = new Mesh(new BoxGeometry(7, 6.2, 9), wall); h.position.set(-9.2, 3.1, -4.8); h.castShadow = h.receiveShadow = true; S.add(h);
    const roof = new Mesh(new BoxGeometry(7.6, 0.3, 9.6), new MeshStandardMaterial({ color: 0x3a3b38, roughness: 0.8 })); roof.position.set(-9.2, 6.3, -4.8); roof.castShadow = true; S.add(roof);
    const frame = new Mesh(new BoxGeometry(0.1, 3.0, 3.6), new MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.5, metalness: 0.5 })); frame.position.set(-5.68, 1.9, -4.8); S.add(frame);
    this.glass = new Mesh(new PlaneGeometry(3.3, 2.7), new MeshPhysicalMaterial({ color: 0x9fb2bf, roughness: 0.05, metalness: 0.6, emissive: 0xffc27a, emissiveIntensity: 0, envMapIntensity: 1.5 })); this.glass.rotation.y = Math.PI / 2; this.glass.position.set(-5.62, 1.9, -4.8); S.add(this.glass);
    this.winLight = new PointLight(0xffc27a, 0, 12, 1.6); this.winLight.position.set(-5.2, 2.2, -4.8); S.add(this.winLight);
  }

  buildMistAndClouds(far) {
    const S = this.scene, T = this.T, R = rng(77);
    this.mist = []; const mm = new MeshBasicMaterial({ map: T.mist, transparent: true, opacity: 0, depthWrite: false, color: 0xf3f1ea, blending: NormalBlending });
    for (let i = 0; i < (this.q.mobile ? 5 : 9); i++) { const m = new Mesh(new PlaneGeometry(26 + R() * 14, 7 + R() * 4), mm); m.rotation.x = -Math.PI / 2 + 0.08; m.position.set((R() - 0.5) * 30, 0.35 + R() * 0.9, -4 - R() * (far - 6)); m.userData.ph = R() * 6.3; S.add(m); this.mist.push(m); }
    this.mistMat = mm;
    this.clouds = []; const cm = new SpriteMaterial({ map: T.cloud, transparent: true, opacity: 0.7, depthWrite: false, color: 0xffffff, fog: false });
    for (let i = 0; i < 5; i++) { const s = new Sprite(cm); const sc = 50 + R() * 70; s.scale.set(sc, sc * 0.4, 1); s.position.set((R() - 0.5) * 420, 120 + R() * 50, -200 - R() * 140); S.add(s); this.clouds.push(s); }
    this.cloudMat = cm;
  }

  // --- время суток p∈[0,1]: рассвет → утро → золотой час → синий час ---
  setTime(p) {
    this.p = p = clamp(p, 0, 1);
    const night = smooth(p, 0.76, 0.93), mistF = 1 - smooth(p, 0.06, 0.36), golden = smooth(p, 0.5, 0.74) * (1 - smooth(p, 0.78, 0.9));
    const key = (ks) => { for (let i = 1; i < ks.length; i++) if (p <= ks[i][0]) { const [a, va] = ks[i - 1], [b, vb] = ks[i]; const t = (p - a) / (b - a); return lerp(va, vb, t * t * (3 - 2 * t)); } return ks[ks.length - 1][1]; };
    const elev = key([[0, 2.5], [0.2, 16], [0.45, 40], [0.72, 9], [0.85, -2], [1, -9]]), az = key([[0, 64], [0.45, 4], [0.72, -30], [1, -60]]);
    const e = elev * DEG, a = az * DEG;
    const dir = new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).normalize();
    const up = smooth(elev, -1, 10); // солнце над горизонтом
    const warm = 1 - smooth(elev, 2, 28);
    const sunCol = mixc(col('#fff4e2'), col('#ffb066'), warm);
    this.sun.color.copy(sunCol); this.sun.intensity = 3.6 * up * (1 - night * 0.85);
    this.sun.position.copy(dir).multiplyScalar(90).add(this.sunTarget.position);
    // небо
    const U = this.sky.material.uniforms;
    const zen = mixc(mixc(col('#a9b7c4'), col('#3f7fc0'), smooth(p, 0.05, 0.4) * (1 - smooth(p, 0.6, 0.86))), col('#0d1626'), night);
    const hor = mixc(mixc(mixc(col('#efe3d2'), col('#9dbfdc'), smooth(p, 0.1, 0.4)), col('#f3cf98'), golden), col('#23324a'), night);
    U.uZenith.value.copy(zen); U.uHorizon.value.copy(hor); U.uSunDir.value.copy(dir);
    U.uSunColor.value.copy(mixc(col('#fff5e4'), col('#ffa355'), warm)).multiplyScalar(1 - night * 0.9);
    U.uGlow.value = 1.3 - night; U.uNight.value = night; U.uHaze.value = 0.15 + mistF * 0.55 + golden * 0.2;
    U.uGround.value.copy(mixc(col('#50603a'), col('#121a14'), night)); U.uGain.value = lerp(1.15 + mistF * 0.25, 0.9, night);
    // туман
    this.scene.fog.color.copy(hor.clone().multiplyScalar(1.25).lerp(col('#1a2433'), night));
    this.scene.fog.density = 0.003 + mistF * 0.016 + night * 0.004;
    // полусфера и ночной свет
    this.hemi.color.copy(zen.clone().lerp(col('#ffffff'), 0.35 * (1 - night))); this.hemi.groundColor.copy(mixc(col('#4e6136'), col('#0b100b'), night)); this.hemi.intensity = lerp(1.8, 1.25, up) * (1 - night * 0.75) + 0.08;
    this.amb.intensity = night * 0.35;
    // фонари, подсветка, окно
    const lampI = smooth(p, 0.78, 0.9);
    for (const l of this.lamps) { l.light.intensity = lampI * (this.q.mobile ? 4 : 6); l.glow.material.emissiveIntensity = lampI * 4; }
    for (const s of this.uplights) s.intensity = smooth(p, 0.82, 0.95) * 90;
    const winI = smooth(p, 0.84, 0.97);
    this.glass.material.emissiveIntensity = winI * 1.6; this.winLight.intensity = winI * 14;
    // туман-полосы и облака
    this.mistMat.opacity = mistF * 0.32; this.mistMat.color.copy(hor);
    this.cloudMat.opacity = 0.12 + up * 0.3 - night * 0.4; this.cloudMat.color.copy(mixc(mixc(col('#ffffff'), col('#ffd9a8'), golden), col('#2a3447'), night));
    // экспозиция и bloom
    this.renderer.toneMappingExposure = lerp(1.3, 0.95, night) * lerp(1.12, 1.08, up);
    if (this.bloom) { this.bloom.strength = night * 0.9 + golden * 0.15; this.bloom.threshold = lerp(0.9, 0.75, night); }
    this.uSway.value = 0.02 + 0.02 * up;
    // окружение для отражений (стекло, бассейн)
    if (this.pmrem && (this.lastEnv === undefined || Math.abs(p - this.lastEnv) > 0.07)) { this.lastEnv = p; if (this.scene.environment) this.scene.environment.dispose(); this.scene.environment = this.pmrem.fromScene(this.envScene, 0.04).texture; }
  }

  setSeason(s) {
    this.season = s; const T = this.T;
    const L = this.leafMat;
    if (s === 'spring') { L.map = T.birchLeafSpring; L.visible = true; this.lawnMat.color.set(0xd8ffb0); if (this.heads) this.heads.visible = false; }
    else if (s === 'autumn') { L.map = T.birchLeafAutumn; L.visible = true; this.lawnMat.color.set(0xf0e8a8); if (this.heads) { this.heads.visible = true; this.bloomMat.color.set(0xd8bfa8); } }
    else if (s === 'winter') { L.visible = false; this.lawnMat.map = T.snow; this.lawnMat.color.set(0xffffff); this.grass.visible = false; if (this.heads) this.heads.visible = false; }
    else { L.map = T.birchLeaf; L.visible = true; this.lawnMat.map = T.lawn; this.lawnMat.color.set(0xffffff); this.grass.visible = true; if (this.heads) { this.heads.visible = true; this.bloomMat.color.set(0xf4f1e6); } }
    L.needsUpdate = true; this.lawnMat.needsUpdate = true;
  }
  setOvergrown(on) {
    this.lawnMat.color.set(on ? 0xcfc47a : 0xffffff); this.grass.scale.set(1, on ? 2.4 : 1, 1); this.uSway.value = on ? 0.06 : 0.03;
    if (this.hedge) this.hedge.scale.set(1, on ? 1.12 : 1, on ? 1.25 : 1);
  }

  // --- кадр ---
  resize(w, h, dpr) {
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
    const aspect = w / h; this.camera.aspect = aspect;
    const hfov = aspect < 1 ? 58 : 66; let vfov = 2 * Math.atan(Math.tan(hfov / 2 * DEG) / aspect) / DEG; vfov = clamp(vfov, 36, 84); this.camera.fov = vfov;
    this.camera.lookAt(this.look); this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(w, h);
  }
  render(t) {
    this.time = t; this.uTime.value = t;
    for (const m of this.mist) m.position.x += Math.sin(t * 0.08 + m.userData.ph) * 0.004;
    for (const c of this.clouds) c.position.x += 0.012;
    if (this.composer && this.bloom && this.bloom.strength > 0.01) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.renderer.dispose(); if (this.pmrem) this.pmrem.dispose(); }
}

// ---------- монтаж в хиро: нативный скролл, p из закреплённой секции ----------
export function mount(root, opts = {}) {
  const stage = root.querySelector('.ve-hero__stage'), canvas = root.querySelector('canvas');
  const onProgress = opts.onProgress || (() => {});
  const G = new GardenScene(canvas, { quality: opts.quality });
  let W = 0, H = 0, dead = false, visible = true, lastP = -1, raf = 0, t0 = performance.now(), frames = 0, slow = 0, tick = 0;
  function size() {
    const r = stage.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
    if (w === W && h === H) return false; W = w; H = h; G.resize(w, h, Math.min(devicePixelRatio || 1, G.q.dpr)); return true;
  }
  function progress() { const r = root.getBoundingClientRect(), vh = innerHeight || 1, tr = r.height - vh; return tr <= 0 ? 0 : clamp(-r.top / tr, 0, 1); }
  let cur = 0, holdP = null;
  function loop(now) {
    raf = 0; if (dead) return;
    if ((++tick % 20) === 0) size();
    const p = holdP == null ? progress() : holdP; if (p !== lastP) { lastP = p; onProgress(p); }
    const dtS = Math.min(0.1, (now - (loop.last || now)) / 1000);
    cur += (p - cur) * (1 - Math.exp(-dtS * 10)); if (Math.abs(p - cur) < 0.0005) cur = p;
    G.setTime(cur);
    const t = (now - t0) / 1000;
    if (G.q.mobile && (frames & 1)) { /* 30 fps на телефоне */ } else G.render(t);
    frames++;
    if (!root.classList.contains('is-live')) root.classList.add('is-live');
    // адаптивное качество: если кадры тяжёлые — снижаем dpr и bloom
    const dt = now - (loop.last || now); loop.last = now;
    if (dt > 40) { if (++slow > 40 && !loop.degraded) { loop.degraded = true; G.q.dpr = 1; G.q.bloom = false; G.composer = null; W = 0; size(); } } else slow = Math.max(0, slow - 1);
    visible = inView();
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function inView() { const r = root.getBoundingClientRect(); return r.bottom > 0 && r.top < (innerHeight || 1); }
  function wake() { visible = inView(); if (!raf && !dead && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  size(); wake();
  const io = null;
  const onScroll = () => wake();
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', () => { size(); wake(); }, { passive: true }); document.addEventListener('visibilitychange', wake);
  let ro = null; if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { if (size()) wake(); }); ro.observe(stage); }
  return { scene: G, hold(p) { holdP = p; cur = p == null ? cur : p; wake(); }, destroy() { dead = true; removeEventListener('scroll', onScroll); if (ro) ro.disconnect(); if (io) io.disconnect(); G.dispose(); } };
}
