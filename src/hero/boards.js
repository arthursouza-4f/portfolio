import { svgEl, setAttrs, r2, clamp } from '../lib/svg.js';
import { reducedMotion } from '../lib/doodle.js';
import { ago } from '../lib/tempo.js';
import { projetos, vitrine } from '../data/projetos.js';
import github from '../data/github.json';

/*
 * Pranchas fincadas na areia, uma por projeto. Passar o mouse (ou focar
 * pelo teclado) faz a prancha balançar e abre uma plaquinha com o projeto.
 * Clicar leva até o projeto na seção de projetos (os da `vitrine`); nos
 * outros, a plaquinha abre e fecha no clique.
 */

const INK = '#151515';
const WIDTH = 34;
const LENGTH = 150;
// quanto cada uma está "mais para frente" na areia, e a inclinação (graus)
const DEPTH = [22, 36, 16, 40, 27];
const TILT = [-6, 4, -2.5, 7, -4.5];

const LOCK_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';

/** Contorno da prancha em pé: sai da areia (y = 0), sobe até o bico e volta. */
function hullPath(w, L) {
  const h = w / 2;
  return (
    `M${r2(-h * 0.86)} 2` +
    `C${r2(-h * 1.02)} ${r2(-L * 0.25)} ${r2(-h * 1.04)} ${r2(-L * 0.55)} ${r2(-h * 0.8)} ${r2(-L * 0.8)}` +
    `C${r2(-h * 0.58)} ${r2(-L * 0.96)} ${r2(-h * 0.18)} ${r2(-L)} 0 ${r2(-L)}` +
    `C${r2(h * 0.18)} ${r2(-L)} ${r2(h * 0.58)} ${r2(-L * 0.96)} ${r2(h * 0.8)} ${r2(-L * 0.8)}` +
    `C${r2(h * 1.04)} ${r2(-L * 0.55)} ${r2(h * 1.02)} ${r2(-L * 0.25)} ${r2(h * 0.86)} 2` +
    `Q0 -3 ${r2(-h * 0.86)} 2Z`
  );
}

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function renderCard(p, linked) {
  const card = document.createElement('div');
  card.className = 'board-card';
  card.id = `board-card-${p.id}`;
  card.hidden = true;

  const meta = document.createElement('p');
  meta.className = 'board-card__meta';
  const when = ago(github.projetos?.[p.id]?.ultimoCommit);
  meta.textContent = when ? `último commit ${when}` : 'ainda sem commits';

  const name = document.createElement('h3');
  name.className = 'board-card__name';
  name.textContent = p.nome;

  const desc = document.createElement('p');
  desc.className = 'board-card__desc';
  if (p.resumo) desc.textContent = p.resumo;
  else {
    const pending = document.createElement('span');
    pending.className = 'is-pending';
    pending.textContent = 'uma linha sobre o projeto';
    desc.append(pending);
  }

  const tags = document.createElement('ul');
  tags.className = 'board-card__tags';
  tags.setAttribute('aria-label', 'Tecnologias');
  for (const tech of p.stack) {
    const li = document.createElement('li');
    li.textContent = tech;
    tags.append(li);
  }

  let foot;
  if (linked) {
    foot = document.createElement('p');
    foot.className = 'board-card__hint';
    foot.innerHTML = 'clique na prancha pra ver <span aria-hidden="true">↓</span>';
  } else if (p.url) {
    foot = document.createElement('a');
    foot.className = 'board-card__link';
    foot.href = p.url;
    foot.target = '_blank';
    foot.rel = 'noopener';
    foot.innerHTML = 'ver no GitHub <span aria-hidden="true">↗</span>';
  } else {
    foot = document.createElement('p');
    foot.className = 'board-card__private';
    foot.innerHTML = `${LOCK_ICON}<span>repositório privado</span>`;
  }

  card.append(meta, name, desc, tags, foot);
  return card;
}

export function createBoards({ parent, defs, overlay }) {
  const layer = svgEl('g', { filter: 'url(#hero-prop)' }, parent);
  const sand = svgEl('g', { fill: 'var(--sand)' }, parent);

  const list = document.createElement('ul');
  list.className = 'hero__boards';
  list.setAttribute('aria-label', 'Projetos');
  overlay.append(list);

  const items = projetos.map((p, i) => {
    const outer = svgEl('g', {});
    const inner = svgEl('g', {}, outer);
    const clip = svgEl('path', {}, svgEl('clipPath', { id: `board-clip-${p.id}` }, defs));
    const hull = svgEl('path', { fill: p.prancha.casco }, inner);
    const paint = svgEl('g', { 'clip-path': `url(#board-clip-${p.id})`, fill: p.prancha.faixa }, inner);
    const stripe = svgEl('rect', {}, paint);
    const pin = svgEl('rect', {}, paint);
    // contorno por cima da pintura, para a faixa não cobrir a borda
    const outline = svgEl('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, inner);
    const label = svgEl(
      'text',
      { class: 'board__label', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: isDark(p.prancha.casco) ? '#fff' : INK },
      inner,
    );
    label.textContent = p.apelido;
    const mound = svgEl('path', { fill: 'none', stroke: 'var(--sand)', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, outer);

    const li = document.createElement('li');
    // com espaço na seção de projetos: a prancha é um link até lá
    const linked = vitrine.includes(p.id);
    const hit = document.createElement(linked ? 'a' : 'button');
    hit.className = 'board-hit';
    if (linked) {
      hit.href = `#projeto-${p.id}`;
      hit.setAttribute('aria-label', `${p.nome}: ver o projeto`);
      hit.setAttribute('aria-describedby', `board-card-${p.id}`);
    } else {
      hit.type = 'button';
      hit.setAttribute('aria-expanded', 'false');
      hit.setAttribute('aria-controls', `board-card-${p.id}`);
      hit.setAttribute('aria-label', p.nome);
    }
    const card = renderCard(p, linked);
    li.append(hit, card);
    list.append(li);

    return {
      p,
      i,
      outer,
      inner,
      clip,
      hull,
      stripe,
      pin,
      outline,
      label,
      mound,
      li,
      hit,
      card,
      linked,
      depth: DEPTH[i % DEPTH.length],
      tilt: TILT[i % TILT.length],
      // mola do balanço (graus, graus/s)
      a: 0,
      v: 0,
      landed: false,
      geo: null,
    };
  });
  // as mais "de trás" são desenhadas primeiro
  [...items].sort((a, b) => a.depth - b.depth).forEach((it) => layer.append(it.outer));

  // grãos de areia que pulam quando a prancha é cutucada
  const grains = Array.from({ length: 18 }, () => svgEl('circle', { r: 0, opacity: 0 }, sand));
  const flying = [];

  let W = 0;
  let H = 0;
  let u = 1;

  function layout(m) {
    ({ W, H, u } = m);
    const n = items.length;
    // no celular sobra pouca areia: pranchas mais finas, mas compridas (tem céu livre em cima)
    const scale = m.mobile ? 0.85 : 1;
    const w = WIDTH * u * scale;
    const avail = Math.max(0, m.to - m.from);
    const spacing = clamp((avail - w) / (n - 1), m.mobile ? w + 2 : w * 0.9, w + 18 * u);
    const span = spacing * (n - 1) + w;
    const x0 = m.from + Math.max(0, (avail - span) / 2) + w / 2;

    for (const it of items) {
      const x = x0 + it.i * spacing;
      const base = m.horizon + it.depth * u * scale;
      let L = LENGTH * u * (m.mobile ? 1.1 : 1) * it.p.prancha.tamanho;
      // não deixa a prancha subir por cima do título
      const c = m.copy;
      if (c && x + w > c.left && x - w < c.right) L = Math.min(L, base - (c.bottom + 18));
      L = Math.max(L, 60 * u * scale);
      // lado a lado e quase retas no celular, senão os bicos se cruzam
      const tilt = it.tilt * (m.mobile ? 0.3 : 1);
      it.geo = { x, base, L, w, tilt };

      it.outer.setAttribute('transform', `translate(${r2(x)} ${r2(base)})`);
      const d = hullPath(w, L);
      it.clip.setAttribute('d', d);
      it.hull.setAttribute('d', d);
      it.outline.setAttribute('d', d);
      setAttrs(it.stripe, { x: r2(-w), y: r2(-L * 0.8), width: r2(w * 2), height: r2(L * 0.075) });
      setAttrs(it.pin, { x: r2(-w), y: r2(-L * 0.69), width: r2(w * 2), height: r2(Math.max(1.6, L * 0.014)) });
      const fs = Math.min(17 * u * scale, w * 0.55);
      setAttrs(it.label, {
        'font-size': r2(fs),
        transform: `translate(0 ${r2(-L * 0.36)}) rotate(-90)`,
      });
      it.mound.setAttribute(
        'd',
        `M${r2(-w * 0.95)} 4Q${r2(-w * 0.5)} -4 0 -3Q${r2(w * 0.5)} -4 ${r2(w * 0.95)} 4`,
      );

      const top = base - L * Math.cos((tilt * Math.PI) / 180);
      Object.assign(it.hit.style, {
        left: `${r2(x - w / 2 - 5)}px`,
        top: `${r2(top - 4)}px`,
        width: `${r2(w + 10)}px`,
        height: `${r2(base - top + 10)}px`,
      });
      if (!it.card.hidden) placeCard(it);
    }
  }

  // ---------- plaquinha ----------
  let open = null;
  let pinned = false;
  let hideTimer = 0;

  function placeCard(it) {
    const { x, base, L } = it.geo;
    // a plaquinha abre para a direita, no céu vazio entre o título e a onda
    const cw = it.card.offsetWidth || 290;
    const left = clamp(x - 40, 12, W - cw - 12);
    it.card.style.left = `${r2(left)}px`;
    it.card.style.bottom = `${r2(H - (base - L) + 16)}px`;
    it.card.style.setProperty('--tail', `${r2(x - left)}px`);
  }

  function kick(it, dir = 1) {
    it.v += dir * (70 + Math.random() * 40);
    burst(it);
  }

  function show(it, pin = false) {
    clearTimeout(hideTimer);
    if (open && open !== it) hide(open);
    if (open !== it) kick(it, it.i % 2 ? 1 : -1);
    open = it;
    pinned = pin;
    it.card.hidden = false;
    if (!it.linked) it.hit.setAttribute('aria-expanded', 'true');
    placeCard(it);
  }

  function hide(it) {
    it.card.hidden = true;
    if (!it.linked) it.hit.setAttribute('aria-expanded', 'false');
    if (open === it) {
      open = null;
      pinned = false;
    }
  }

  const hideSoon = (it) => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => !pinned && hide(it), 180);
  };

  for (const it of items) {
    it.hit.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && show(it));
    it.hit.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && hideSoon(it));
    it.card.addEventListener('pointerenter', () => clearTimeout(hideTimer));
    it.card.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && hideSoon(it));
    it.hit.addEventListener('click', (e) => {
      if (it.linked) {
        e.preventDefault();
        goTo(it);
      } else if (open === it && pinned) hide(it);
      else show(it, true);
    });
    it.hit.addEventListener('focus', () => open !== it && show(it));
    it.li.addEventListener('focusout', (e) => !it.li.contains(e.relatedTarget) && hide(it));
  }

  /** Rola até o projeto na seção de projetos e avisa a seção para rever a animação. */
  function goTo(it) {
    kick(it, it.i % 2 ? 1 : -1);
    hide(it);
    const target = document.getElementById(`projeto-${it.p.id}`);
    if (!target) return;
    history.pushState(null, '', `#projeto-${it.p.id}`);
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    document.dispatchEvent(new CustomEvent('projeto:ver', { detail: it.p.id }));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open) return;
    const it = open;
    hide(it);
    it.hit.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !open.li.contains(e.target)) hide(open);
  });

  // ---------- animação ----------
  function burst(it) {
    if (!it.geo) return;
    for (let k = 0; k < 6; k++) {
      flying.push({
        x: it.geo.x + (Math.random() - 0.5) * it.geo.w,
        y: it.geo.base - 2,
        vx: (Math.random() - 0.5) * 90,
        vy: -60 - Math.random() * 90,
        r: 0.9 + Math.random() * 1.3,
        age: 0,
        life: 0.45 + Math.random() * 0.3,
      });
    }
    flying.splice(0, Math.max(0, flying.length - grains.length));
  }

  function update(t, dt, state) {
    const n = items.length;
    const stagger = 0.13;
    for (const it of items) {
      if (!it.geo) continue;
      // intro: cada prancha cai do céu e se finca na areia
      const p = clamp((state.boards - it.i * stagger) / (1 - (n - 1) * stagger));
      if (p >= 1 && !it.landed) {
        it.landed = true;
        if (dt > 0) kick(it, it.geo.tilt > 0 ? 1 : -1);
      }
      const fall = -(1 - p * p) * 170 * u;

      // mola: balança e volta para a inclinação de repouso
      if (dt > 0) {
        const acc = -170 * it.a - 6.5 * it.v;
        it.v += acc * dt;
        it.a += it.v * dt;
      }
      it.outer.setAttribute('opacity', r2(clamp(p * 4)));
      it.outer.setAttribute('transform', `translate(${r2(it.geo.x)} ${r2(it.geo.base + fall)})`);
      it.inner.setAttribute('transform', `rotate(${r2(it.geo.tilt + it.a)})`);
      it.mound.setAttribute('opacity', p >= 1 ? 1 : 0);
    }

    for (let k = flying.length - 1; k >= 0; k--) {
      const g = flying[k];
      g.age += dt;
      g.vy += 380 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.age > g.life) flying.splice(k, 1);
    }
    grains.forEach((el, k) => {
      const g = flying[k];
      if (!g) return el.setAttribute('opacity', 0);
      setAttrs(el, { cx: r2(g.x), cy: r2(g.y), r: r2(g.r), opacity: r2(1 - g.age / g.life) });
    });
  }

  /** Largura que as pranchas precisam na areia (para a placa saber até onde ir). */
  const span = (unit) => (WIDTH * unit + 10 * unit) * (items.length - 1) + WIDTH * unit;

  return { layout, update, span };
}
