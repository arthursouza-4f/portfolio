import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { svgEl, r2, clamp } from '../lib/svg.js';
import { createTile, pencilText } from '../lib/tile.js';

gsap.registerPlugin(DrawSVGPlugin);

/*
 * Calculadora CLT x PJ: uma balança de pratos num papel quadriculado.
 * No prato da CLT caem o salário, o 13º, o FGTS e as férias, e ela afunda.
 * No do PJ vão caindo moedas até empatar ("="); aí cai um saco de R$ e a
 * balança pende pro PJ: agora vale a pena.
 */

const INK = 'var(--ink)';
const LINE = 0.9;
const PIVOT = [50, 63];
const ARM = 30; // meio travessão
const POST = 7; // do travessão até a superfície do prato
const PER = 3.5; // graus por unidade de peso de diferença
const MAX = 14;
const HAND = 'Caveat Variable, cursive';

const tilt = (diff) => clamp(diff * PER, -MAX, MAX);

/** Plaquinha de papel com o nome de um benefício. */
function tag(parent, { x, y, w, h, text, fill, rotate = 0, size = 4.8 }) {
  const g = svgEl('g', {}, parent);
  const inner = svgEl('g', { transform: `rotate(${rotate} ${x + w / 2} ${y + h})` }, g);
  svgEl('rect', { x, y, width: w, height: h, rx: 1.4, fill, stroke: INK, 'stroke-width': LINE * 0.8 }, inner);
  const label = svgEl(
    'text',
    { x: x + w / 2, y: y + h / 2 + size * 0.34, 'text-anchor': 'middle', 'font-family': HAND, 'font-weight': 700, 'font-size': size, fill: INK },
    inner,
  );
  label.textContent = text;
  return g;
}

function coin(parent, x, y) {
  const g = svgEl('g', { transform: `translate(${x} ${r2(y)})` }, parent);
  const drop = svgEl('g', {}, g);
  svgEl('path', { d: 'M-5.6 0V2.2A5.6 1.9 0 0 0 5.6 2.2V0', fill: '#e2a91c', stroke: INK, 'stroke-width': 0.6 }, drop);
  svgEl('ellipse', { rx: 5.6, ry: 1.9, fill: '#ffd447', stroke: INK, 'stroke-width': 0.6 }, drop);
  svgEl('path', { d: 'M-2.4 -0.2h4.8', stroke: '#e2a91c', 'stroke-width': 0.7, 'stroke-linecap': 'round' }, drop);
  return drop;
}

export function createCltPj() {
  const tile = createTile('clt-pj', { label: 'Balança comparando CLT e PJ', seed: 45 });
  const { svg, clipId } = tile;

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);
  // papel quadriculado de caderno de contas
  const grid = svgEl('g', { stroke: '#cddcf0', 'stroke-width': 0.35 }, content);
  for (let k = 4; k < 100; k += 8) {
    svgEl('path', { d: `M${k} 0V100` }, grid);
    svgEl('path', { d: `M0 ${k}H100` }, grid);
  }
  svgEl('path', { d: 'M-2 91.2C30 90.6 70 91.6 102 91', fill: 'none', stroke: INK, 'stroke-width': LINE, 'stroke-linecap': 'round', filter: tile.lineFilter }, content);

  // ---------- a balança ----------
  const rig = svgEl('g', { filter: tile.artFilter, 'stroke-linejoin': 'round' }, content);
  const outline = { stroke: INK, 'stroke-width': LINE };
  svgEl('path', { d: 'M48.4 66V84.5H51.6V66Z', fill: '#fff', ...outline }, rig);
  svgEl('path', { d: 'M36 91L40.5 84.2H59.5L64 91Z', fill: '#fff', ...outline }, rig);

  // mostrador com o ponteiro (sobe do pino)
  const dial = svgEl('g', { fill: 'none', stroke: INK, 'stroke-linecap': 'round' }, rig);
  svgEl('path', { d: 'M42.6 48.8A16 16 0 0 1 57.4 48.8', 'stroke-width': 0.7 }, dial);
  for (const a of [-16, 0, 16]) {
    const rad = (a * Math.PI) / 180;
    const p = (r) => `${r2(PIVOT[0] + Math.sin(rad) * r)} ${r2(PIVOT[1] - Math.cos(rad) * r)}`;
    svgEl('path', { d: `M${p(16)}L${p(a ? 13.8 : 13)}`, 'stroke-width': a ? 0.6 : 0.9 }, dial);
  }
  const needle = svgEl('path', { d: `M50 ${PIVOT[1]}V${PIVOT[1] - 14.5}`, fill: 'none', stroke: 'var(--lince-red)', 'stroke-width': 1, 'stroke-linecap': 'round' }, rig);

  const beam = svgEl('g', {}, rig);
  svgEl('rect', { x: PIVOT[0] - ARM - 1.5, y: PIVOT[1] - 1.5, width: ARM * 2 + 3, height: 3, rx: 1.5, fill: '#fff', ...outline }, beam);

  // pratos: o pino sai da ponta do travessão e o prato fica sempre reto
  const plate = (label) => {
    const g = svgEl('g', {}, rig);
    svgEl('path', { d: `M-0.9 0V${-POST}H0.9V0Z`, fill: '#fff', ...outline }, g);
    svgEl('path', { d: `M-15.5 ${-POST}H15.5L13 ${-POST + 2.8}H-13Z`, fill: '#fff', ...outline }, g);
    svgEl('circle', { r: 1.3, fill: '#fff', ...outline }, g);
    const text = svgEl(
      'text',
      { y: 11, 'text-anchor': 'middle', 'font-family': HAND, 'font-weight': 700, 'font-size': 7.5, fill: 'var(--pencil)', stroke: 'none' },
      g,
    );
    text.textContent = label;
    return g;
  };
  const left = plate('CLT');
  const right = plate('PJ');
  svgEl('circle', { cx: PIVOT[0], cy: PIVOT[1], r: 2.3, fill: '#fff', ...outline }, rig);

  // ---------- o que cai nos pratos (cada coisa com o seu peso) ----------
  const top = -POST;
  const clt = [
    { el: tag(left, { x: -12.5, y: top - 7.5, w: 25, h: 7.5, text: 'salário', fill: '#fff', size: 5.6 }), w: 5 },
    { el: tag(left, { x: -14, y: top - 13.5, w: 11.6, h: 6, text: '13º', fill: '#fff1bf', rotate: -3 }), w: 1 },
    { el: tag(left, { x: -1.6, y: top - 13.5, w: 15, h: 6, text: 'FGTS', fill: '#fff1bf', rotate: 3 }), w: 1 },
    { el: tag(left, { x: -7.8, y: top - 19.6, w: 15.4, h: 6, text: 'férias', fill: '#fff1bf', rotate: -2 }), w: 1 },
  ];
  const coins = [];
  for (let k = 0; k < 4; k++) {
    for (const x of [-7, 7]) coins.push({ el: coin(right, x, top - 4.1 - 2.2 * k), w: 1 });
  }
  const bag = svgEl('g', {}, right);
  const bagBody = svgEl('g', { transform: `translate(0 ${top - 14.4})` }, bag);
  svgEl(
    'path',
    { d: 'M-3.6 -9.6C-9 -6 -9.4 1.6 -5.4 2.4H5.4C9.4 1.6 9 -6 3.6 -9.6Z', fill: '#d8b37a', stroke: INK, 'stroke-width': 0.8 },
    bagBody,
  );
  svgEl('path', { d: 'M-3.6 -9.6L-5.2 -12.4L-1.6 -11L0 -12.9L1.6 -11L5.2 -12.4L3.6 -9.6Z', fill: '#d8b37a', stroke: INK, 'stroke-width': 0.8 }, bagBody);
  svgEl('path', { d: 'M-4.1 -9.3H4.1', stroke: '#8a5a1e', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, bagBody);
  const rs = svgEl(
    'text',
    { y: -1.4, 'text-anchor': 'middle', 'font-family': HAND, 'font-weight': 700, 'font-size': 6.6, fill: INK },
    bagBody,
  );
  rs.textContent = 'R$';

  // "=" quando empata e brilhinho quando vira
  const equal = svgEl('g', {}, content);
  pencilText(equal, '=', { x: 50, y: 42.5, size: 12, anchor: 'middle', filter: tile.lineFilter });
  const spark = svgEl(
    'path',
    { d: 'M0 -4.4Q.5 -.5 4.4 0Q.5 .5 0 4.4Q-.5 .5 -4.4 0Q-.5 -.5 0 -4.4Z', fill: '#ffd447', stroke: INK, 'stroke-width': 0.6 },
    svgEl('g', { transform: 'translate(92 18)' }, content),
  );

  const note = svgEl('g', {}, svg);
  pencilText(note, 'vale a pena!', { x: -12, y: 114.5, size: 9, rotate: -5, filter: tile.lineFilter });

  // ---------- estado ----------
  const st = { ang: 0 };

  function render() {
    const a = (st.ang * Math.PI) / 180;
    beam.setAttribute('transform', `rotate(${r2(st.ang)} ${PIVOT[0]} ${PIVOT[1]})`);
    needle.setAttribute('transform', `rotate(${r2(st.ang * 1.3)} ${PIVOT[0]} ${PIVOT[1]})`);
    const dx = Math.cos(a) * ARM;
    const dy = Math.sin(a) * ARM;
    left.setAttribute('transform', `translate(${r2(PIVOT[0] - dx)} ${r2(PIVOT[1] - dy)})`);
    right.setAttribute('transform', `translate(${r2(PIVOT[0] + dx)} ${r2(PIVOT[1] + dy)})`);
  }

  const items = [...clt.map((c) => c.el), ...coins.map((c) => c.el), bag];
  const tl = gsap.timeline({ paused: true, onUpdate: render });
  tl.set(st, { ang: 0 }, 0)
    .set(items, { autoAlpha: 0 }, 0)
    .set([equal, note], { autoAlpha: 0 }, 0)
    .set(spark, { scale: 0, rotation: 0, transformOrigin: '50% 50%' }, 0)
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .fromTo(rig, { scaleY: 0, svgOrigin: '50 91' }, { scaleY: 1, svgOrigin: '50 91', duration: 0.55, ease: 'back.out(1.7)' }, 0.25);

  let weight = 0; // PJ − CLT
  /** Cai do alto, quica no prato e a balança responde. */
  function drop(el, w, at, fall = 0.36) {
    weight += w;
    tl.set(el, { autoAlpha: 1 }, at)
      .fromTo(el, { y: -80 }, { y: 0, duration: fall, ease: 'power2.in', immediateRender: false }, at)
      .to(el, { y: -1.6, duration: 0.08, ease: 'power1.out', yoyo: true, repeat: 1 }, at + fall)
      .to(st, { ang: tilt(weight), duration: 0.85, ease: 'elastic.out(1, 0.45)' }, at + fall);
  }

  drop(clt[0].el, -clt[0].w, 0.75, 0.42);
  [1.2, 1.38, 1.56].forEach((at, i) => drop(clt[i + 1].el, -clt[i + 1].w, at));
  // as moedas vêm cada vez mais rápido; a última (a do empate) depois de um suspense
  [0, 0.2, 0.38, 0.54, 0.68, 0.8, 0.92, 1.25].forEach((dt, i) => drop(coins[i].el, coins[i].w, 2.0 + dt, 0.3));
  tl.fromTo(equal, { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 3.6);
  drop(bag, 2, 4.15, 0.38);
  tl.to(equal, { autoAlpha: 0, scale: 0.3, duration: 0.2, ease: 'power2.in' }, 4.5)
    .to(spark, { scale: 1, rotation: 90, duration: 0.25, ease: 'back.out(3)' }, 4.55)
    .to(spark, { scale: 0, rotation: 180, duration: 0.25, ease: 'power2.in' }, 4.85)
    .fromTo(note, { autoAlpha: 0, scale: 0.4, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 4.6);

  render();

  // depois de pronto: o mouse dá um toquinho no travessão
  const rest = tilt(weight);
  function hover(on) {
    if (!on || tl.progress() < 1 || gsap.isTweening(st)) return;
    gsap
      .timeline({ onUpdate: render })
      .to(st, { ang: rest - 6, duration: 0.14, ease: 'power2.out' })
      .to(st, { ang: rest, duration: 1.1, ease: 'elastic.out(1, 0.3)' });
  }

  return { svg, tl, hover, tile };
}
