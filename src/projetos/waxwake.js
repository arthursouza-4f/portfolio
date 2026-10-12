import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { svgEl, smoothPath, r2, clamp } from '../lib/svg.js';
import { stippleFade } from '../lib/doodle.js';
import { createTile, pencilText } from '../lib/tile.js';
import { frameLoop } from '../lib/loop.js';

gsap.registerPlugin(DrawSVGPlugin);

/*
 * Waxwake: o mar se desenha, uma lufada de vento enche as velas e o
 * veleiro de madeira (como o que se monta na oficina do jogo) entra
 * balançando nas ondas até o meio. Depois fica lá, subindo e descendo.
 */

const INK = 'var(--ink)';
const SEA = 67;
const WOOD = '#e98a2b';
const PLANK = '#b8611a';

/** Altura do mar em x, no instante t. */
const waterY = (x, t) => SEA + 1.5 * Math.sin(x * 0.12 - t * 1.7) + 0.7 * Math.sin(x * 0.27 + t * 1.1);
const slope = (x, t) => 1.5 * 0.12 * Math.cos(x * 0.12 - t * 1.7) + 0.7 * 0.27 * Math.cos(x * 0.27 + t * 1.1);

function waterLine(t, lift = 0, dx = 0) {
  const pts = [];
  for (let x = -4; x <= 104; x += 9) pts.push([x, waterY(x + dx, t) - lift]);
  return pts;
}

export function createWaxwake() {
  const tile = createTile('waxwake', { label: 'Veleiro do Waxwake no mar', seed: 57 });
  const { svg, defs, clipId } = tile;

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);

  const sun = svgEl('g', { filter: tile.artFilter }, content);
  svgEl('circle', { cx: 82, cy: 19, r: 7, fill: '#ffd447', stroke: INK, 'stroke-width': 0.85 }, sun);

  const gull = svgEl('path', { fill: 'none', stroke: INK, 'stroke-width': 0.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: tile.lineFilter }, content);
  const wind = svgEl('g', { fill: 'none', stroke: INK, 'stroke-width': 0.8, 'stroke-linecap': 'round', filter: tile.lineFilter }, content);
  const gusts = [
    'M3 30C10 28 16 29 20 31.5C23.5 33.6 21 37 18.4 35.2C16.6 33.8 18.6 31.4 21.6 31',
    'M0 41.5C8 40 15 40.8 23 42.5',
    'M6 50C11 49 15.5 49.4 19 50.8',
  ].map((d) => svgEl('path', { d }, wind));

  // ondinha de trás (mais clara) e a revelação do mar, da esquerda pra direita
  const reveal = svgEl('rect', { x: -4, y: 0, width: 0, height: 104 }, svgEl('clipPath', { id: 'waxwake-reveal' }, defs));
  const back = svgEl(
    'path',
    { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.45, 'clip-path': 'url(#waxwake-reveal)', filter: tile.lineFilter },
    content,
  );

  // ---------- o veleiro (proa para a direita; origem na linha d'água) ----------
  const boat = svgEl('g', { filter: tile.artFilter, 'stroke-linejoin': 'round' }, content);
  const outline = { stroke: INK, 'stroke-width': 0.85 };
  const mast = svgEl('path', { d: 'M2 -8.6V-46.5', fill: 'none', stroke: INK, 'stroke-width': 1.3, 'stroke-linecap': 'round' }, boat);
  const flag = svgEl('path', { fill: 'var(--sea)', ...outline, 'stroke-width': 0.6 }, boat);
  const main = svgEl('g', {}, boat);
  svgEl('path', { d: 'M1.2 -45L1.2 -12.4L-16.5 -12.4Q-11 -30 1.2 -45Z', fill: '#fbfaf6', ...outline }, main);
  svgEl('path', { d: 'M1.2 -19.5L-13.6 -19.5', fill: 'none', stroke: WOOD, 'stroke-width': 1.6 }, main);
  const jib = svgEl('g', {}, boat);
  svgEl('path', { d: 'M3 -41.5Q14.5 -24.5 19.5 -11.2L3 -11.2Z', fill: WOOD, ...outline }, jib);
  svgEl('path', { d: 'M2 -11.6H-17.6', fill: 'none', stroke: INK, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, boat);
  svgEl('path', { d: 'M-21 -8.2L22.4 -9.8C18.6 -1.4 10 5.2 -1 5.4C-10.4 5.6 -17.6 3.2 -19.6 -1.8Z', fill: WOOD, ...outline }, boat);
  const planks = svgEl('g', { fill: 'none', stroke: PLANK, 'stroke-width': 0.6, 'stroke-linecap': 'round' }, boat);
  svgEl('path', { d: 'M-19.6 -4.6C-6 -3.4 10 -4 19.6 -6.2' }, planks);
  svgEl('path', { d: 'M-17.6 -0.6C-6 0.8 8 0 16 -2' }, planks);
  svgEl('path', { d: 'M-20.6 -6.6L21.6 -8.1', fill: 'none', stroke: 'var(--sea)', 'stroke-width': 1.3 }, boat);

  // ---------- o mar da frente (cobre o fundo do casco) ----------
  const sea = svgEl('g', { 'clip-path': 'url(#waxwake-reveal)' }, content);
  const waterClip = svgEl('path', {}, svgEl('clipPath', { id: 'waxwake-water' }, defs));
  const water = svgEl('path', { fill: '#e6effb' }, sea);
  svgEl(
    'image',
    {
      x: -2,
      y: SEA - 3,
      width: 104,
      height: 36,
      preserveAspectRatio: 'none',
      href: stippleFade({ width: 312, height: 108, color: '#1f66d1', seed: 13, density: 0.2, power: 1.5 }),
      'clip-path': 'url(#waxwake-water)',
    },
    sea,
  );
  const front = svgEl('path', { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 1.5, 'stroke-linecap': 'round', filter: tile.lineFilter }, sea);
  const ripples = svgEl('g', { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.7 }, sea);
  const rippleEls = Array.from({ length: 4 }, () => svgEl('path', {}, ripples));

  // rastro atrás da popa, por cima da água
  const wake = svgEl('path', { fill: 'none', stroke: 'var(--sea)', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, content);

  const note = svgEl('g', {}, svg);
  pencilText(note, 'bons ventos!', { x: -12, y: 114.5, size: 9, rotate: -5, filter: tile.lineFilter });

  // ---------- estado ----------
  // x: posição do barco; sail: velas cheias (0..1); gust: lufada do mouse; wake: rastro; gull: gaivota entrando
  const st = { reveal: 0, x: -30, sail: 0.2, gust: 0, wake: 1, gull: 0 };
  let clock = 0;

  function render() {
    const t = clock;
    reveal.setAttribute('width', r2(108 * st.reveal));

    const pts = waterLine(t);
    const top = smoothPath(pts);
    front.setAttribute('d', top);
    const fill = `${top}L104 104L-4 104Z`;
    water.setAttribute('d', fill);
    waterClip.setAttribute('d', fill);
    back.setAttribute('d', smoothPath(waterLine(t * 0.8, 5.5, 17)));

    rippleEls.forEach((el, i) => {
      const x = ((i * 31 + 140 - t * 4) % 120) - 10;
      const y = SEA + 9 + ((i * 7) % 4) * 4.5 + Math.sin(t + i) * 0.6;
      const w = 2.6 + (i % 2) * 1.4;
      el.setAttribute('d', `M${r2(x - w)} ${r2(y)}q${r2(w / 2)} ${r2(w * 0.5)} ${r2(w)} 0q${r2(w / 2)} ${r2(-w * 0.5)} ${r2(w)} 0`);
    });

    // o barco boia: segue a altura e a inclinação da onda (e aderna com a lufada)
    const bx = st.x;
    const by = waterY(bx, t) + 0.6;
    const heel = (Math.atan(slope(bx, t)) * 180) / Math.PI * 0.8 + st.gust * 5;
    boat.setAttribute('transform', `translate(${r2(bx)} ${r2(by)}) rotate(${r2(heel)}) scale(1.12)`);
    const puff = st.sail * (1 + 0.1 * st.gust);
    main.setAttribute('transform', `translate(1.2 0) scale(${puff.toFixed(3)} 1) translate(-1.2 0)`);
    jib.setAttribute('transform', `translate(3 0) scale(${puff.toFixed(3)} 1) translate(-3 0)`);
    // bandeirinha tremulando no alto do mastro
    const f = Math.sin(t * (7 + st.gust * 6));
    flag.setAttribute('d', `M2 -46.5Q5.5 ${r2(-46.6 + f * 1.1)} 9 ${r2(-45 + f * 0.6)}Q5.5 ${r2(-43.6 - f * 0.6)} 2 -43.3Z`);

    const sx = bx - 23.5;
    const sy = waterY(sx, t) + 0.4;
    wake.setAttribute('d', `M${r2(sx - 1)} ${r2(sy)}q-4 1.4 -9 0.6M${r2(sx + 1)} ${r2(sy + 2)}q-5 1.6 -11 1.4`);
    wake.setAttribute('opacity', r2(st.wake * 0.9));

    // gaivota planando por cima
    const gx = -12 + st.gull * 38 + Math.sin(t * 0.5) * 3;
    const gy = 24 + Math.sin(t * 0.9) * 1.6;
    const flap = Math.sin(t * 5.5);
    const wy = -2.6 + flap * 2;
    gull.setAttribute('d', `M${r2(gx - 5)} ${r2(gy + wy * 0.3)}Q${r2(gx - 2.3)} ${r2(gy + wy)} ${r2(gx)} ${r2(gy)}Q${r2(gx + 2.3)} ${r2(gy + wy)} ${r2(gx + 5)} ${r2(gy + wy * 0.3)}`);
    gull.setAttribute('opacity', r2(clamp(st.gull * 3)));
  }

  const tl = gsap.timeline({ paused: true, onUpdate: render });
  tl.set(st, { reveal: 0, x: -30, sail: 0.2, gust: 0, wake: 1, gull: 0 }, 0)
    .set(sun, { scale: 0, svgOrigin: '82 19' }, 0)
    .set(gusts, { drawSVG: '0% 0%', autoAlpha: 1 }, 0)
    .set(note, { autoAlpha: 0 }, 0)
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .to(st, { reveal: 1, duration: 0.9, ease: 'power2.inOut' }, 0.15)
    .to(sun, { scale: 1, svgOrigin: '82 19', duration: 0.6, ease: 'back.out(2.2)' }, 0.4)
    // a lufada passa e enche as velas
    .to(gusts, { drawSVG: '0% 100%', duration: 0.45, stagger: 0.08, ease: 'power2.out' }, 0.7)
    .to(gusts, { drawSVG: '100% 100%', duration: 0.4, stagger: 0.08, ease: 'power2.in' }, 1.25)
    .set(gusts, { autoAlpha: 0 }, 1.9)
    .to(st, { sail: 1, duration: 0.9, ease: 'elastic.out(1.1, 0.45)' }, 1.0)
    // e o barco entra até o meio
    .to(st, { x: 47, duration: 2.5, ease: 'power2.out' }, 0.75)
    .to(st, { wake: 0, duration: 0.9, ease: 'power1.in' }, 2.4)
    .to(st, { gull: 1, duration: 2.2, ease: 'power2.out' }, 1.2)
    .fromTo(note, { autoAlpha: 0, scale: 0.4, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 2.9);

  frameLoop(svg, (t) => {
    clock = t;
    render();
  });

  // depois de pronto: uma lufada de vento aderna o barco e estufa as velas
  function hover(on) {
    if (!on || tl.progress() < 1 || gsap.isTweening(st)) return;
    gsap
      .timeline({ onUpdate: render })
      .to(st, { gust: 1, duration: 0.35, ease: 'power2.out' })
      .to(st, { gust: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)' });
  }

  return { svg, tl, hover, tile };
}
