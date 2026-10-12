import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { svgEl, pointAt, r2, clamp } from '../lib/svg.js';
import { createTile, pencilText } from '../lib/tile.js';
import { frameLoop } from '../lib/loop.js';
import { linhas, estacoes } from '../data/trilhos.js';

gsap.registerPlugin(DrawSVGPlugin);

/*
 * TrainView SP: um trem branco de faixa vermelha passa nos trilhos. Quando
 * ele sai, as linhas de Metrô e trem de São Paulo (traçado real, ver
 * scripts/build-trilhos.mjs) crescem e cobrem o ladrilho, e trenzinhos
 * ficam rodando em cada linha.
 */

const INK = 'var(--ink)';
const RED = '#e51f48';
const ROOF = 54;
const FLOOR = 83;
const RAILS = [86.8, 89.8];
const CAR = 60;
const GAP = 2.4;
const CARS = 3;
const LENGTH = CARS * CAR + (CARS - 1) * GAP;
// janelas e portas de cada carro, a partir da traseira: [x, largura, porta?]
const SIDE = [
  [4, 7],
  [14, 6, true],
  [23, 7],
  [32, 7],
  [42, 6, true],
  [50.5, 7],
];
// trenzinhos do mapa: velocidade (unidades/s) e quantos por linha
const SPEED = 7.5;

/** Polilinha plana [x0, y0, x1, y1, …] → pontos + comprimentos (para andar nela). */
function track(flat) {
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lengths, total: lengths[lengths.length - 1] };
}

const polyline = (flat) => {
  let d = `M${flat[0]} ${flat[1]}`;
  for (let i = 2; i < flat.length; i += 2) d += `L${flat[i]} ${flat[i + 1]}`;
  return d;
};

function car(parent, i) {
  const g = svgEl('g', { transform: `translate(${-i * (CAR + GAP)} 0)` }, parent);
  const x0 = -CAR;
  const outline = { stroke: INK, 'stroke-width': 0.9, 'stroke-linejoin': 'round' };
  // carro da frente tem o bico arredondado; os outros são retos
  const body =
    i === 0
      ? `M${x0} ${ROOF}H-17C-7 ${ROOF} -1.4 ${ROOF + 8} -0.5 ${ROOF + 17}L0 ${FLOOR}H${x0}Z`
      : `M${x0 + 2.5} ${ROOF}H-2.5Q0 ${ROOF} 0 ${ROOF + 2.5}V${FLOOR}H${x0}V${ROOF + 2.5}Q${x0} ${ROOF} ${x0 + 2.5} ${ROOF}Z`;
  svgEl('rect', { x: x0 + 18, y: ROOF - 2, width: 14, height: 2.2, rx: 0.8, fill: '#fff', ...outline, 'stroke-width': 0.7 }, g);
  svgEl('path', { d: body, fill: '#fff', ...outline }, g);
  svgEl('rect', { x: x0 + 0.6, y: 72, width: CAR - (i === 0 ? 1.2 : 1.2), height: 3, fill: RED }, g);
  for (const [x, w, door] of SIDE) {
    if (i === 0 && x > 40) continue; // o bico fica livre
    if (door) svgEl('rect', { x: x0 + x, y: ROOF + 3.4, width: w, height: FLOOR - ROOF - 4.6, rx: 0.8, fill: 'none', ...outline, 'stroke-width': 0.6 }, g);
    svgEl('rect', { x: x0 + x + (door ? 1.2 : 0), y: 58.6, width: door ? w - 2.4 : w, height: 8.4, rx: 1.2, fill: '#cfe0f2', ...outline, 'stroke-width': 0.65 }, g);
  }
  if (i === 0) {
    svgEl('path', { d: 'M-15.6 57.6H-8.6C-5.8 57.6 -3.7 61 -2.9 66.4H-15.6Z', fill: '#cfe0f2', ...outline, 'stroke-width': 0.7 }, g);
    svgEl('circle', { cx: -2.6, cy: 79, r: 1.1, fill: '#ffd447', stroke: INK, 'stroke-width': 0.5 }, g);
  }
  // truques com as rodas
  for (const bx of [x0 + 11, -11]) {
    svgEl('rect', { x: bx - 6.5, y: FLOOR - 0.4, width: 13, height: 2.2, rx: 1, fill: INK }, g);
    for (const dx of [-3.6, 3.6]) svgEl('circle', { cx: bx + dx, cy: 84.6, r: 2.2, fill: '#fff', ...outline, 'stroke-width': 0.7 }, g);
  }
  if (i > 0) svgEl('rect', { x: 0, y: 76, width: GAP, height: 2.6, fill: INK }, g);
  return g;
}

export function createTrainView() {
  const tile = createTile('trainview', { label: 'Trem passando e as linhas de Metrô e trem de São Paulo', seed: 69 });
  const { svg, clipId } = tile;

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);

  // ---------- mapa: linhas reais, integrações e trenzinhos ----------
  const map = svgEl('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: tile.lineFilter }, content);
  const strokes = [];
  const tracks = [];
  for (const linha of linhas) {
    const pieces = linha.pecas.map((flat) => {
      const d = polyline(flat);
      // contorno do papel por baixo: onde as linhas se cruzam fica um respiro, como nos mapas
      const casing = svgEl('path', { d, stroke: 'var(--paper-hi)', 'stroke-width': linha.largura + 1.3 }, map);
      const line = svgEl('path', { d, stroke: linha.cor, 'stroke-width': linha.largura }, map);
      return { casing, line, track: track(flat) };
    });
    strokes.push(...pieces.map((p) => [p.casing, p.line]));
    const main = pieces.reduce((a, b) => (b.track.total > a.track.total ? b : a));
    tracks.push({ linha, track: main.track });
  }
  const stations = estacoes.map(([x, y]) =>
    svgEl('circle', { cx: x, cy: y, r: 1.3, fill: '#fff', stroke: INK, 'stroke-width': 0.6 }, content),
  );
  const minis = svgEl('g', {}, content);
  const trains = [];
  tracks.forEach(({ linha, track: t }, i) => {
    // uma ida e uma volta por linha (as compridas ganham mais um)
    const count = t.total > 90 ? 3 : 2;
    for (let k = 0; k < count; k++) {
      const el = svgEl('rect', { x: -2.4, y: -1.35, width: 4.8, height: 2.7, rx: 1.35, fill: '#fff', stroke: linha.cor === '#a3a6ab' ? INK : linha.cor, 'stroke-width': 0.85 }, minis);
      trains.push({ el, track: t, dir: k % 2 ? -1 : 1, u0: ((i * 0.37 + k / count) % 1), speed: SPEED * (0.85 + ((i * 7) % 5) * 0.08) });
    }
  });

  // ---------- trilho + trem passando ----------
  const rails = svgEl('g', { fill: 'none', stroke: INK, 'stroke-linecap': 'round', filter: tile.lineFilter }, content);
  const railLines = RAILS.map((y) => svgEl('path', { d: `M-2 ${y}C30 ${y - 0.3} 70 ${y + 0.3} 102 ${y}`, 'stroke-width': 0.9 }, rails));
  const sleepers = svgEl('g', { 'stroke-width': 0.6, opacity: 0.6 }, rails);
  for (let x = 2; x < 100; x += 6) svgEl('path', { d: `M${x + 0.5} ${RAILS[0] + 0.6}L${x - 0.5} ${RAILS[1] + 1.6}` }, sleepers);

  const speed = svgEl('g', { stroke: INK, 'stroke-width': 0.8, 'stroke-linecap': 'round', filter: tile.lineFilter }, content);
  const dashes = [
    [0, 48.6, 13],
    [36, 47.6, 0.3],
    [52, 49.6, 6],
    [78, 48.2, 9],
  ].map(([x, y, w]) => ({ el: svgEl('path', {}, speed), x, y, w }));

  const train = svgEl('g', { filter: tile.artFilter }, content);
  const body = svgEl('g', {}, train);
  for (let i = CARS - 1; i >= 0; i--) car(body, i);

  const note = svgEl('g', {}, svg);
  pencilText(note, 'tudo nos trilhos!', { x: -12, y: 114.5, size: 9, rotate: -5, filter: tile.lineFilter });

  // ---------- estado ----------
  // x: onde está o bico do trem; trains: trenzinhos à mostra; boost: acelerada do mouse
  const st = { x: -4, trains: 0, boost: 0 };
  let clock = 0;
  let travel = 0;

  function render() {
    const bob = Math.sin(clock * 38) * 0.18;
    body.setAttribute('transform', `translate(${r2(st.x)} ${r2(bob)})`);
    const passing = st.x > 0 && st.x - LENGTH < 100;
    dashes.forEach(({ el, x, y, w }) => {
      const at = ((x - clock * 140) % 110 + 110) % 110 - 5;
      el.setAttribute('d', `M${r2(at)} ${y}h${w}`);
      el.setAttribute('opacity', passing ? 1 : 0);
    });

    minis.setAttribute('visibility', st.trains > 0.01 ? 'visible' : 'hidden');
    if (st.trains <= 0.01) return;
    for (const tr of trains) {
      const { total } = tr.track;
      const u = (((tr.u0 + (tr.dir * travel * tr.speed) / total) % 1) + 1) % 1;
      const p = pointAt(tr.track, u);
      const angle = (Math.atan2(p.ty, p.tx) * 180) / Math.PI;
      // some devagar nas pontas (terminal ou borda do ladrilho) e reaparece na outra
      const fade = clamp(Math.min(u, 1 - u) * total / 4);
      tr.el.setAttribute('transform', `translate(${r2(p.x)} ${r2(p.y)}) rotate(${r2(angle)})`);
      tr.el.setAttribute('opacity', r2(fade * st.trains));
    }
  }

  const lines = strokes.flat();
  const tl = gsap.timeline({ paused: true, onUpdate: render });
  tl.set(st, { x: -4, trains: 0 }, 0)
    .set(lines, { drawSVG: '50% 50%', autoAlpha: 0 }, 0)
    .set(stations, { scale: 0, transformOrigin: '50% 50%' }, 0)
    .set(rails, { autoAlpha: 1 }, 0)
    .set(note, { autoAlpha: 0 }, 0)
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .fromTo(railLines, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.out' }, 0.1)
    .fromTo(sleepers, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.45)
    // o trem passa inteiro
    .to(st, { x: 100 + LENGTH + 4, duration: 2.3, ease: 'none' }, 0.45)
    .to(rails, { autoAlpha: 0, duration: 0.35 }, 2.6)
    // as linhas crescem do meio para as pontas, uma atrás da outra
    .to(lines, { drawSVG: '0% 100%', autoAlpha: 1, duration: 0.9, stagger: 0.03, ease: 'power2.inOut' }, 2.55)
    .to(stations, { scale: 1, duration: 0.35, stagger: 0.025, ease: 'back.out(2.5)' }, 3.55)
    .to(st, { trains: 1, duration: 0.6 }, 3.75)
    .fromTo(note, { autoAlpha: 0, scale: 0.4, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 4.1);

  frameLoop(svg, (t, dt) => {
    clock = t;
    travel += dt * (1 + 2.5 * st.boost);
    render();
  });

  // depois de pronto: o mouse dá uma acelerada nos trenzinhos
  function hover(on) {
    if (tl.progress() < 1) return;
    gsap.to(st, { boost: on ? 1 : 0, duration: on ? 0.5 : 1.2, ease: 'power2.out' });
  }

  return { svg, tl, hover, tile };
}
