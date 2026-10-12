import { svgEl, sketchRoundRect } from '../lib/svg.js';
import { doodleFilter, boil } from '../lib/doodle.js';

/*
 * "Ladrilho" de cada logo: um quadrado 100×100 com cantos arredondados,
 * envolto por uma moldura desenhada à mão (igual ao rascunho). Sobra uma
 * margem em volta para as coisas que entram voando de fora.
 */

export const PAD = 16;
export const RADIUS = 20;

export function createTile(id, { label, seed = 1 }) {
  const size = 100 + PAD * 2;
  const svg = svgEl('svg', {
    viewBox: `${-PAD} ${-PAD} ${size} ${size}`,
    role: 'img',
    'aria-label': label,
  });
  const defs = svgEl('defs', {}, svg);

  const clipId = `${id}-clip`;
  const clip = svgEl('clipPath', { id: clipId }, defs);
  svgEl('rect', { width: 100, height: 100, rx: RADIUS }, clip);

  // "art": sombra granulada + tremido; "line": só o tremido
  const art = doodleFilter(defs, `${id}-art`, { shade: true, rim: 6, soft: 2, wobble: 1.7 });
  const line = doodleFilter(defs, `${id}-line`, { shade: false, wobble: 1.9 });

  const frame = svgEl(
    'path',
    {
      d: sketchRoundRect(-4.5, -4.5, 109, 109, 24, { seed, wobble: 0.5, step: 3, overshoot: 0.07 }),
      fill: 'none',
      stroke: 'var(--ink)',
      'stroke-width': 0.8,
      'stroke-linecap': 'round',
      filter: `url(#${id}-line)`,
    },
    svg,
  );

  function resize() {
    const unit = svg.getBoundingClientRect().width / size || 3;
    art.setUnit(unit);
    line.setUnit(unit);
  }
  new ResizeObserver(resize).observe(svg);

  const boiler = boil(svg, [art.turbulence, line.turbulence]);

  return {
    svg,
    defs,
    clipId,
    frame,
    artFilter: `url(#${id}-art)`,
    lineFilter: `url(#${id}-line)`,
    boiler,
  };
}

/** Texto a lápis dentro do SVG (anotações tipo "click!"). */
export function pencilText(parent, text, { x, y, size = 8, rotate = 0, filter, anchor = 'start' }) {
  const el = svgEl(
    'text',
    {
      x,
      y,
      'font-family': 'Caveat Variable, cursive',
      'font-weight': 600,
      'font-size': size,
      fill: 'var(--pencil)',
      'text-anchor': anchor,
      transform: `rotate(${rotate} ${x} ${y})`,
      filter,
    },
    parent,
  );
  el.textContent = text;
  return el;
}
