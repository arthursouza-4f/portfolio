import { svgEl, r2 } from '../lib/svg.js';

/*
 * Surfista no estilo "boneco macarrão": membros são tubos brancos com
 * contorno de nanquim. Primeiro desenhamos todos os tubos em preto (mais
 * grossos) e depois todos em branco por cima, então braços, pernas e tronco
 * se fundem numa silhueta só, sem linhas internas — igual às ilustrações
 * de referência. O sombreado granulado vem do filtro do grupo pai.
 */

const INK = '#151515';
const OUTLINE = 2.3;
const WIDTH = { torso: 15, leg: 9.5, arm: 7.5, neck: 7 };
const HEAD_R = 10.5;

const BOARD_PATH =
  'M-50 0.5 C-44 -6.5 -16 -8.5 16 -7.6 C33 -7 46 -4.6 49.5 -1.4 L49.5 2.8 C41 6.6 12 8.2 -14 7 C-33 6 -45 4 -50 0.5 Z';

const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Curva que passa pelo "cotovelo": controle = 2·meio − (início+fim)/2 */
function limb(a, joint, b) {
  const cx = 2 * joint[0] - (a[0] + b[0]) / 2;
  const cy = 2 * joint[1] - (a[1] + b[1]) / 2;
  return `M${r2(a[0])} ${r2(a[1])}Q${r2(cx)} ${r2(cy)} ${r2(b[0])} ${r2(b[1])}`;
}

export function createSurfer(parent) {
  const root = svgEl('g', { class: 'surfer' }, parent);

  const board = svgEl('g', {}, root);
  svgEl('path', { d: 'M38 4 L45 15 L33 6 Z', fill: '#fff', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }, board);
  svgEl('path', { d: BOARD_PATH, fill: 'var(--board)', stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, board);
  svgEl('path', { d: 'M-44 0.8 C-12 -0.6 18 -0.4 47 0.8', fill: 'none', stroke: 'var(--sand)', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, board);

  const body = svgEl('g', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, root);
  const under = svgEl('g', { stroke: INK }, body);
  const over = svgEl('g', { stroke: '#fff' }, body);

  const parts = ['legBack', 'legFront', 'torso', 'neck', 'armBack', 'armFront'];
  const width = { legBack: WIDTH.leg, legFront: WIDTH.leg, torso: WIDTH.torso, neck: WIDTH.neck, armBack: WIDTH.arm, armFront: WIDTH.arm };
  const u = {};
  const o = {};
  for (const p of parts) {
    u[p] = svgEl('path', { 'stroke-width': width[p] + OUTLINE * 2 }, under);
    o[p] = svgEl('path', { 'stroke-width': width[p] }, over);
  }
  const headU = svgEl('circle', { r: HEAD_R + OUTLINE, fill: INK, stroke: 'none' }, under);
  const headO = svgEl('circle', { r: HEAD_R, fill: '#fff', stroke: 'none' }, over);

  // bermuda azul (por cima do branco, mais fina, então o contorno continua aparecendo)
  const shorts = svgEl('g', { stroke: 'var(--sea)' }, body);
  const shortsBack = svgEl('path', { 'stroke-width': WIDTH.leg + 0.6, 'stroke-linecap': 'butt' }, shorts);
  const shortsFront = svgEl('path', { 'stroke-width': WIDTH.leg + 0.6, 'stroke-linecap': 'butt' }, shorts);
  const shortsHip = svgEl('path', { 'stroke-width': WIDTH.torso, 'stroke-linecap': 'butt' }, shorts);

  const face = svgEl('g', { stroke: INK, 'stroke-width': 1.9, fill: 'none', 'stroke-linecap': 'round' }, root);
  const eye = svgEl('path', {}, face);
  const smile = svgEl('path', {}, face);
  const hair = svgEl('path', { 'stroke-width': 2.2 }, face);

  /**
   * pose: { x, y, angle (rad, prancha), crouch 0..1, lean, t }
   * A prancha aponta o bico para -x local. As pernas saem da prancha e o
   * corpo fica "em pé" misturando a normal da prancha com a vertical.
   */
  function update({ x, y, angle, crouch = 0.4, lean = 0, t = 0, scale = 1, opacity = 1 }) {
    root.setAttribute('opacity', opacity);
    root.setAttribute('transform', `translate(${r2(x)} ${r2(y)}) scale(${r2(scale)})`);
    board.setAttribute('transform', `rotate(${r2((angle * 180) / Math.PI)})`);

    const d = [Math.cos(angle), Math.sin(angle)]; // ao longo da prancha, para a rabeta
    const n = [d[1], -d[0]]; // normal do deck (para cima da prancha)
    const upMix = 0.58;
    let up = [n[0] * (1 - upMix), n[1] * (1 - upMix) - upMix];
    const m = Math.hypot(up[0], up[1]);
    up = [up[0] / m, up[1] / m];
    const fwd = [up[1], -up[0]]; // para onde ele olha (bico)

    const footFront = add(add([0, 0], d, -15), n, 4.5);
    const footBack = add(add([0, 0], d, 19), n, 4.5);
    const legLen = 44 - crouch * 13;
    const hip = add(add(mid(footFront, footBack), up, legLen), fwd, 1 + lean * 4);
    const kneeFront = add(add(mid(footFront, hip), fwd, 7 + crouch * 6), up, 1);
    const kneeBack = add(add(mid(footBack, hip), fwd, 5 + crouch * 5), up, -1);
    const chest = add(add(hip, up, 27 - crouch * 3), fwd, 7 + lean * 9 + crouch * 4);
    const neckTop = add(add(chest, up, 9), fwd, 3);
    const head = add(add(chest, up, 9 + HEAD_R + 1), fwd, 6 + lean * 3);

    const swing = Math.sin(t * 2.3);
    const elbowF = add(add(chest, fwd, 13 + swing * 1.5), up, -3);
    const handF = add(add(chest, fwd, 26 + swing * 2), up, -11 + swing * 3);
    const elbowB = add(add(chest, fwd, -13), up, 6 - swing * 2);
    const handB = add(add(chest, fwd, -25 + swing), up, 15 - swing * 4);

    const paths = {
      legBack: limb(footBack, kneeBack, hip),
      legFront: limb(footFront, kneeFront, hip),
      torso: `M${r2(hip[0])} ${r2(hip[1])}L${r2(chest[0])} ${r2(chest[1])}`,
      neck: `M${r2(chest[0])} ${r2(chest[1])}L${r2(neckTop[0])} ${r2(neckTop[1])}`,
      armBack: limb(chest, elbowB, handB),
      armFront: limb(chest, elbowF, handF),
    };
    for (const p of parts) {
      u[p].setAttribute('d', paths[p]);
      o[p].setAttribute('d', paths[p]);
    }
    for (const c of [headU, headO]) {
      c.setAttribute('cx', r2(head[0]));
      c.setAttribute('cy', r2(head[1]));
    }

    // bermuda de surf: do quadril até quase o joelho
    const thigh = (knee) => {
      const a = add(hip, [knee[0] - hip[0], knee[1] - hip[1]], 0.82);
      return `M${r2(hip[0])} ${r2(hip[1])}L${r2(a[0])} ${r2(a[1])}`;
    };
    shortsBack.setAttribute('d', thigh(kneeBack));
    shortsFront.setAttribute('d', thigh(kneeFront));
    const hipTop = add(hip, [chest[0] - hip[0], chest[1] - hip[1]], 0.22);
    shortsHip.setAttribute('d', `M${r2(hip[0])} ${r2(hip[1])}L${r2(hipTop[0])} ${r2(hipTop[1])}`);

    // rosto de perfil olhando para o bico: olho fechado feliz + sorriso
    const e = add(add(head, fwd, 4.5), up, 2.2);
    const s0 = add(add(head, fwd, 2.5), up, -3.5);
    const s1 = add(add(head, fwd, 8.6), up, -2);
    const sc = add(add(head, fwd, 6.5), up, -6.4);
    eye.setAttribute('d', `M${r2(e[0] - 2.2)} ${r2(e[1])}q2.2 2.2 4.4 0`);
    smile.setAttribute('d', `M${r2(s0[0])} ${r2(s0[1])}Q${r2(sc[0])} ${r2(sc[1])} ${r2(s1[0])} ${r2(s1[1])}`);
    const h0 = add(add(head, up, HEAD_R - 1), fwd, 2);
    const h1 = add(add(head, up, HEAD_R + 3), fwd, -7 - Math.sin(t * 5) * 1.5);
    const h2 = add(add(head, up, HEAD_R - 2), fwd, -12);
    hair.setAttribute('d', `M${r2(h0[0])} ${r2(h0[1])}Q${r2(h1[0])} ${r2(h1[1])} ${r2(h2[0])} ${r2(h2[1])}`);

    // devolve onde está a rabeta (para soltar spray)
    return { tail: add([x, y], d, 46 * scale), d, n };
  }

  return { root, update };
}
