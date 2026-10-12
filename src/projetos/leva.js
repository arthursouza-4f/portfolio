import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { svgEl, r2, lerp, clamp } from '../lib/svg.js';
import { createTile, pencilText } from '../lib/tile.js';

gsap.registerPlugin(DrawSVGPlugin);

/*
 * Leva: um carinha entra empurrando o carrinho em "L" com a caixa em cima
 * e para no meio. Ele dá tchau, a porta de enrolar (de depósito) desce
 * por trás do carrinho e esconde o carinha; o carrinho vai pro ladinho,
 * vira o símbolo e o "leva" aparece do lado, como no logo do app.
 * Geometria do logo: levatech.site (quadro de 552 × 256).
 */

const DARK = '#16181D';
const TEAL = '#35746E';
const INK = 'var(--ink)';

const L_BODY = 'M38 40H85.38V172H200.46V216H63.77A33.85 33.85 0 0 0 38 156.94Z';
const WHEEL = { cx: 41.385, cy: 190.62, r: 25.385 };
const BOX =
  'M110.77 68.77H188.62A11.85 11.85 0 0 1 200.46 80.62V146.62A11.85 11.85 0 0 1 188.62 158.46H110.77A11.85 11.85 0 0 1 98.92 146.62V80.62A11.85 11.85 0 0 1 110.77 68.77ZM137 87.38A5.92 5.92 0 0 0 131.08 93.31V93.31A5.92 5.92 0 0 0 137 99.23H162.38A5.92 5.92 0 0 0 168.31 93.31V93.31A5.92 5.92 0 0 0 162.38 87.38Z';
const LETTERS = [
  'M240.46 99.84H261.2V216H240.46Z',
  'M352.37 198.58A43.04 43.04 0 1 1 359.02 182.29L295.79 182.29A22.3 22.3 0 0 0 335.18 186.98ZM296.69 164.66L336.7 164.66A22.3 22.3 0 0 0 296.69 164.66Z',
  'M365.96 133.03L388.3 133.03L405.29 175.51L422.28 133.03L444.62 133.03L411.43 216L399.14 216Z',
  'M449.81 174.51A43.04 43.04 0 1 1 535.89 174.51A43.04 43.04 0 1 1 449.81 174.51ZM470.55 174.51A22.3 22.3 0 1 0 515.15 174.51A22.3 22.3 0 1 0 470.55 174.51ZM515.15 133.03H535.89V216H515.15Z',
];

const GROUND = 76;
// carrinho andando (escala 0,2, roda no chão, centrado) → logo pronto (escala 0,15, centrado no ladrilho)
const CART = { x: 28.35, y: GROUND - 216 * 0.2, s: 0.2 };
const LOGO = { x: 8.61, y: 30.8, s: 0.15 };
// onde as mãos seguram o carrinho (no quadro do logo)
const HANDLE = [44, 70];

// boneco macarrão: tubos brancos com contorno, como o surfista do topo
const OUT = 0.75;
const WIDTH = { leg: 3.2, torso: 5.4, arm: 2.4 };
const LEG = 16.5;
const TORSO = 13;
const HEAD_R = 4.6;

const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const pt = (p) => `${r2(p[0])} ${r2(p[1])}`;
/** Curva que passa pelo "cotovelo"/"joelho". */
function limb(a, joint, b) {
  const c = [2 * joint[0] - (a[0] + b[0]) / 2, 2 * joint[1] - (a[1] + b[1]) / 2];
  return `M${pt(a)}Q${pt(c)} ${pt(b)}`;
}
/** Junta dobrada para fora do meio do segmento a→b (lado = +1 ou -1). */
function bend(a, b, amount, side = 1) {
  const m = mid(a, b);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [m[0] - (dy / len) * amount * side, m[1] + (dx / len) * amount * side];
}

export function createLeva() {
  const tile = createTile('leva', { label: 'Logo da Leva', seed: 33 });
  const { svg, clipId } = tile;

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);
  const ground = svgEl(
    'path',
    { d: `M-2 ${GROUND + 0.4}C30 ${GROUND - 0.6} 70 ${GROUND + 1} 102 ${GROUND}`, fill: 'none', stroke: INK, 'stroke-width': 0.9, 'stroke-linecap': 'round', filter: tile.lineFilter },
    content,
  );
  const cartShadow = svgEl('ellipse', { cy: GROUND + 1.2, rx: 19, ry: 1.6, fill: INK, opacity: 0.12 }, content);

  // rastros de velocidade atrás do carinha
  const speed = svgEl('g', { fill: 'none', stroke: INK, 'stroke-width': 0.8, 'stroke-linecap': 'round', filter: tile.lineFilter }, content);
  const speedLines = [
    [-10, -23, 6],
    [-14, -13, 8],
    [-9, -4, 5],
  ].map(([dx, dy, len]) => ({ el: svgEl('path', {}, speed), dx, dy, len }));

  // ---------- o carinha ----------
  const guy = svgEl('g', { filter: tile.artFilter, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, content);
  const under = svgEl('g', { stroke: INK }, guy);
  const over = svgEl('g', { stroke: '#fff' }, guy);
  const parts = ['legBack', 'armBack', 'legFront', 'torso', 'armFront'];
  const widthOf = { legBack: WIDTH.leg, legFront: WIDTH.leg, torso: WIDTH.torso, armBack: WIDTH.arm, armFront: WIDTH.arm };
  const u = {};
  const o = {};
  for (const p of parts) {
    u[p] = svgEl('path', { 'stroke-width': widthOf[p] + OUT * 2 }, under);
    o[p] = svgEl('path', { 'stroke-width': widthOf[p] }, over);
  }
  const headU = svgEl('circle', { r: HEAD_R + OUT, fill: INK, stroke: 'none' }, under);
  const headO = svgEl('circle', { r: HEAD_R, fill: '#fff', stroke: 'none' }, over);
  // camiseta verde-petróleo da Leva por cima do tronco branco (o contorno continua aparecendo)
  const shirt = svgEl('path', { stroke: TEAL, 'stroke-width': WIDTH.torso, 'stroke-linecap': 'butt' }, guy);
  const sleeve = svgEl('path', { stroke: TEAL, 'stroke-width': WIDTH.arm + 0.3, 'stroke-linecap': 'butt' }, guy);
  const face = svgEl('g', { stroke: INK, 'stroke-width': 0.75 }, guy);
  const eye = svgEl('path', {}, face);
  const smile = svgEl('path', {}, face);
  const cap = svgEl('path', { fill: TEAL, stroke: INK, 'stroke-width': 0.7 }, guy);

  // ---------- porta de enrolar (na frente do carinha, atrás do carrinho) ----------
  const door = svgEl('g', {}, content);
  svgEl('rect', { x: -2, y: -4, width: 104, height: 106, fill: DARK }, door);
  const slats = svgEl('g', { stroke: '#fff', 'stroke-width': 0.5, opacity: 0.09 }, door);
  for (let y = 6; y < 100; y += 7) svgEl('path', { d: `M-2 ${y}H102` }, slats);
  const lip = svgEl('g', {}, door);
  svgEl('rect', { x: -2, y: 97.5, width: 104, height: 4.5, fill: '#2a2d34' }, lip);
  svgEl('rect', { x: 44, y: 94.6, width: 12, height: 2, rx: 1, fill: '#3b3f48' }, lip);

  // ---------- carrinho → logo ----------
  const logo = svgEl('g', {}, content);
  const cart = svgEl('g', { fill: '#fff', stroke: INK, 'stroke-linejoin': 'round' }, logo);
  const cartTilt = svgEl('g', {}, cart);
  svgEl('path', { d: L_BODY }, cartTilt);
  const wheel = svgEl('circle', { ...WHEEL }, cartTilt);
  const spoke = svgEl('path', { fill: 'none', 'stroke-linecap': 'round' }, cartTilt);
  const box = svgEl('path', { d: BOX }, cartTilt);

  const word = svgEl('g', { fill: '#fff', transform: `translate(${LOGO.x} ${LOGO.y}) scale(${LOGO.s})` }, logo);
  const letters = LETTERS.map((d) => svgEl('path', { d }, svgEl('g', {}, word)).parentNode);

  const note = svgEl('g', {}, svg);
  pencilText(note, 'entregue!', { x: -12, y: 113, size: 9, rotate: -10, filter: tile.lineFilter });

  // ---------- estado ----------
  // x: quanto falta para o meio; walk: 1 andando, 0 parado; tilt: carrinho inclinado (graus);
  // bye: braço do tchau (0..1) e wig, o sacolejo; morph: carrinho (0) → logo (1)
  const st = { x: -78, walk: 1, tilt: -7, bye: 0, wig: 0, morph: 0, spoke: 1 };

  /** Ponto do quadro do logo → ladrilho, com o carrinho na posição atual. */
  function cartPoint([px, py], at) {
    const a = (st.tilt * Math.PI) / 180;
    const dx = px - WHEEL.cx;
    const dy = py - WHEEL.cy;
    const rx = WHEEL.cx + dx * Math.cos(a) - dy * Math.sin(a);
    const ry = WHEEL.cy + dx * Math.sin(a) + dy * Math.cos(a);
    return [at.x + rx * at.s, at.y + ry * at.s];
  }

  function render() {
    const m = st.morph;
    const at = { x: lerp(CART.x, LOGO.x, m) + st.x, y: lerp(CART.y, LOGO.y, m), s: lerp(CART.s, LOGO.s, m) };
    cart.setAttribute('transform', `translate(${r2(at.x)} ${r2(at.y)}) scale(${at.s.toFixed(4)})`);
    cart.setAttribute('stroke-width', r2(0.9 / at.s));
    cartTilt.setAttribute('transform', `rotate(${r2(st.tilt)} ${WHEEL.cx} ${WHEEL.cy})`);
    // a roda gira conforme anda (só um raio, para dar para ver)
    const spin = st.x / (WHEEL.r * CART.s);
    const end = [WHEEL.cx + Math.cos(spin) * WHEEL.r * 0.62, WHEEL.cy + Math.sin(spin) * WHEEL.r * 0.62];
    spoke.setAttribute('d', `M${WHEEL.cx} ${WHEEL.cy}L${pt(end)}`);
    spoke.setAttribute('opacity', r2(st.spoke));
    cartShadow.setAttribute('cx', r2(50 + st.x));

    // ---------- carinha ----------
    // o corpo acompanha o carrinho; as mãos seguem a alça (que se mexe quando ele inclina)
    const hand = cartPoint(HANDLE, at);
    const walk = st.walk;
    const phase = st.x * 0.5;
    const hipX = at.x + HANDLE[0] * at.s - lerp(18.5, 20, st.bye);
    const hip = [hipX, GROUND - LEG + Math.abs(Math.cos(phase)) * 0.7 * walk];
    const stride = 3.8 * walk;
    const footA = [hipX + 1.6 + Math.sin(phase) * stride, GROUND - Math.max(0, Math.cos(phase)) * 1.8 * walk];
    const footB = [hipX - 1.6 - Math.sin(phase) * stride, GROUND - Math.max(0, -Math.cos(phase)) * 1.8 * walk];
    const lean = lerp(3.4, 0.6, st.bye);
    const chest = [hip[0] + lean, hip[1] - TORSO];
    const head = [chest[0] + lean * 0.35 + 1, chest[1] - 2.2 - HEAD_R];
    const shoulder = add(chest, [0.6, 1.2]);

    // empurrando: as duas mãos no carrinho; no tchau, o braço de trás sobe acima da cabeça e sacode
    const handBack = [
      lerp(hand[0] - 0.6, shoulder[0] - 4 + Math.sin(st.wig) * 1.8, st.bye),
      lerp(hand[1] + 1.2, shoulder[1] - 17 + Math.abs(Math.cos(st.wig)) * 0.8, st.bye),
    ];
    const handFront = [lerp(hand[0], shoulder[0] + 1.2, st.bye), lerp(hand[1], shoulder[1] + 9.5, st.bye)];
    const elbowBack = bend(shoulder, handBack, lerp(2, -2.4, st.bye));
    const elbowFront = bend(shoulder, handFront, 2);

    const paths = {
      legBack: limb(hip, bend(hip, footB, 1.4, -1), footB),
      legFront: limb(hip, bend(hip, footA, 1.4, -1), footA),
      torso: `M${pt(hip)}L${pt(chest)}`,
      armBack: limb(shoulder, elbowBack, handBack),
      armFront: limb(shoulder, elbowFront, handFront),
    };
    for (const p of parts) {
      u[p].setAttribute('d', paths[p]);
      o[p].setAttribute('d', paths[p]);
    }
    for (const c of [headU, headO]) {
      c.setAttribute('cx', r2(head[0]));
      c.setAttribute('cy', r2(head[1]));
    }
    shirt.setAttribute('d', `M${pt(add(hip, [chest[0] - hip[0], chest[1] - hip[1]], 0.18))}L${pt(chest)}`);
    sleeve.setAttribute('d', `M${pt(shoulder)}L${pt(add(shoulder, [elbowFront[0] - shoulder[0], elbowFront[1] - shoulder[1]], 0.5))}`);
    // de perfil, olhando para a frente: olho, sorriso e o boné
    eye.setAttribute('d', `M${pt(add(head, [2.3, 0.3]))}v0.5`);
    smile.setAttribute('d', `M${pt(add(head, [1.3, 2.2]))}q1.5 1 2.8 -0.3`);
    cap.setAttribute(
      'd',
      `M${pt(add(head, [-4.7, -0.6]))}C${pt(add(head, [-4.8, -6.1]))} ${pt(add(head, [3.9, -6.6]))} ${pt(add(head, [4.7, -1.3]))}L${pt(add(head, [7.8, -1]))}L${pt(add(head, [4.6, -0.2]))}Z`,
    );

    speedLines.forEach(({ el, dx, dy, len }, i) => {
      const x = hipX + dx - (i % 2) * Math.sin(st.x * 0.9) * 0.8;
      el.setAttribute('d', `M${r2(x - len)} ${r2(hip[1] + dy)}H${r2(x)}`);
      el.setAttribute('opacity', r2(clamp(walk * 1.4 - 0.2)));
    });
  }

  const tl = gsap.timeline({ paused: true, onUpdate: render });
  tl.set(st, { x: -78, walk: 1, tilt: -7, bye: 0, wig: 0, morph: 0, spoke: 1 }, 0)
    .set(door, { y: -108 }, 0)
    .set(slats, { opacity: 0.09 }, 0)
    .set(lip, { opacity: 1 }, 0)
    .set(letters, { autoAlpha: 0 }, 0)
    .set(note, { autoAlpha: 0 }, 0)
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .fromTo(ground, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, ease: 'power2.out' }, 0.15)
    // entra empurrando e vai freando até o meio
    .to(st, { x: 0, duration: 2.1, ease: 'power2.out' }, 0.35)
    .to(st, { walk: 0, duration: 0.45, ease: 'power1.inOut' }, 2.05)
    .to(st, { tilt: 0, duration: 0.5, ease: 'back.out(3)' }, 2.2)
    // solta o carrinho e dá tchau
    .to(st, { bye: 1, duration: 0.35, ease: 'power2.out' }, 2.65)
    .to(st, { wig: Math.PI * 6, duration: 0.95, ease: 'none' }, 2.85)
    // a porta desce e esconde o carinha; só o carrinho fica na frente
    .to(door, { y: 0, duration: 0.75, ease: 'bounce.out' }, 3.25)
    .to([slats, lip], { opacity: 0, duration: 0.45 }, 4.0)
    // o carrinho vai pro ladinho, vira o símbolo e o nome aparece
    .to(st, { morph: 1, spoke: 0, duration: 0.6, ease: 'power3.inOut' }, 4.05)
    .fromTo(
      letters,
      { autoAlpha: 0, y: 70, scale: 0.4, transformOrigin: '50% 100%' },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(2.4)' },
      4.4,
    )
    .to(logo, { scale: 1.07, svgOrigin: '50 50', duration: 0.12, ease: 'power2.out' }, 4.95)
    .to(logo, { scale: 1, svgOrigin: '50 50', duration: 0.6, ease: 'elastic.out(1.1, 0.4)' }, 5.07)
    .fromTo(note, { autoAlpha: 0, scale: 0.4, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 5.0);

  render();

  // depois de pronto: a caixa dá um pulinho em cima do carrinho
  function hover(on) {
    if (!on || tl.progress() < 1 || gsap.isTweening(box)) return;
    gsap
      .timeline()
      .to(box, { y: -26, duration: 0.18, ease: 'power2.out' })
      .to(box, { y: 0, duration: 0.5, ease: 'bounce.out' });
  }

  return { svg, tl, hover, tile };
}
