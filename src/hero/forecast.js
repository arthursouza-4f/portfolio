import { svgEl, setAttrs, sketchRoundRect, r2, clamp } from '../lib/svg.js';
import github from '../data/github.json';

/*
 * Placa de "previsão das ondas" fincada na areia: o grid de commits do
 * último ano, no verde do GitHub. Os números vêm de `npm run sync:github`.
 * Cada coluna é uma semana (domingo em cima), como no perfil do GitHub.
 */

const GREENS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DAY = 86400000;

/** Níveis 0..4 pelos quartis dos dias com commit (o mesmo critério do GitHub). */
function toLevels(dias) {
  const sorted = dias.filter(Boolean).sort((a, b) => a - b);
  const q = (k) => sorted[Math.floor((sorted.length - 1) * k)] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return dias.map((c) => (!c ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4));
}

const start = Date.parse(`${github.inicio}T00:00:00Z`);
const dateOf = (i) => new Date(start + i * DAY);
const commits = (n) => (n === 0 ? 'nenhum commit' : n === 1 ? '1 commit' : `${n} commits`);

export function createForecast({ parent, defs, overlay }) {
  const dias = github.dias;
  const levels = toLevels(dias);
  const totalCols = Math.ceil(dias.length / 7);

  const root = svgEl('g', {}, parent);
  // madeira (postes + placa) com o sombreado granulado; o grid só treme de leve
  const wood = svgEl('g', { filter: 'url(#hero-prop)' }, root);
  const posts = [0, 1].map(() =>
    svgEl('path', { fill: '#f1cf9c', stroke: 'var(--ink)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, wood),
  );
  const board = svgEl('path', { fill: '#fffaf0', stroke: 'var(--ink)', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, wood);
  const nails = svgEl('g', { fill: 'var(--ink)' }, wood);
  const nailEls = [0, 1, 2, 3].map(() => svgEl('circle', { r: 1.5 }, nails));
  const mounds = svgEl(
    'path',
    { fill: 'none', stroke: 'var(--sand)', 'stroke-width': 2.2, 'stroke-linecap': 'round' },
    wood,
  );

  const face = svgEl('g', { filter: 'url(#hero-soft)' }, root);
  const title = svgEl('text', { class: 'forecast__title' }, face);
  title.textContent = 'previsão das ondas';
  const months = svgEl('g', { class: 'forecast__small' }, face);
  const gridClip = svgEl('clipPath', { id: 'forecast-grid-clip' }, defs);
  const gridClipRect = svgEl('rect', {}, gridClip);
  const grid = svgEl('g', { 'clip-path': 'url(#forecast-grid-clip)' }, face);
  const foot = svgEl('text', { class: 'forecast__foot' }, face);
  foot.textContent = `${commits(github.total)} no último ano`;
  const legend = svgEl('g', {}, face);
  const legendLess = svgEl('text', { class: 'forecast__small', 'text-anchor': 'end' }, legend);
  legendLess.textContent = 'menos';
  const legendMore = svgEl('text', { class: 'forecast__small' }, legend);
  legendMore.textContent = 'mais';
  const legendCells = GREENS.map((fill) => svgEl('rect', { fill }, legend));
  const focus = svgEl('rect', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4, opacity: 0 }, face);

  // camada HTML por cima: dica com o dia e a leitura para leitor de tela
  const hit = document.createElement('div');
  hit.className = 'forecast-hit';
  hit.setAttribute('role', 'img');
  hit.setAttribute('aria-label', `Grid de commits do último ano, no estilo do GitHub: ${commits(github.total)}.`);
  const tip = document.createElement('div');
  tip.className = 'forecast-tip';
  tip.hidden = true;
  overlay.append(hit, tip);

  // geometria atual (para a dica achar a célula sob o ponteiro)
  let g = null;

  function layout(m) {
    const { u, W, horizon, gutter, mobile, copy, maxW } = m;
    const pad = 12 * u;
    const inner = maxW - pad * 2;

    // um ano inteiro se couber; senão, as semanas mais recentes
    let cols = totalCols;
    let pitch = Math.min(6.4 * u, inner / cols);
    const minPitch = Math.max(4.2, 4.4 * u);
    if (pitch < minPitch) {
      cols = Math.max(8, Math.floor(inner / minPitch));
      pitch = inner / cols;
    }
    const gap = Math.max(1, pitch * 0.2);
    const cell = pitch - gap;
    const gridW = cols * pitch - gap;
    const Sw = gridW + pad * 2;
    const gridTop = pad + 37 * u;
    const gridBottom = gridTop + 7 * pitch - gap;
    const footBase = gridBottom + 17 * u;
    const Sh = footBase + 6 * u + pad * 0.6;

    // posição: no desktop, embaixo do título; no celular, na frente do mar
    const x = mobile ? (W - Sw) / 2 : gutter;
    let top = mobile ? horizon + 16 * u : horizon - 4 * u - Sh;
    if (!mobile && copy && x < copy.right && top < copy.bottom + 30) top = copy.bottom + 30;
    const bottom = top + Sh;
    const base = mobile ? bottom + 18 * u : Math.max(horizon + 40 * u, bottom + 24 * u);

    board.setAttribute('d', sketchRoundRect(x, top, Sw, Sh, 8 * u, { seed: 4, wobble: 0.7, step: 12 }));
    const inset = 6 * u;
    [
      [x + inset, top + inset],
      [x + Sw - inset, top + inset],
      [x + inset, bottom - inset],
      [x + Sw - inset, bottom - inset],
    ].forEach(([cx, cy], i) => setAttrs(nailEls[i], { cx: r2(cx), cy: r2(cy) }));

    // dois postes enterrados, um pouco tortos
    const postW = 9 * u;
    let moundD = '';
    [0.2, 0.8].forEach((k, i) => {
      const px = x + Sw * k;
      const lean = (i ? 1.5 : -1) * u;
      const t = top + Sh * 0.4;
      posts[i].setAttribute(
        'd',
        `M${r2(px - postW / 2)} ${r2(t)}L${r2(px + postW / 2)} ${r2(t + 1)}L${r2(px + postW / 2 + lean)} ${r2(base)}L${r2(px - postW / 2 + lean)} ${r2(base + 0.5)}Z`,
      );
      const mx = px + lean;
      moundD += `M${r2(mx - postW * 1.6)} ${r2(base + 3)}Q${r2(mx - postW * 0.6)} ${r2(base - 4)} ${r2(mx)} ${r2(base - 3)}Q${r2(mx + postW * 0.7)} ${r2(base - 4)} ${r2(mx + postW * 1.7)} ${r2(base + 3)}`;
    });
    mounds.setAttribute('d', moundD);

    const gx = x + pad;
    const gy = top + gridTop;
    setAttrs(title, { x: r2(gx - 1), y: r2(top + pad + 17 * u), 'font-size': r2(22 * u) });

    // células: só as semanas que cabem, terminando hoje
    const firstCol = totalCols - cols;
    grid.replaceChildren();
    months.replaceChildren();
    months.setAttribute('font-size', r2(8.5 * u));
    let lastMonth = -1;
    let lastLabelCol = -9;
    for (let c = 0; c < cols; c++) {
      const col = firstCol + c;
      const month = dateOf(col * 7).getUTCMonth();
      if (month !== lastMonth) {
        // como no GitHub: mês cortado no começo do grid fica sem rótulo,
        // e um rótulo só entra se houver espaço até o anterior
        const cut = c === 0 && dateOf(col * 7).getUTCDate() > 7;
        if (!cut && c - lastLabelCol >= 3 && c < cols - 1) {
          const label = svgEl('text', { x: r2(gx + c * pitch), y: r2(gy - 4 * u) }, months);
          label.textContent = MESES[month];
          lastLabelCol = c;
        }
        lastMonth = month;
      }
      for (let r = 0; r < 7; r++) {
        const i = col * 7 + r;
        if (i >= dias.length) break;
        svgEl(
          'rect',
          {
            x: r2(gx + c * pitch),
            y: r2(gy + r * pitch),
            width: r2(cell),
            height: r2(cell),
            rx: r2(cell * 0.24),
            fill: GREENS[levels[i]],
          },
          grid,
        );
      }
    }
    setAttrs(gridClipRect, { x: r2(gx - 2), y: r2(gy - 2), height: r2(7 * pitch + 4) });

    setAttrs(foot, { x: r2(gx - 1), y: r2(top + footBase), 'font-size': r2(16 * u) });
    // legenda "menos ▪▪▪▪▪ mais" alinhada à direita
    const ls = cell;
    const lx = gx + gridW - 22 * u - GREENS.length * pitch;
    const ly = top + footBase - ls - 1 * u;
    legendCells.forEach((el, i) =>
      setAttrs(el, { x: r2(lx + i * pitch), y: r2(ly), width: r2(ls), height: r2(ls), rx: r2(ls * 0.24) }),
    );
    setAttrs(legendLess, { x: r2(lx - 4 * u), y: r2(ly + ls), 'font-size': r2(8.5 * u) });
    setAttrs(legendMore, { x: r2(lx + GREENS.length * pitch + 3 * u), y: r2(ly + ls), 'font-size': r2(8.5 * u) });

    g = { x, top, Sw, Sh, gx, gy, gridW, pitch, cell, cols, firstCol, u };

    Object.assign(hit.style, {
      left: `${r2(gx - pitch / 2)}px`,
      top: `${r2(gy - pitch / 2)}px`,
      width: `${r2(gridW + pitch)}px`,
      height: `${r2(7 * pitch + pitch)}px`,
    });
    hideTip();

    return { x, top, right: x + Sw, bottom, base };
  }

  function cellAt(clientX, clientY) {
    const box = overlay.getBoundingClientRect();
    const px = clientX - box.left;
    const py = clientY - box.top;
    const c = Math.floor((px - g.gx) / g.pitch);
    const r = Math.floor((py - g.gy) / g.pitch);
    if (c < 0 || c >= g.cols || r < 0 || r > 6) return null;
    const i = (g.firstCol + c) * 7 + r;
    if (i >= dias.length) return null;
    return { c, r, i };
  }

  function showTip(hitCell) {
    const { c, r, i } = hitCell;
    const d = dateOf(i);
    tip.textContent = `${commits(dias[i])} · ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
    tip.hidden = false;
    const cx = g.gx + c * g.pitch + g.cell / 2;
    const cy = g.gy + r * g.pitch;
    tip.style.left = `${r2(cx)}px`;
    tip.style.top = `${r2(cy - 6)}px`;
    setAttrs(focus, {
      x: r2(g.gx + c * g.pitch - 1),
      y: r2(cy - 1),
      width: r2(g.cell + 2),
      height: r2(g.cell + 2),
      rx: r2(g.cell * 0.3),
      opacity: 1,
    });
  }

  function hideTip() {
    tip.hidden = true;
    focus.setAttribute('opacity', 0);
  }

  hit.addEventListener('pointermove', (e) => {
    const found = g && cellAt(e.clientX, e.clientY);
    if (found) showTip(found);
    else hideTip();
  });
  hit.addEventListener('pointerdown', (e) => {
    const found = g && cellAt(e.clientX, e.clientY);
    if (found) showTip(found);
  });
  hit.addEventListener('pointerleave', hideTip);

  function update(state) {
    const s = state.sign;
    root.setAttribute('opacity', r2(clamp(s * 3)));
    root.setAttribute('transform', `translate(0 ${r2((1 - s) * 18 * (g?.u ?? 1))})`);
    if (g) gridClipRect.setAttribute('width', r2((g.gridW + 4) * clamp(state.grid)));
  }

  return { layout, update };
}
