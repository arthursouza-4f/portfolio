/*
 * Gera `src/data/trilhos.js`: as linhas de Metrô e trem de São Paulo
 * recortadas no centro da cidade, em coordenadas do ladrilho (0..100),
 * para a animação do TrainView na seção de projetos.
 *
 *   npm run build:trilhos [-- ../caminho/do/train_sp]
 *
 * Os traçados reais vêm do próprio TrainView SP (`public/data/network.json`,
 * tirado do GTFS da SPTrans) e as cores/afastamentos de `src/data/lines-meta.js`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.argv[2] ?? '../train_sp');
const OUT = new URL('../src/data/trilhos.js', import.meta.url);

// janela do recorte (km a partir da Praça da Sé; x = leste, z = sul)
const CENTER = [1, -1];
const SIZE = 21;
const S = 100 / SIZE;
const MARGIN = 4; // as linhas passam um pouco da borda (o ladrilho corta)
const WIDTH = { metro: 2.1, trem: 1.8 }; // largura do traço no ladrilho
const TOLERANCE = 0.22; // simplificação (unidades do ladrilho)
// cores um pouco mais escuras onde o oficial some no papel
const TINT = { L15: '#a3a6ab', L4: '#f5c400' };

const network = JSON.parse(readFileSync(resolve(ROOT, 'public/data/network.json'), 'utf8'));
const { LINES } = await import(pathToFileURL(resolve(ROOT, 'src/data/lines-meta.js')).href);

const project = (x, z) => [(x - CENTER[0]) * S + 50, (z - CENTER[1]) * S + 50];
const r1 = (n) => Math.round(n * 10) / 10;

/** Desloca a polilinha para o lado (+ = à direita de quem anda nela). */
function offset(pts, d) {
  if (!d) return pts;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / m) * d, p[1] + (dx / m) * d];
  });
}

/** Recorta a polilinha no retângulo; devolve os pedaços que ficam dentro. */
function clip(pts, min, max) {
  const inside = ([x, y]) => x >= min && x <= max && y >= min && y <= max;
  const pieces = [];
  let cur = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (inside(p)) {
      if (!cur) {
        cur = [];
        if (i > 0) cur.push(cross(pts[i - 1], p, min, max));
      }
      cur.push(p);
    } else if (cur) {
      cur.push(cross(p, pts[i - 1], min, max));
      pieces.push(cur);
      cur = null;
    }
  }
  if (cur) pieces.push(cur);
  return pieces.filter((piece) => piece.length > 1);
}

/** Ponto onde o segmento (fora → dentro) cruza a borda. */
function cross(out, inn, min, max) {
  let t = 0;
  for (const k of [0, 1]) {
    const d = inn[k] - out[k];
    if (out[k] < min) t = Math.max(t, (min - out[k]) / d);
    if (out[k] > max) t = Math.max(t, (max - out[k]) / d);
  }
  return [out[0] + (inn[0] - out[0]) * t, out[1] + (inn[1] - out[1]) * t];
}

/** Ramer–Douglas–Peucker. */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const m = Math.hypot(dx, dy) || 1;
  let worst = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * dy - (pts[i][1] - a[1]) * dx) / m;
    if (d > worst) [worst, at] = [d, i];
  }
  if (worst <= tol) return [a, b];
  return [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}

const linhas = [];
for (const meta of LINES) {
  const line = network.lines.find((l) => l.id === meta.id);
  if (!line) continue;
  const kind = meta.system === 'Trem metropolitano' ? 'trem' : 'metro';
  const width = WIDTH[kind];
  // o serviço mais comprido é o traçado inteiro da linha
  const service = line.services.reduce((a, b) => (b.path.length > a.path.length ? b : a));
  const raw = [];
  for (let i = 0; i < service.path.length; i += 2) raw.push(project(service.path[i], service.path[i + 1]));
  const pieces = clip(offset(raw, (meta.offset ?? 0) * width), -MARGIN, 100 + MARGIN)
    .map((piece) => simplify(piece, TOLERANCE).flatMap(([x, y]) => [r1(x), r1(y)]))
    .filter((piece) => piece.length >= 4);
  if (!pieces.length) continue;
  linhas.push({ id: meta.id, nome: `${meta.number} ${meta.name}`, cor: TINT[meta.id] ?? meta.color, tipo: kind, largura: width, pecas: pieces });
}
// trens metropolitanos por baixo, Metrô por cima
linhas.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'trem' ? -1 : 1));

// estações de integração (2+ linhas) dentro do ladrilho, juntando as que ficam coladas
const estacoes = [];
for (const st of network.stations) {
  if (st.lines.length < 2) continue;
  const [x, y] = project(st.x, st.z);
  if (x < 2 || x > 98 || y < 2 || y > 98) continue;
  const near = estacoes.find((e) => Math.hypot(e[0] - x, e[1] - y) < 1.6);
  if (near) continue;
  estacoes.push([r1(x), r1(y)]);
}

const header = `/*
 * Gerado por \`npm run build:trilhos\` (scripts/build-trilhos.mjs): não editar à mão.
 * Linhas de Metrô e trem de São Paulo no centro da cidade (traçado real do GTFS,
 * via TrainView SP), em coordenadas do ladrilho 0..100. Cada linha tem um ou mais
 * pedaços (polilinhas planas [x0, y0, x1, y1, …]); \`estacoes\` são as integrações.
 */
`;
writeFileSync(
  OUT,
  `${header}export const linhas = ${JSON.stringify(linhas)};\n\nexport const estacoes = ${JSON.stringify(estacoes)};\n`,
);

const points = linhas.reduce((n, l) => n + l.pecas.reduce((k, p) => k + p.length / 2, 0), 0);
console.log(`${linhas.length} linhas, ${points} pontos, ${estacoes.length} integrações → src/data/trilhos.js`);
