import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { svgEl, smoothPath, r2 } from '../lib/svg.js';
import { createTile, pencilText } from './tile.js';

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

/*
 * Benner: o quadrado enche de "água" azul, o b é escrito à mão
 * e a fatia vermelha dá uma volta em torno do b e se encaixa no lugar.
 * Geometria do b e da fatia: logo oficial (benner.com.br).
 */

const B_PATH =
  'M20.2088 16.0677C15.8314 16.0677 11.7824 17.461 8.47283 19.824V0H0V36.3683C0.019897 39.3502 0.689764 42.1765 1.87364 44.7149L9.25876 40.4589C8.76465 39.188 8.48609 37.8079 8.46951 36.365V36.0969C8.54578 29.6897 13.7688 24.5202 20.2055 24.5202C26.6421 24.5202 31.9447 29.7658 31.9447 36.2359C31.9447 42.0938 27.637 46.9488 22.0094 47.8159V56.3214C32.3228 55.408 40.4142 46.7668 40.4142 36.2359C40.4142 25.0961 31.3677 16.0677 20.2055 16.0677H20.2088Z';
const SLICE_PATH =
  'M18.5538 56.3447V39.1286C18.5538 39.1286 18.5372 39.1054 18.5239 39.112L3.58789 47.7201C7.03008 52.6711 12.5482 55.8516 18.5538 56.348V56.3447Z';

// a marca ocupa ~79% da altura do quadrado, centralizada (como no ícone oficial)
const MARK_SCALE = 1.4;
const MARK_X = 21.7;
const MARK_Y = 10.6;
const MARK = `translate(${MARK_X} ${MARK_Y}) scale(${MARK_SCALE})`;
const toTile = (x, y) => [MARK_X + x * MARK_SCALE, MARK_Y + y * MARK_SCALE];

export function createBenner() {
  const tile = createTile('benner', { label: 'Logo da Benner', seed: 4 });
  const { svg, defs, clipId } = tile;

  // máscara que "escreve" o b: haste de cima para baixo, depois o bojo girando
  const write = svgEl('mask', { id: 'benner-write', maskUnits: 'userSpaceOnUse', x: -10, y: -10, width: 70, height: 80 }, defs);
  const stem = svgEl('path', { d: 'M4.24 -4V47', fill: 'none', stroke: '#fff', 'stroke-width': 9.6 }, write);
  const bowl = svgEl(
    'path',
    { d: 'M4.23 36.24A15.97 15.97 0 0 1 36.17 36.24A15.97 15.97 0 0 1 21.6 52.15', fill: 'none', stroke: '#fff', 'stroke-width': 10.4 },
    write,
  );

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);
  const water = svgEl('path', { fill: 'var(--benner-blue)' }, content);
  const crest = svgEl('path', { fill: 'none', stroke: '#fff', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.55 }, content);
  const mark = svgEl('g', { transform: MARK }, content);
  svgEl('path', { d: B_PATH, fill: '#fff', mask: 'url(#benner-write)' }, mark);

  // rastro da fatia: dá a volta no b e entra no encaixe pela diagonal de baixo
  const end = toTile(11.07, 47.73); // centro da fatia já encaixada
  const route = [
    [126, 6],
    [96, -14],
    [42, -17],
    [-13, 18],
    [-14, 86],
    [10, 106],
    [end[0] - 9, end[1] + 10],
    end,
  ];
  const trail = svgEl(
    'path',
    { d: smoothPath(route), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 0.75, 'stroke-linecap': 'round', filter: tile.lineFilter },
    svg,
  );

  const sliceFly = svgEl('g', {}, svg);
  const sliceNudge = svgEl('g', {}, sliceFly);
  const sliceMark = svgEl('g', { transform: MARK }, sliceNudge);
  svgEl('path', { d: SLICE_PATH, fill: 'var(--benner-red)' }, sliceMark);

  // tracinhos de impacto saindo do encaixe
  const center = toTile(20.2, 36.24);
  const bursts = [128, 146, 164].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const p = (r) => [center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r];
    const [x0, y0] = p(37);
    const [x1, y1] = p(45);
    return svgEl(
      'path',
      { d: `M${r2(x0)} ${r2(y0)}L${r2(x1)} ${r2(y1)}`, stroke: 'var(--ink)', 'stroke-width': 0.85, 'stroke-linecap': 'round', fill: 'none', filter: tile.lineFilter },
      svg,
    );
  });

  const note = svgEl('g', {}, svg);
  pencilText(note, 'click!', { x: -12, y: 113, size: 9, rotate: -10, filter: tile.lineFilter });

  // ---------- água subindo ----------
  const sea = { level: 110, phase: 0 };
  function drawWater() {
    let top = '';
    for (let x = -4; x <= 104; x += 4) {
      const y = sea.level + Math.sin(x * 0.12 + sea.phase) * 2.4 + Math.sin(x * 0.29 - sea.phase * 1.4) * 1.1;
      top += `${top ? 'L' : 'M'}${x} ${r2(y)}`;
    }
    water.setAttribute('d', `${top}L104 112L-4 112Z`);
    crest.setAttribute('d', top);
  }

  // ---------- linha do tempo ----------
  const tl = gsap.timeline({ paused: true });
  tl.set(sliceFly, { autoAlpha: 0 }, 0)
    .set([trail, ...bursts], { drawSVG: '0% 0%', autoAlpha: 1 }, 0)
    .set(note, { autoAlpha: 0 }, 0)
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .fromTo(sea, { level: 110, phase: 0 }, { level: -8, phase: 9, duration: 1.15, ease: 'power2.inOut', onUpdate: drawWater }, 0.25)
    .fromTo(crest, { opacity: 0.55 }, { opacity: 0, duration: 0.3 }, 1.15)
    .fromTo(stem, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.36, ease: 'power2.in' }, 1.2)
    .fromTo(bowl, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power1.inOut' }, 1.52)
    // a fatia dá a volta e encaixa
    .set(sliceFly, { autoAlpha: 1 }, 2.05)
    .fromTo(trail, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.2, ease: 'power1.inOut' }, 2.05)
    .fromTo(
      sliceFly,
      { scale: 0.5, rotation: -460 },
      {
        motionPath: { path: trail, align: trail, alignOrigin: [0.5, 0.5] },
        scale: 1,
        rotation: 0,
        transformOrigin: '50% 50%',
        duration: 1.2,
        ease: 'power1.inOut',
      },
      2.05,
    )
    .to(trail, { drawSVG: '100% 100%', duration: 0.55, ease: 'power2.in' }, 2.8)
    // impacto: o quadrado amassa e volta, tracinhos e "click!"
    .to(content, { scale: 0.95, transformOrigin: '50% 50%', duration: 0.07, ease: 'power2.out' }, 3.25)
    .to(content, { scale: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' }, 3.32)
    .fromTo(sliceNudge, { x: -2.2, y: 3.6 }, { x: 0, y: 0, duration: 0.5, ease: 'back.out(3)' }, 3.25)
    .to(bursts, { drawSVG: '0% 100%', duration: 0.14, stagger: 0.03, ease: 'power2.out' }, 3.27)
    .to(bursts, { drawSVG: '100% 100%', duration: 0.3, stagger: 0.03, ease: 'power2.in' }, 3.48)
    .fromTo(note, { autoAlpha: 0, scale: 0.4, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 3.32)
    // traço apagado ainda deixa a "bolinha" da ponta redonda: some com ele
    .set([trail, ...bursts], { autoAlpha: 0 }, 3.9);

  drawWater();

  // depois de pronto: a fatia "sai" um pouquinho no hover, como gráfico de pizza
  function hover(on) {
    if (tl.progress() < 1) return;
    gsap.to(sliceNudge, { x: on ? -1.5 : 0, y: on ? 2.5 : 0, duration: 0.45, ease: on ? 'back.out(2)' : 'power2.out' });
  }

  return { svg, tl, hover, tile };
}
