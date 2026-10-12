export const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  if (parent) parent.appendChild(el);
  return el;
}

export function setAttrs(el, attrs) {
  for (const key in attrs) {
    const value = attrs[key];
    if (value === null || value === undefined || value === false) continue;
    el.setAttribute(key, value);
  }
  return el;
}

/** Aleatório com semente: o traço "à mão" sai igual em toda visita. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r2 = (n) => Math.round(n * 100) / 100;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Curva Catmull-Rom convertida em Bézier: passa por todos os pontos. */
export function smoothPath(points, { closed = false, k = 1 } = {}) {
  const n = points.length;
  if (n < 2) return '';
  const at = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r2(points[0][0])} ${r2(points[0][1])}`;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) * k) / 6;
    const c1y = p1[1] + ((p2[1] - p0[1]) * k) / 6;
    const c2x = p2[0] - ((p3[0] - p1[0]) * k) / 6;
    const c2y = p2[1] - ((p3[1] - p1[1]) * k) / 6;
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/** Amostra uma Catmull-Rom aberta em uma polilinha densa (para posicionar coisas sobre a curva). */
export function sampleSpline(points, perSegment = 16) {
  const out = [];
  const n = points.length;
  const at = (i) => points[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  out.push(points[n - 1]);
  // comprimento acumulado, para andar pela curva em velocidade constante
  let len = 0;
  const lengths = [0];
  for (let i = 1; i < out.length; i++) {
    len += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
    lengths.push(len);
  }
  return { pts: out, lengths, total: len };
}

/** Ponto + tangente a uma fração u (0..1) do comprimento de uma curva amostrada. */
export function pointAt(sampled, u) {
  const { pts, lengths, total } = sampled;
  const target = clamp(u) * total;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const seg = lengths[i] - lengths[i - 1] || 1;
  const t = (target - lengths[i - 1]) / seg;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const m = Math.hypot(dx, dy) || 1;
  return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), tx: dx / m, ty: dy / m };
}

/** Retângulo arredondado com cara de desenhado à mão (o traço passa um pouco do ponto inicial). */
export function sketchRoundRect(x, y, w, h, r, { seed = 1, wobble = 1, overshoot = 0.05, step = 9 } = {}) {
  const rand = rng(seed);
  const straightW = w - 2 * r;
  const straightH = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  const perimeter = 2 * straightW + 2 * straightH + 4 * arc;
  const pieces = [straightW, arc, straightH, arc, straightW, arc, straightH, arc];

  const pointOnPerimeter = (s) => {
    let d = (((s % 1) + 1) % 1) * perimeter;
    let i = 0;
    while (d > pieces[i] && i < pieces.length - 1) {
      d -= pieces[i];
      i++;
    }
    const corner = (cx, cy, start) => {
      const a = start + (d / arc) * (Math.PI / 2);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)];
    };
    switch (i) {
      case 0:
        return [x + r + d, y, 0, -1];
      case 1:
        return corner(x + w - r, y + r, -Math.PI / 2);
      case 2:
        return [x + w, y + r + d, 1, 0];
      case 3:
        return corner(x + w - r, y + h - r, 0);
      case 4:
        return [x + w - r - d, y + h, 0, 1];
      case 5:
        return corner(x + r, y + h - r, Math.PI / 2);
      case 6:
        return [x, y + h - r - d, -1, 0];
      default:
        return corner(x + r, y + r, Math.PI);
    }
  };

  const count = Math.max(16, Math.round(perimeter / step));
  const start = rand() * 0.2;
  const drift = rand() * 10;
  const pts = [];
  for (let i = 0; i <= count * (1 + overshoot); i++) {
    const s = start + i / count;
    const [px, py, nx, ny] = pointOnPerimeter(s);
    // ondulação lenta + tremidinha: parece mão, não ruído
    const off = wobble * (Math.sin(i * 0.45 + drift) * 0.7 + (rand() - 0.5) * 0.6) + (i / count) * wobble * 1.4;
    pts.push([px + nx * off, py + ny * off]);
  }
  return smoothPath(pts);
}
