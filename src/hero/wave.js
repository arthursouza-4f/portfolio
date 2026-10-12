import { svgEl, smoothPath, sampleSpline, pointAt, r2, rng, lerp, clamp } from '../lib/svg.js';
import { createSurfer } from './surfer.js';

/*
 * A onda vista de lado, quebrando para a esquerda (para a praia).
 * Coordenadas de projeto: o nível do mar é y = 540; a borda direita
 * da tela fica em x = 620. Tudo é recalculado a cada quadro a partir
 * de pontos-chave, então a crista "respira" e a onda cresce na intro.
 */

export const SEA_LEVEL = 540;
export const DESIGN_RIGHT = 620;
export const DESIGN_TOP = 34;

const FACE = [
  [30, 540],
  [80, 538],
  [150, 522],
  [225, 490],
  [282, 440],
  [322, 378],
  [346, 306],
  [356, 236],
  [352, 178],
];
const UNDER = [
  [334, 138],
  [300, 112],
  [258, 104],
  [222, 116],
  [198, 140],
  [190, 168],
];
const TOP = [
  [174, 162],
  [167, 132],
  [178, 96],
  [206, 66],
  [250, 44],
  [304, 34],
];
const BACK = [
  [366, 40],
  [440, 66],
  [530, 116],
  [620, 168],
  [720, 214],
];

// quanto cada ponto da crista se mexe quando a onda "joga" o lábio
const LIP_WEIGHT = [0.15, 0.4, 0.7, 0.9, 1, 1, 1, 0.95, 0.8, 0.6, 0.35, 0.15];


/**
 * As camadas ficam separadas (fundo, surfista, frente) para cada uma
 * receber o seu filtro: a onda só treme, o surfista também ganha sombra.
 */
export function createWave({ back, mid, front, defs, idPrefix = 'wave' }) {
  const root = back;

  // degradês que decidem onde o pontilhado aparece (mais escuro no fundo do tubo e embaixo)
  const barrelGrad = svgEl('radialGradient', { id: `${idPrefix}-barrel-grad`, gradientUnits: 'userSpaceOnUse', cx: 345, cy: 215, r: 175 }, defs);
  svgEl('stop', { offset: 0, 'stop-color': '#fff' }, barrelGrad);
  svgEl('stop', { offset: 0.55, 'stop-color': '#fff', 'stop-opacity': 0.75 }, barrelGrad);
  svgEl('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0.05 }, barrelGrad);
  const barrelMask = svgEl('mask', { id: `${idPrefix}-barrel-mask`, maskUnits: 'userSpaceOnUse', x: -100, y: -100, width: 900, height: 800 }, defs);
  svgEl('rect', { x: -100, y: -100, width: 900, height: 800, fill: `url(#${idPrefix}-barrel-grad)` }, barrelMask);

  const depthGrad = svgEl('linearGradient', { id: `${idPrefix}-depth-grad`, gradientUnits: 'userSpaceOnUse', x1: 0, y1: SEA_LEVEL, x2: 0, y2: SEA_LEVEL - 330 }, defs);
  svgEl('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.95 }, depthGrad);
  svgEl('stop', { offset: 0.45, 'stop-color': '#fff', 'stop-opacity': 0.35 }, depthGrad);
  svgEl('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, depthGrad);
  const depthMask = svgEl('mask', { id: `${idPrefix}-depth-mask`, maskUnits: 'userSpaceOnUse', x: -100, y: -100, width: 900, height: 800 }, defs);
  svgEl('rect', { x: -100, y: -100, width: 900, height: 800, fill: `url(#${idPrefix}-depth-grad)` }, depthMask);

  // tubo (o "lado de dentro" da curva)
  const barrelTint = svgEl('path', { fill: '#c9dcf8' }, root);
  const barrelDots = svgEl('path', { fill: `url(#${idPrefix}-dots-dense)`, mask: `url(#${idPrefix}-barrel-mask)` }, root);

  // corpo da onda
  const clip = svgEl('clipPath', { id: `${idPrefix}-body-clip` }, defs);
  const clipPathEl = svgEl('path', {}, clip);
  const body = svgEl('path', { fill: 'var(--sea-light)', stroke: 'none' }, root);
  const inner = svgEl('g', { 'clip-path': `url(#${idPrefix}-body-clip)` }, root);
  svgEl('rect', { x: -100, y: -40, width: 900, height: 620, fill: `url(#${idPrefix}-dots-mid)`, mask: `url(#${idPrefix}-depth-mask)` }, inner);
  const streaks = [0, 1, 2, 3].map((i) =>
    svgEl(
      'path',
      {
        fill: 'none',
        stroke: 'var(--sea)',
        'stroke-width': 1.8 - i * 0.2,
        'stroke-linecap': 'round',
        'stroke-dasharray': `${46 - i * 6} ${30 + i * 10}`,
        opacity: 0.75 - i * 0.12,
      },
      inner,
    ),
  );
  const backLines = [0, 1].map(() =>
    svgEl('path', { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.6 }, inner),
  );
  const outline = svgEl(
    'path',
    { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 2.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
    root,
  );

  // água caindo do lábio (a "cortina" que fecha o tubo)
  const curtain = [0, 1, 2].map((i) =>
    svgEl(
      'path',
      {
        fill: 'none',
        stroke: 'var(--sea)',
        'stroke-width': 2.2 - i * 0.4,
        'stroke-linecap': 'round',
        'stroke-dasharray': i ? '10 16' : '26 12',
        opacity: 1 - i * 0.25,
      },
      root,
    ),
  );

  const surfer = createSurfer(mid);

  // espuma e "garras" na ponta do lábio
  const foam = svgEl('path', { fill: '#fff', stroke: 'var(--sea)', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, front);
  const claws = svgEl(
    'path',
    { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 2.2, 'stroke-linecap': 'round' },
    front,
  );

  // gotinhas (spray da prancha + spray da crista)
  const sprayLayer = svgEl('g', { fill: '#fff', stroke: 'var(--sea)', 'stroke-width': 1.6 }, front);
  const pool = Array.from({ length: 46 }, () => svgEl('circle', { r: 0, opacity: 0 }, sprayLayer));
  const drops = [];
  const rand = rng(42);
  let lastTail = null;

  function spawn(x, y, vx, vy, r, life) {
    if (drops.length >= pool.length) return;
    drops.push({ x, y, vx, vy, r, life, age: 0 });
  }

  /** Monta o contorno da onda para um instante. */
  function shape(t, grow) {
    const throwAmt = Math.sin(t * 1.05) * 0.5 + 0.5; // 0..1
    const lip = [...UNDER, ...TOP].map(([x, y], i) => {
      const w = LIP_WEIGHT[i] ?? 0;
      return [x - throwAmt * 12 * w, y + throwAmt * 7 * w - Math.sin(t * 2.1 + i) * 1.2 * w];
    });
    const lift = (p) => [p[0], SEA_LEVEL - (SEA_LEVEL - p[1]) * grow];
    const curl = (p, i) => {
      // na intro o lábio nasce "para dentro" e vai se jogando para frente
      const k = 1 - grow;
      return [p[0] + k * (110 - i * 4), p[1]];
    };
    const face = FACE.map(lift);
    const lipPts = lip.map(lift).map(curl);
    const back = BACK.map((p, i) => lift([p[0], p[1] + Math.sin(t * 1.3 + i * 0.8) * 2]));
    return { face, under: lipPts.slice(0, UNDER.length), top: lipPts.slice(UNDER.length), back, throwAmt };
  }

  function update(t, dt, { grow = 1, surferIn = 1 } = {}) {
    const g = Math.max(0.001, grow);
    const { face, under, top, back } = shape(t, g);
    const silhouette = [...face, ...under, ...top, ...back];
    const d = smoothPath(silhouette) + `L720 ${SEA_LEVEL + 1}L-60 ${SEA_LEVEL + 1}Z`;
    body.setAttribute('d', d);
    clipPathEl.setAttribute('d', d);
    outline.setAttribute('d', smoothPath(silhouette.slice(1)));

    // tubo: da face até a ponta do lábio, fechando com a "cortina" que cai
    const tip = under[under.length - 1];
    const fall = [
      [tip[0] + 8, tip[1] + 40 * g],
      [lerp(tip[0], face[6][0], 0.45), lerp(tip[1], face[6][1], 0.75) + 6],
    ];
    const barrel = smoothPath([face[5], face[6], face[7], face[8], ...under, ...fall], { closed: true });
    curtain.forEach((c, i) => {
      const k = i * 11;
      const pts = [
        [tip[0] + 2 + k * 0.6, tip[1] - 4],
        [fall[0][0] + k, fall[0][1] + k * 0.3],
        [fall[1][0] + k * 0.8, fall[1][1] - k * 0.6],
        [lerp(fall[1][0], face[5][0], 0.6) + k * 0.4, lerp(fall[1][1], face[5][1], 0.6) - k],
      ];
      c.setAttribute('d', smoothPath(pts));
      c.setAttribute('stroke-dashoffset', r2(-t * (46 + i * 10)));
      c.setAttribute('opacity', r2(clamp((g - 0.5) / 0.5) * (1 - i * 0.25)));
    });
    barrelTint.setAttribute('d', barrel);
    barrelDots.setAttribute('d', barrel);

    // riscos na face, correndo para cima (a água subindo a parede)
    streaks.forEach((s, i) => {
      const off = 26 + i * 22;
      const pts = face.slice(2, 8).map(([x, y], j) => [x + off * (0.9 + j * 0.05), y + off * 0.25 + i * 6]);
      s.setAttribute('d', smoothPath(pts));
      s.setAttribute('stroke-dashoffset', r2(t * (38 + i * 7)));
    });
    backLines.forEach((s, i) => {
      const pts = back.slice(0, 4).map(([x, y], j) => [x + 10 - i * 18, y + 30 + i * 26 + j * 4]);
      s.setAttribute('d', smoothPath(pts));
    });

    // espuma: bolotas brancas ao longo da ponta e do topo do lábio
    const foamCurve = sampleSpline([under[3], under[4], under[5], ...top.slice(0, 5)], 10);
    const n = 15;
    let foamD = '';
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const p = pointAt(foamCurve, i / n);
      const nx = p.ty;
      const ny = -p.tx;
      const bump = (7 + Math.sin(i * 1.7 + t * 3) * 2.2) * (i === 0 || i === n ? 0.3 : 1);
      const q = [p.x + nx * bump, p.y + ny * bump];
      if (!prev) foamD += `M${r2(p.x)} ${r2(p.y)}L${r2(q[0])} ${r2(q[1])}`;
      else {
        const c = [(prev[0] + q[0]) / 2 + nx * 7, (prev[1] + q[1]) / 2 + ny * 7];
        foamD += `Q${r2(c[0])} ${r2(c[1])} ${r2(q[0])} ${r2(q[1])}`;
      }
      prev = q;
    }
    // volta por dentro para fechar a espuma
    for (let i = n; i >= 0; i--) {
      const p = pointAt(foamCurve, i / n);
      foamD += `L${r2(p.x - p.ty * 2)} ${r2(p.y + p.tx * 2)}`;
    }
    foam.setAttribute('d', foamD + 'Z');
    foam.setAttribute('opacity', r2(clamp((g - 0.25) / 0.4)));

    // garras: ganchinhos pendurados na ponta
    let clawD = '';
    for (let i = 0; i < 3; i++) {
      const base = pointAt(foamCurve, 0.28 + i * 0.09);
      const len = 12 + i * 3 + Math.sin(t * 4 + i) * 2;
      const bx = base.x - 6;
      const by = base.y + 4;
      clawD += `M${r2(bx)} ${r2(by)}q${-len * 0.55} ${len * 0.35} ${-len * 0.5} ${len}q${len * 0.08} ${len * 0.22} ${len * 0.32} ${len * 0.06}`;
    }
    claws.setAttribute('d', clawD);
    claws.setAttribute('opacity', clamp((g - 0.6) / 0.4));

    // surfista descendo e subindo a face
    const faceCurve = sampleSpline(face.slice(1, 8), 14);
    const ride = 0.5 + 0.2 * Math.sin(t * 0.85) + 0.05 * Math.sin(t * 2.1);
    const p = pointAt(faceCurve, ride);
    const normal = [p.ty, -p.tx]; // para fora da água
    let angle = Math.atan2(p.ty, p.tx);
    angle = clamp(angle, (-52 * Math.PI) / 180, (-10 * Math.PI) / 180);
    const climbing = Math.cos(t * 0.85); // >0 subindo
    angle += climbing * 0.12;
    const drop = (1 - surferIn) * -220;
    const pose = surfer.update({
      x: p.x + normal[0] * 9 + (1 - surferIn) * 40,
      y: p.y + normal[1] * 9 + drop,
      scale: 1.3,
      angle,
      crouch: 0.35 + 0.3 * (1 - Math.abs(climbing)) + (1 - surferIn) * 0.4,
      lean: climbing * 0.4,
      t,
      opacity: surferIn > 0.01 ? 1 : 0,
    });

    // spray da rabeta, mais forte na virada lá em cima
    if (surferIn > 0.9) {
      const tail = pose.tail;
      const power = 0.4 + Math.max(0, -climbing) * 0.4 + (Math.abs(climbing) < 0.35 ? 1.2 : 0);
      if (rand() < power * dt * 30) {
        spawn(
          tail[0] + rand() * 6,
          tail[1] - rand() * 4,
          (pose.d[0] * 0.6 + pose.n[0] * 0.8) * (90 + rand() * 90),
          (pose.d[1] * 0.6 + pose.n[1] * 0.8) * (90 + rand() * 90) - 40,
          1.6 + rand() * 2.6,
          0.5 + rand() * 0.5,
        );
      }
      lastTail = tail;
    }
    // spray da crista soprado para trás pelo vento
    if (g > 0.85 && rand() < dt * 9) {
      const c = top[3 + Math.floor(rand() * 3)];
      spawn(c[0] + rand() * 30, c[1] - 6, 40 + rand() * 70, -30 - rand() * 40, 1.2 + rand() * 2, 0.7 + rand() * 0.6);
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const dr = drops[i];
      dr.age += dt;
      dr.vy += 240 * dt;
      dr.x += dr.vx * dt;
      dr.y += dr.vy * dt;
      if (dr.age > dr.life) drops.splice(i, 1);
    }
    pool.forEach((c, i) => {
      const dr = drops[i];
      if (!dr) {
        c.setAttribute('opacity', 0);
        return;
      }
      const k = 1 - dr.age / dr.life;
      c.setAttribute('cx', r2(dr.x));
      c.setAttribute('cy', r2(dr.y));
      c.setAttribute('r', r2(dr.r * (0.5 + k * 0.5)));
      c.setAttribute('opacity', r2(Math.min(1, k * 1.6)));
    });

    return { surfer: [p.x, p.y], tail: lastTail };
  }

  return { update };
}
