import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { svgEl } from '../lib/svg.js';
import { createTile, pencilText } from './tile.js';

gsap.registerPlugin(DrawSVGPlugin);

/*
 * Lince: o vermelho abre do centro como uma íris, os dois "L" entram
 * deslizando — um pela esquerda, outro pela direita — e se encontram
 * no meio. Quando se encontram, os "olhos" piscam: fecham e abrem.
 */

// os dois "L" da logo (diagonal grossa + base fina)
const L_LEFT = 'M13 37H29L47.4 53.2V55.4H7.2V53.2H31.4Z';
const L_RIGHT = 'M87 37H71L52.6 53.2V55.4H92.8V53.2H68.6Z';
// rastros brancos atrás do L da esquerda (o da direita é espelhado)
const TRAILS = 'M-8 40H8M0 46.5H18M-16 54.3H2';
const MIRROR = 'scale(-1 1) translate(-100 0)';
// a "pálpebra" fecha em direção à base dos L
const LID = '50 54.3';
const TRAVEL = 70;

export function createLince() {
  const tile = createTile('lince', { label: 'Logo da Lince', seed: 11 });
  const { svg, clipId } = tile;

  const content = svgEl('g', { 'clip-path': `url(#${clipId})` }, svg);
  svgEl('rect', { width: 100, height: 100, fill: 'var(--paper-hi)' }, content);
  const red = svgEl('circle', { cx: 50, cy: 50, r: 0, fill: 'var(--lince-red)' }, content);

  const eyes = svgEl('g', {}, content);
  const sliders = [L_LEFT, L_RIGHT].map((d, i) => {
    const slider = svgEl('g', {}, eyes);
    const trail = svgEl(
      'path',
      { d: TRAILS, transform: i ? MIRROR : null, fill: 'none', stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round' },
      slider,
    );
    svgEl('path', { d, fill: '#fff' }, slider);
    return { slider, trail };
  });
  const [left, right] = sliders;
  const trails = sliders.map((s) => s.trail);

  // faísca no ponto onde os dois se encontram
  const spark = svgEl(
    'path',
    { d: 'M0 -4.6Q.5 -.5 4.6 0Q.5 .5 0 4.6Q-.5 .5 -4.6 0Q-.5 -.5 0 -4.6Z', fill: '#fff' },
    svgEl('g', { transform: 'translate(50 54.3)' }, content),
  );

  const note = svgEl('g', {}, svg);
  pencilText(note, 'pisc!', { x: -12, y: 113, size: 9, rotate: -10, filter: tile.lineFilter });

  const tl = gsap.timeline({ paused: true });
  tl.set(red, { attr: { r: 0 } }, 0)
    .set(left.slider, { x: -TRAVEL }, 0)
    .set(right.slider, { x: TRAVEL }, 0)
    .set(eyes, { scaleY: 1, svgOrigin: LID }, 0)
    .set(trails, { drawSVG: '0% 100%', autoAlpha: 1 }, 0)
    .set(spark, { scale: 0, rotation: 0, transformOrigin: '50% 50%' }, 0)
    .set(note, { autoAlpha: 0 }, 0)
    // moldura se desenha e o vermelho abre do centro
    .fromTo(tile.frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
    .to(red, { attr: { r: 72 }, duration: 0.6, ease: 'power3.inOut' }, 0.3)
    // os L entram de lados opostos e chegam a encostar um no outro
    .to(left.slider, { x: 1.3, duration: 0.7, ease: 'power3.out' }, 0.85)
    .to(right.slider, { x: -1.3, duration: 0.7, ease: 'power3.out' }, 0.85)
    .to(trails, { drawSVG: '100% 100%', duration: 0.3, ease: 'power2.in' }, 1.3)
    .set(trails, { autoAlpha: 0 }, 1.6)
    // encontro: voltam pro lugar com um quiquinho, o quadrado sente o tranco
    .to([left.slider, right.slider], { x: 0, duration: 0.55, ease: 'elastic.out(1.1, 0.45)' }, 1.55)
    .to(content, { scale: 0.96, transformOrigin: '50% 50%', duration: 0.07, ease: 'power2.out' }, 1.55)
    .to(content, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.35)' }, 1.62)
    .to(spark, { scale: 1, rotation: 90, duration: 0.22, ease: 'back.out(3)' }, 1.55)
    .to(spark, { scale: 0, rotation: 180, duration: 0.2, ease: 'power2.in' }, 1.8)
    // e piscam: fecham e abrem
    .to(eyes, { scaleY: 0.08, svgOrigin: LID, duration: 0.1, ease: 'power2.in' }, 2.15)
    .to(eyes, { scaleY: 1, svgOrigin: LID, duration: 0.24, ease: 'back.out(2.2)' }, 2.33)
    .fromTo(note, { autoAlpha: 0, scale: 0.4, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 2.2);

  // depois de pronto: pisca de novo quando o mouse passa por cima
  function hover(on) {
    if (!on || tl.progress() < 1) return;
    gsap
      .timeline()
      .to(eyes, { scaleY: 0.08, svgOrigin: LID, duration: 0.09, ease: 'power2.in' })
      .to(eyes, { scaleY: 1, svgOrigin: LID, duration: 0.22, ease: 'back.out(2.2)' }, '+=0.06');
  }

  return { svg, tl, hover, tile };
}
