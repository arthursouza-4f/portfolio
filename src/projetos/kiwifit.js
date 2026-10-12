import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { svgEl, smoothPath, r2, lerp, clamp } from '../lib/svg.js';
import { createTile } from '../lib/tile.js';
import { frameLoop } from '../lib/loop.js';

gsap.registerPlugin(DrawSVGPlugin);

/*
 * KiwiFit: o Ki, mascote (e IA) do app, pula lá de baixo, amortece e dá
 * um "oi!" com o bracinho, de olhos felizes. Depois fica respirando e
 * piscando; passar o mouse faz ele acenar de novo.
 * Proporções e gestos copiados do modelo 3D do app (kiRig/kiGeometry).
 */

const FUR = '#8CC63F';
const INK = 'var(--ink)';
const LINE = 0.95;

// 1 unidade do modelo 3D = S unidades do ladrilho; o corpo vai de y -1,1 a 1,18
const S = 24.5;
const BOTTOM = 83;
const FLOOR = 86.2; // sola dos pés
const P = (x, y) => [50 + x * S, BOTTOM - (y + 1.1) * S];

// perfil do corpo de baixo para cima: [altura, raio]
const PROFILE = [
  [-1.1, 0],
  [-1.07, 0.4],
  [-0.98, 0.68],
  [-0.78, 0.87],
  [-0.48, 0.955],
  [-0.15, 0.97],
  [0.2, 0.94],
  [0.52, 0.86],
  [0.8, 0.7],
  [1.0, 0.48],
  [1.13, 0.24],
  [1.18, 0],
];

const SHOULDER = P(0.8, -0.16);
// no "oi" o pivô do braço sobe para o lado da cabeça (senão ele giraria escondido no corpo)
const REACH = P(0.96, 0.23);
const EYES = [-1, 1].map((side) => P(0.39 * side, 0.3));
// balanço do aceno (graus): sobe, sacode três vezes e para no alto
const SHAKE = [-112, -149, -112, -149, -112, -132];

function bodyPath() {
  const right = [...PROFILE].reverse().map(([y, r]) => P(r, y));
  const left = PROFILE.slice(1, -1).map(([y, r]) => P(-r, y));
  return smoothPath([...right, ...left], { closed: true });
}

export function createKiwiFit() {
  const tile = createTile('kiwifit', { label: 'Ki, o mascote do KiwiFit, dando oi', seed: 21 });
  const { svg, clipId } = tile;

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);
  const halo = svgEl('circle', { cx: 50, cy: 57, r: 0, fill: '#e3f0cd' }, content);
  const shadow = svgEl('ellipse', { cx: 50, cy: FLOOR + 0.3, rx: 17, ry: 2.4, fill: INK, opacity: 0.13 }, content);

  const outline = { stroke: INK, 'stroke-width': LINE, 'stroke-linejoin': 'round' };
  const ki = svgEl('g', { filter: tile.artFilter }, content);
  const pose = svgEl('g', {}, ki);

  for (const side of [-1, 1]) {
    const [x, y] = P(0.3 * side, -1.06);
    svgEl('ellipse', { cx: r2(x), cy: r2(y), rx: 0.25 * S, ry: 0.17 * S, fill: FUR, ...outline }, pose);
  }
  svgEl('path', { d: bodyPath(), fill: FUR, ...outline }, pose);

  // braços: bolinhas penduradas no ombro, um pouco abertas
  const arm = (parent, side) =>
    svgEl(
      'ellipse',
      {
        cx: r2(0.11 * S * side),
        cy: r2(0.14 * S),
        rx: r2(0.2 * S),
        ry: r2(0.26 * S),
        transform: `rotate(${-20 * side} ${r2(0.11 * S * side)} ${r2(0.14 * S)})`,
        fill: FUR,
        ...outline,
      },
      parent,
    );
  const [lx, ly] = P(-0.8, -0.16);
  arm(svgEl('g', { transform: `translate(${r2(lx)} ${r2(ly)})` }, pose), -1);
  const rightArm = svgEl('g', {}, pose);
  arm(rightArm, 1);

  // rosto: olhos ovais com brilho, olhos felizes "^" e o sorriso fininho
  const openEyes = svgEl('g', { fill: INK }, pose);
  const lids = EYES.map(([x, y]) => {
    const g = svgEl('g', { transform: `translate(${r2(x)} ${r2(y)})` }, openEyes);
    svgEl('ellipse', { rx: r2(0.118 * S), ry: r2(0.172 * S) }, g);
    svgEl('ellipse', { cx: -0.86, cy: -1.7, rx: 0.8, ry: 0.9, fill: '#fff' }, g);
    return { g, x, y };
  });
  const happyEyes = svgEl(
    'g',
    { fill: 'none', stroke: INK, 'stroke-width': 1.3, 'stroke-linecap': 'round', visibility: 'hidden' },
    pose,
  );
  for (const [x, y] of EYES) svgEl('path', { d: `M${r2(x - 2.2)} ${r2(y + 0.5)}q2.2 -3.7 4.4 0` }, happyEyes);
  const [s0x, s0y] = P(-0.157, 0.15);
  const [s1x] = P(0.157, 0.15);
  svgEl(
    'path',
    { d: `M${r2(s0x)} ${r2(s0y)}Q50 ${r2(s0y + 3.4)} ${r2(s1x)} ${r2(s0y)}`, fill: 'none', stroke: INK, 'stroke-width': 1.2, 'stroke-linecap': 'round' },
    pose,
  );

  // tracinhos de "tchauzinho" do lado da mão
  const waves = svgEl('g', { fill: 'none', stroke: INK, 'stroke-width': 0.85, 'stroke-linecap': 'round', filter: tile.lineFilter }, content);
  const waveLines = ['M80.6 35.6q2.6 2.8 1.2 6.4', 'M84.4 33.4q3.8 4 1.8 9.4'].map((d) => svgEl('path', { d, opacity: 0 }, waves));

  // balão "oi!" (passa um pouco da moldura, como num gibi)
  const bubble = svgEl('g', {}, svg);
  svgEl(
    'path',
    {
      d: 'M80.5 2.5H91A8.6 8.6 0 0 1 91 19.7H84.2L68.6 28.4L77.6 19.2A8.6 8.6 0 0 1 80.5 2.5Z',
      fill: '#fff',
      stroke: INK,
      'stroke-width': 0.9,
      'stroke-linejoin': 'round',
      filter: tile.lineFilter,
    },
    bubble,
  );
  const hi = svgEl(
    'text',
    { x: 86, y: 15.3, 'text-anchor': 'middle', 'font-family': 'Caveat Variable, cursive', 'font-weight': 700, 'font-size': 12.5, fill: INK },
    bubble,
  );
  hi.textContent = 'oi!';

  // ---------- estado (a linha do tempo mexe aqui; `render` desenha) ----------
  const st = { drop: 75, sx: 1, sy: 1, tilt: 0, reach: 0, arm: 0, happy: 0, waving: 0, bubble: 0, halo: 0 };
  let clock = 0;
  let blinkStart = -1;
  let nextBlink = 2.2;

  function render() {
    const breath = Math.sin((clock / 2.8) * Math.PI * 2);
    const sx = st.sx * (1 + 0.012 * breath);
    const sy = st.sy * (1 + 0.02 * breath);
    pose.setAttribute(
      'transform',
      `translate(50 ${r2(FLOOR + st.drop)}) rotate(${r2(st.tilt)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-50 ${-FLOOR})`,
    );
    // a sombra só aparece com ele perto do chão (e encolhe no alto do pulo)
    const near = st.drop > 0 ? clamp(1 - st.drop / 10) : clamp(1 + st.drop / 40);
    shadow.setAttribute('rx', r2(17 * (0.6 + 0.4 * near) * st.sx));
    shadow.setAttribute('opacity', r2(0.13 * near));
    halo.setAttribute('r', r2(34 * st.halo));

    const px = lerp(SHOULDER[0], REACH[0], st.reach);
    const py = lerp(SHOULDER[1], REACH[1], st.reach);
    rightArm.setAttribute('transform', `translate(${r2(px)} ${r2(py)}) rotate(${r2(st.arm)})`);

    const happy = st.happy > 0.5;
    openEyes.setAttribute('visibility', happy ? 'hidden' : 'visible');
    happyEyes.setAttribute('visibility', happy ? 'visible' : 'hidden');
    const b = blinkStart < 0 ? 1 : (clock - blinkStart) / 0.17;
    const lid = b >= 1 ? 1 : Math.max(0.08, Math.abs(1 - 2 * b));
    for (const { g, x, y } of lids) g.setAttribute('transform', `translate(${r2(x)} ${r2(y)}) scale(1 ${r2(lid)})`);

    const beat = Math.floor(clock * 7) % 2;
    waveLines.forEach((el, i) => el.setAttribute('opacity', r2(st.waving * (i === beat ? 1 : 0.25))));
    bubble.setAttribute('transform', `translate(68.6 28.4) scale(${r2(st.bubble)}) translate(-68.6 -28.4)`);
    bubble.setAttribute('visibility', st.bubble > 0.01 ? 'visible' : 'hidden');
  }

  /** O "oi": inclina de leve, levanta o braço, sacode e volta. */
  function greet(t, at) {
    return t
      .to(st, { tilt: 5, duration: 0.3, ease: 'power2.out' }, at)
      .to(st, { reach: 1, arm: -132, duration: 0.28, ease: 'power2.out' }, at)
      .set(st, { happy: 1 }, at + 0.12)
      .to(st, { keyframes: SHAKE.map((a) => ({ arm: a, duration: 0.17, ease: 'sine.inOut' })) }, at + 0.28)
      .to(st, { waving: 1, duration: 0.1 }, at + 0.3)
      .to(st, { waving: 0, duration: 0.15 }, at + 1.25)
      .to(st, { reach: 0, arm: 0, tilt: 0, duration: 0.38, ease: 'power2.inOut' }, at + 1.3)
      .set(st, { happy: 0 }, at + 1.8);
  }

  let greeting = null;
  const tl = gsap.timeline({ paused: true, onUpdate: render, onStart: () => greeting?.kill() });
  tl.set(st, { drop: 75, sx: 1, sy: 1, tilt: 0, reach: 0, arm: 0, happy: 0, waving: 0, bubble: 0, halo: 0 }, 0)
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .to(st, { halo: 1, duration: 0.7, ease: 'back.out(1.6)' }, 0.25)
    // pula lá de baixo, esticado...
    .to(st, { drop: -15, duration: 0.42, ease: 'power2.out' }, 0.55)
    .to(st, { sx: 0.92, sy: 1.1, duration: 0.2, ease: 'power1.out' }, 0.55)
    .to(st, { sx: 1, sy: 1, duration: 0.22 }, 0.78)
    .to(st, { drop: 0, duration: 0.28, ease: 'power2.in' }, 0.97)
    // ...e amortece na volta
    .to(st, { sx: 1.13, sy: 0.85, duration: 0.07, ease: 'power2.out' }, 1.25)
    .to(st, { sx: 1, sy: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.35)' }, 1.32)
    .to(st, { bubble: 1, duration: 0.45, ease: 'back.out(2.2)' }, 1.95);
  greet(tl, 1.65);

  // respira e pisca de vez em quando, como no app
  frameLoop(svg, (t) => {
    clock = t;
    if (t >= nextBlink) {
      blinkStart = t;
      nextBlink = t + 1.9 + Math.random() * 3;
    }
    render();
  });

  function hover(on) {
    if (!on || tl.progress() < 1 || greeting?.isActive()) return;
    greeting = greet(gsap.timeline({ onUpdate: render }), 0);
  }

  return { svg, tl, hover, tile };
}
