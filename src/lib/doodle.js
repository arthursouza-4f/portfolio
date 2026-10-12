import { svgEl, rng } from './svg.js';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------
 * "Boil": o tremidinho de animação feita à mão. Cada filtro tem um
 * feTurbulence cuja semente troca ~8x por segundo, como se cada quadro
 * tivesse sido redesenhado. Só ferve o que está visível na tela.
 * ------------------------------------------------------------------ */

const boilers = new Set();
const SEEDS = [3, 11, 23];
let frame = 0;
let timer = 0;

const visibility = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      for (const boiler of boilers) if (boiler.root === entry.target) boiler.visible = entry.isIntersecting;
    }
  },
  { rootMargin: '80px' },
);

function startClock() {
  if (timer || reducedMotion) return;
  timer = window.setInterval(() => {
    if (document.hidden) return;
    frame = (frame + 1) % SEEDS.length;
    for (const boiler of boilers) {
      if (!boiler.visible || boiler.paused) continue;
      for (const node of boiler.nodes) node.setAttribute('seed', SEEDS[frame] + node._seedOffset);
    }
  }, 125);
}

/** Registra os nós de turbulência de um SVG para "ferver". Devolve um controle para pausar. */
export function boil(root, nodes) {
  nodes.forEach((node, i) => (node._seedOffset = i * 5));
  const boiler = { root, nodes, visible: true, paused: false };
  boilers.add(boiler);
  visibility.observe(root);
  startClock();
  return boiler;
}

/* ------------------------------------------------------------------
 * Filtro "doodle": sombra de grafite granulada na borda oposta à luz
 * (como as ilustrações da Amplemarket) + tremido de traço.
 * `unit` = quantos px na tela vale 1 unidade do SVG, para o grão e o
 * tremido terem o mesmo tamanho em qualquer desenho.
 * ------------------------------------------------------------------ */
export function doodleFilter(
  defs,
  id,
  {
    unit = 1,
    shade = true,
    shadeColor = '#151515',
    rim = 5,
    soft = 2.2,
    density = 1,
    wobble = 2.2,
    boilFreq = 0.024,
    region = null,
  } = {},
) {
  const filter = svgEl(
    'filter',
    region
      ? { id, filterUnits: 'userSpaceOnUse', ...region, 'color-interpolation-filters': 'sRGB' }
      : { id, x: '-15%', y: '-15%', width: '130%', height: '130%', 'color-interpolation-filters': 'sRGB' },
    defs,
  );

  // nós cujos atributos dependem do tamanho na tela
  const scaled = [];
  const px = (el, attr, value, kind = 'length') => scaled.push({ el, attr, value, kind });

  let source = 'SourceGraphic';
  if (shade) {
    const shift = svgEl('feOffset', { in: 'SourceAlpha', result: 'shift' }, filter);
    px(shift, 'dx', -rim);
    px(shift, 'dy', -rim * 0.8);
    svgEl('feComposite', { in: 'SourceAlpha', in2: 'shift', operator: 'out', result: 'rim' }, filter);
    px(svgEl('feGaussianBlur', { in: 'rim', result: 'rimSoft' }, filter), 'stdDeviation', soft);
    svgEl('feComposite', { in: 'rimSoft', in2: 'SourceAlpha', operator: 'in', result: 'rimIn' }, filter);
    const grain = svgEl('feTurbulence', { type: 'fractalNoise', numOctaves: 2, seed: 9, result: 'grain' }, filter);
    px(grain, 'baseFrequency', 0.85, 'frequency');
    // limiar móvel: quanto mais perto da borda, mais pontinhos passam
    const k = 6.5;
    svgEl(
      'feComposite',
      { in: 'rimIn', in2: 'grain', operator: 'arithmetic', k1: 0, k2: k * density, k3: k, k4: -k * 1.08, result: 'speck' },
      filter,
    );
    svgEl('feFlood', { 'flood-color': shadeColor, result: 'ink' }, filter);
    svgEl('feComposite', { in: 'ink', in2: 'speck', operator: 'in', result: 'shade' }, filter);
    const merge = svgEl('feMerge', { result: 'shaded' }, filter);
    svgEl('feMergeNode', { in: 'SourceGraphic' }, merge);
    svgEl('feMergeNode', { in: 'shade' }, merge);
    source = 'shaded';
  }

  let turbulence = null;
  if (wobble > 0) {
    turbulence = svgEl(
      'feTurbulence',
      { type: 'fractalNoise', numOctaves: 2, seed: SEEDS[0], result: 'wobble' },
      filter,
    );
    px(turbulence, 'baseFrequency', boilFreq, 'frequency');
    const displace = svgEl(
      'feDisplacementMap',
      { in: source, in2: 'wobble', xChannelSelector: 'R', yChannelSelector: 'G' },
      filter,
    );
    px(displace, 'scale', wobble);
  }

  /** Recalcula grão e tremido quando o desenho muda de tamanho na tela. */
  function setUnit(next) {
    for (const { el, attr, value, kind } of scaled) {
      el.setAttribute(attr, kind === 'frequency' ? value * next : value / next);
    }
  }
  setUnit(unit);

  return { filter, turbulence, setUnit };
}

/* ------------------------------------------------------------------
 * Retícula pontilhada (estilo risografia), gerada uma vez em canvas.
 * ------------------------------------------------------------------ */

const DPR = Math.min(2, window.devicePixelRatio || 1);

/** Ladrilho que se repete sem emenda, para usar em <pattern>. */
export function stippleTile({ size = 96, density = 0.12, color = '#151515', seed = 1, dot = [0.45, 1] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.round(size * DPR);
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.fillStyle = color;
  const rand = rng(seed);
  const count = Math.round(size * size * density);
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = dot[0] + rand() * (dot[1] - dot[0]);
    ctx.globalAlpha = 0.55 + rand() * 0.45;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = x + ox;
        const py = y + oy;
        if (px < -2 || py < -2 || px > size + 2 || py > size + 2) continue;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return canvas.toDataURL();
}

/** Faixa pontilhada que vai sumindo para baixo (a "sombra" sob a linha da praia/mar). */
export function stippleFade({
  width,
  height,
  color,
  seed = 1,
  density = 0.2,
  power = 1.7,
  dot = [0.45, 1.05],
  fadeLeft = 0,
  fadeRight = 0,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * DPR));
  canvas.height = Math.max(1, Math.round(height * DPR));
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.fillStyle = color;
  const rand = rng(seed);
  const attempts = Math.round(width * height * density);
  for (let i = 0; i < attempts; i++) {
    const y = rand() * height;
    if (rand() > Math.pow(1 - y / height, power)) continue;
    const x = rand() * width;
    const edge = Math.min(fadeLeft ? x / fadeLeft : 1, fadeRight ? (width - x) / fadeRight : 1);
    if (edge < 1 && rand() > edge) continue;
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, dot[0] + rand() * (dot[1] - dot[0]), 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL();
}

export function stipplePattern(defs, id, options) {
  const size = options.size ?? 96;
  const pattern = svgEl('pattern', { id, patternUnits: 'userSpaceOnUse', width: size, height: size }, defs);
  svgEl('image', { href: stippleTile(options), width: size, height: size }, pattern);
  return pattern;
}
