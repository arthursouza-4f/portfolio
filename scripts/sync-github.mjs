/*
 * Gera `src/data/github.json`: o grid de commits do último ano (a placa
 * de previsão das ondas) e a data do último commit de cada projeto (as
 * pranchas). Usa o `gh` já logado, então o token nunca vai para o site.
 *
 *   npm run sync:github
 *
 * O grid é contado direto dos commits de todos os repositórios do dono,
 * e não do calendário de contribuições do GitHub: aquele só conta commits
 * feitos com um e-mail ligado à conta (e, nos privados, só se o perfil
 * mostrar contribuições privadas). Só os números por dia vão para o JSON,
 * nenhum nome de repositório privado.
 *
 * E-mails extras (separados por vírgula) que também contam como seus:
 *   GITHUB_EMAILS="eu@exemplo.com" npm run sync:github
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { projetos } from '../src/data/projetos.js';

const TZ = 'America/Sao_Paulo';
const OUT = new URL('../src/data/github.json', import.meta.url);
const DAY = 86400000;

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
/** `gh api` com --jq: cada resultado vem numa linha em JSON. */
const api = (path, jq, paginate = true) =>
  run('gh', ['api', ...(paginate ? ['--paginate'] : []), path, '--jq', jq])
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const dayKey = (date) => new Date(date).toLocaleDateString('en-CA', { timeZone: TZ });
const toUTC = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const login = run('gh', ['api', 'user', '--jq', '.login']);

// commits sem e-mail configurado saem como usuario@nome-da-maquina
const emails = new Set([`${os.userInfo().username}@${os.hostname()}`]);
try {
  emails.add(run('git', ['config', '--global', 'user.email']));
} catch {
  // sem e-mail global
}
for (const e of (process.env.GITHUB_EMAILS ?? '').split(',')) if (e.trim()) emails.add(e.trim());

// 53 colunas como no GitHub: começa num domingo e termina hoje
const today = toUTC(dayKey(Date.now()));
const start = today - (new Date(today).getUTCDay() + 52 * 7) * DAY;
const dias = new Array((today - start) / DAY + 1).fill(0);

const repos = api(`user/repos?affiliation=owner&per_page=100`, '.[] | {name, owner: .owner.login, fork}').filter((r) => !r.fork);
const since = new Date(start - DAY).toISOString();

let skipped = 0;
for (const repo of repos) {
  let commits;
  try {
    commits = api(
      `repos/${repo.owner}/${repo.name}/commits?since=${since}&per_page=100`,
      '.[] | {l: .author.login, e: .commit.author.email, d: .commit.author.date}',
    );
  } catch {
    skipped++; // repositório vazio
    continue;
  }
  for (const c of commits) {
    if (c.l !== login && !emails.has(c.e)) continue;
    const i = (toUTC(dayKey(c.d)) - start) / DAY;
    if (i >= 0 && i < dias.length) dias[i]++;
  }
}

const porProjeto = {};
for (const projeto of projetos) {
  let ultimo = null;
  for (const name of projeto.repos) {
    try {
      const [c] = api(`repos/${login}/${name}/commits?per_page=1`, '.[0] | {d: .commit.author.date}', false);
      if (c?.d && (!ultimo || c.d > ultimo)) ultimo = c.d;
    } catch {
      // repositório vazio
    }
  }
  porProjeto[projeto.id] = { ultimoCommit: ultimo };
}

const total = dias.reduce((a, b) => a + b, 0);
const data = {
  geradoEm: new Date().toISOString(),
  inicio: new Date(start).toISOString().slice(0, 10),
  total,
  dias,
  projetos: porProjeto,
};
writeFileSync(OUT, JSON.stringify(data) + '\n');

const ativos = dias.filter(Boolean).length;
console.log(`${total} commits em ${ativos} dias (${repos.length} repositórios, ${skipped} vazios) → src/data/github.json`);
