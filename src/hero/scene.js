import { svgEl, setAttrs, smoothPath, rng, r2, clamp } from '../lib/svg.js';
import { doodleFilter, stippleFade, stipplePattern, boil, reducedMotion } from '../lib/doodle.js';
import { createWave, SEA_LEVEL, DESIGN_RIGHT, DESIGN_TOP } from './wave.js';
import { createForecast } from './forecast.js';
import { createBoards } from './boards.js';

/*
 * Cena do topo: linha da areia (laranja) que vira mar (azul), a onda
 * grande à direita e o surfista. Na areia, a placa com o grid de commits
 * e as pranchas dos projetos (com uma camada HTML por cima, `overlay`,
 * para o mouse/teclado). Tudo em SVG; o laço de animação roda a ~30
 * quadros por segundo (é traço "feito à mão", não precisa de 120).
 *
 * `avoid()` devolve a caixa do título, para nada ser desenhado por cima.
 */

const FPS = 30;

export function createHeroScene(svg, { overlay, avoid } = {}) {
  const defs = svgEl('defs', {}, svg);

  stipplePattern(defs, 'wave-dots-dense', { size: 90, density: 0.32, color: '#1f66d1', seed: 3, dot: [0.5, 1.05] });
  stipplePattern(defs, 'wave-dots-mid', { size: 90, density: 0.11, color: '#1f66d1', seed: 8, dot: [0.45, 0.95] });

  // filtros em coordenadas de tela (1 unidade = 1px)
  const lineBoil = doodleFilter(defs, 'hero-line-boil', { shade: false, wobble: 2.2, region: { x: -50, y: -50, width: 5000, height: 3000 } });
  const waveBoil = doodleFilter(defs, 'hero-wave-boil', { shade: false, wobble: 2.4 });
  const figure = doodleFilter(defs, 'hero-figure', { shade: true, rim: 6, soft: 2, wobble: 1.8 });
  const prop = doodleFilter(defs, 'hero-prop', { shade: true, rim: 4, soft: 1.6, wobble: 1.5 });
  const soft = doodleFilter(defs, 'hero-soft', { shade: false, wobble: 0.9 });

  const revealClip = svgEl('clipPath', { id: 'hero-reveal' }, defs);
  const revealRect = svgEl('rect', { x: -20, y: -20, width: 0, height: 4000 }, revealClip);

  // ---------- chão: areia + mar ----------
  const ground = svgEl('g', { 'clip-path': 'url(#hero-reveal)' }, svg);
  const sandDots = svgEl('image', { preserveAspectRatio: 'none', opacity: 0 }, ground);
  const seaDots = svgEl('image', { preserveAspectRatio: 'none', opacity: 0 }, ground);
  const prints = svgEl('g', { fill: '#d98a2b' }, ground);
  const star = svgEl(
    'path',
    { fill: 'none', stroke: 'var(--sand)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
    ground,
  );
  const lines = svgEl('g', { filter: 'url(#hero-line-boil)', fill: 'none', 'stroke-linecap': 'round' }, ground);
  const sandLine = svgEl('path', { stroke: 'var(--sand)', 'stroke-width': 3.2 }, lines);
  const seaLine = svgEl('path', { stroke: 'var(--sea)', 'stroke-width': 3.2 }, lines);
  const wash = svgEl('path', { stroke: 'var(--sea)', 'stroke-width': 2, opacity: 0.8 }, lines);
  const ripples = svgEl('g', { stroke: 'var(--sea)', 'stroke-width': 2, opacity: 0.7 }, lines);
  const rippleEls = Array.from({ length: 7 }, () => svgEl('path', {}, ripples));

  // ---------- na areia: pranchas + placa de previsão ----------
  // (no celular a placa fica na frente, então é desenhada por último)
  const props = svgEl('g', {}, svg);
  const boards = createBoards({ parent: props, defs, overlay });
  const forecast = createForecast({ parent: props, defs, overlay });

  // ---------- gaivotas ----------
  const birds = svgEl(
    'g',
    { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#hero-line-boil)', opacity: 0 },
    svg,
  );
  const birdEls = [0, 1].map(() => svgEl('path', {}, birds));

  // ---------- onda + surfista (três camadas com filtros próprios) ----------
  const waveBack = svgEl('g', { filter: 'url(#hero-wave-boil)' }, svg);
  const waveBackT = svgEl('g', {}, waveBack);
  const waveMid = svgEl('g', { filter: 'url(#hero-figure)' }, svg);
  const waveMidT = svgEl('g', {}, waveMid);
  const waveFront = svgEl('g', { filter: 'url(#hero-wave-boil)' }, svg);
  const waveFrontT = svgEl('g', {}, waveFront);
  const wave = createWave({ back: waveBackT, mid: waveMidT, front: waveFrontT, defs, idPrefix: 'wave' });

  boil(svg, [lineBoil.turbulence, waveBoil.turbulence, figure.turbulence, prop.turbulence, soft.turbulence]);

  // ---------- estado animado pela intro (GSAP) ----------
  const state = { ground: 0, dots: 0, grow: 0.02, surferIn: 0, birds: 0, prints: 0, sign: 0, grid: 0, boards: 0 };

  let W = 0;
  let H = 0;
  let horizon = 0;
  let shore = 0;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let sandPts = [];
  let printEls = [];

  function layout() {
    const box = svg.getBoundingClientRect();
    W = Math.max(320, box.width);
    H = Math.max(480, box.height);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const mobile = W < 760;
    horizon = H * (mobile ? 0.79 : 0.72);
    const waveHeight = H * (mobile ? 0.37 : 0.62);
    scale = Math.min(waveHeight / (SEA_LEVEL - DESIGN_TOP), (W * (mobile ? 0.8 : 0.6)) / (DESIGN_RIGHT + 60));
    tx = W - DESIGN_RIGHT * scale;
    ty = horizon - SEA_LEVEL * scale;
    // a areia vai até um pouco antes de onde a onda começa a subir
    shore = Math.min(W * (mobile ? 0.3 : 0.42), tx + 40 * scale - 40);

    const transform = `translate(${r2(tx)} ${r2(ty)}) scale(${r2(scale)})`;
    for (const g of [waveBackT, waveMidT, waveFrontT]) g.setAttribute('transform', transform);

    // linha da areia: leves morrinhos desenhados à mão
    const rand = rng(7);
    sandPts = [];
    const steps = Math.max(6, Math.round(shore / 70));
    for (let i = 0; i <= steps; i++) {
      const x = -12 + ((shore + 24) * i) / steps;
      const hump = Math.sin((i / steps) * Math.PI) * -6;
      sandPts.push([x, horizon + hump + (rand() - 0.5) * 3]);
    }
    sandPts[sandPts.length - 1][1] = horizon + 2;
    sandLine.setAttribute('d', smoothPath(sandPts));

    // pontilhado sumindo para baixo (gerado uma vez por tamanho de tela)
    const fadeH = Math.min(220, H - horizon);
    // as duas faixas se sobrepõem na beira da água e se misturam
    const blend = 70;
    setAttrs(sandDots, {
      x: 0,
      y: horizon + 3,
      width: shore + blend / 2,
      height: fadeH,
      href: stippleFade({ width: shore + blend / 2, height: fadeH, color: '#ee8b12', seed: 5, density: 0.16, fadeRight: blend }),
    });
    setAttrs(seaDots, {
      x: shore - blend / 2,
      y: horizon + 4,
      width: W - shore + blend / 2,
      height: fadeH,
      href: stippleFade({ width: W - shore + blend / 2, height: fadeH, color: '#1f66d1', seed: 9, density: 0.19, fadeLeft: blend }),
    });

    // pegadas indo até o mar
    prints.replaceChildren();
    printEls = [];
    const count = mobile ? 6 : 10;
    for (let i = 0; i < count; i++) {
      const k = i / (count - 1);
      const x = W * 0.06 + (shore - 40 - W * 0.06) * k;
      const y = horizon + 70 - 52 * Math.pow(k, 0.8) + Math.sin(k * 5) * 6;
      const side = i % 2 ? 1 : -1;
      const el = svgEl(
        'ellipse',
        { cx: r2(x), cy: r2(y + side * 5), rx: 4.6, ry: 2.4, transform: `rotate(-12 ${r2(x)} ${r2(y)})`, opacity: 0 },
        prints,
      );
      printEls.push(el);
    }

    const sx = W * (mobile ? 0.12 : 0.2);
    const sy = horizon + (mobile ? 40 : 58);
    const starPts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 4.5 : 11;
      starPts.push([sx + Math.cos(a) * r, sy + Math.sin(a) * r]);
    }
    star.setAttribute('d', smoothPath(starPts, { closed: true, k: 0.4 }));

    // placa embaixo do título; as pranchas no resto da areia até a beira d'água
    const u = clamp(Math.min(W / 1440, H / 900), 0.72, 1.25);
    const gutter = clamp(W * 0.04, 16, 56);
    const copy = avoid?.() ?? null;
    const edge = shore + 10 * u;
    const maxW = mobile ? W - gutter * 2 : Math.min(340 * u, edge - gutter - boards.span(u) - 26 * u);
    const sign = forecast.layout({ W, H, u, horizon, gutter, mobile, copy, maxW });
    boards.layout({
      W,
      H,
      u,
      horizon,
      mobile,
      copy,
      from: mobile ? gutter : sign.right + 26 * u,
      to: mobile ? Math.max(shore + 30, gutter + 110 * u) : edge,
    });

    render(lastT, 0);
  }

  function render(t, dt) {
    revealRect.setAttribute('width', r2((W + 40) * state.ground));
    sandDots.setAttribute('opacity', r2(state.dots * 0.9));
    seaDots.setAttribute('opacity', r2(state.dots * 0.9));
    printEls.forEach((el, i) => el.setAttribute('opacity', r2(clamp(state.prints * printEls.length - i) * 0.55)));

    // mar: ondinhas que rolam para a praia; a beirada vai e volta na areia
    const lap = Math.sin(t * 0.9) * 14;
    const start = shore - 18 + lap;
    const pts = [];
    const n = Math.max(10, Math.round((W - start) / 46));
    for (let i = 0; i <= n; i++) {
      const x = start + ((W + 16 - start) * i) / n;
      const fade = clamp((x - start) / 120);
      const y = horizon + 1 + fade * (Math.sin(x * 0.022 + t * 1.6) * 2.6 + Math.sin(x * 0.051 - t * 1.1) * 1.4);
      pts.push([x, y]);
    }
    seaLine.setAttribute('d', smoothPath(pts));
    wash.setAttribute(
      'd',
      `M${r2(start - 4)} ${r2(horizon + 7)}q${r2(14 + lap * 0.3)} -5 ${r2(30 + lap * 0.5)} -2`,
    );

    // marquinhas "︶" boiando para a esquerda
    const span = Math.max(80, (tx + 120 * scale) - shore);
    rippleEls.forEach((el, i) => {
      const x = shore + 30 + ((i * 97 + (W - t * 22) * 1) % span);
      const y = horizon + 26 + ((i * 37) % 70) + Math.sin(t + i) * 2;
      const w = 9 + (i % 3) * 4;
      el.setAttribute('d', `M${r2(x - w)} ${r2(y)}q${r2(w / 2)} ${r2(w * 0.45)} ${r2(w)} 0q${r2(w / 2)} ${r2(-w * 0.45)} ${r2(w)} 0`);
      el.setAttribute('opacity', r2(state.dots * (0.35 + ((i * 13) % 5) / 10)));
    });

    // gaivotas
    birds.setAttribute('opacity', r2(state.birds));
    const mobile = W < 760;
    birdEls.forEach((el, i) => {
      // no celular o título ocupa o topo: as gaivotas vão para cima da onda
      const bx = (mobile ? tx + (60 + i * 70) * scale : W * (0.5 + i * 0.07)) + Math.sin(t * 0.25 + i * 2) * (mobile ? 16 : 40);
      const by = (mobile ? ty + (DESIGN_TOP - 40 - i * 30) * scale : H * (0.17 + i * 0.07)) + Math.sin(t * 0.8 + i) * 6;
      const s = 1 - i * 0.25;
      const flap = Math.sin(t * 5 + i * 1.7);
      const wy = (-7 + flap * 6) * s;
      const w = 13 * s;
      el.setAttribute('d', `M${r2(bx - w)} ${r2(by + wy * 0.3)}Q${r2(bx - w * 0.45)} ${r2(by + wy)} ${r2(bx)} ${r2(by)}Q${r2(bx + w * 0.45)} ${r2(by + wy)} ${r2(bx + w)} ${r2(by + wy * 0.3)}`);
    });

    // a onda só aparece quando começa a crescer (não "vaza" antes da linha chegar lá)
    const waveAlpha = r2(clamp((state.grow - 0.03) * 8));
    waveBack.setAttribute('opacity', waveAlpha);
    waveFront.setAttribute('opacity', waveAlpha);
    wave.update(t, dt, { grow: state.grow, surferIn: state.surferIn });

    forecast.update(state);
    boards.update(t, dt, state);
  }

  // ---------- laço ----------
  let raf = 0;
  let lastT = 0;
  let acc = 0;
  let prev = performance.now();
  let running = false;

  // se o aparelho não aguentar, desliga os filtros de traço (fica estático, mas leve)
  const slow = [];
  function watchSpeed(dt) {
    if (slow.length > 120 || svg.classList.contains('is-lite')) return;
    slow.push(dt);
    if (slow.length === 120) {
      const sorted = [...slow].sort((a, b) => a - b);
      if (sorted[60] > 1 / 22) svg.classList.add('is-lite');
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    if (!document.hidden) watchSpeed(dt);
    acc += dt;
    if (acc < 1 / FPS - 0.002) return;
    lastT += acc;
    render(lastT, acc);
    acc = 0;
  }

  function play() {
    if (running || reducedMotion) return;
    running = true;
    prev = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()));
  io.observe(svg);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  layout();
  if (reducedMotion) {
    Object.assign(state, { ground: 1, dots: 1, grow: 1, surferIn: 1, birds: 1, prints: 1, sign: 1, grid: 1, boards: 1 });
    lastT = 2.2;
    render(lastT, 0);
  }

  return {
    state,
    layout,
    render: () => render(lastT, 0),
    /** avança a simulação "na mão" (útil para inspecionar quadros) */
    renderAt(t, steps = 1) {
      for (let i = 0; i < steps; i++) render(t - (steps - 1 - i) / FPS, 1 / FPS);
      lastT = t;
    },
  };
}
