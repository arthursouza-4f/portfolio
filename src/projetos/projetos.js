import { projetos, vitrine } from '../data/projetos.js';
import github from '../data/github.json';
import { createStage, mountStage } from '../lib/stage.js';
import { ago } from '../lib/tempo.js';
import { createKiwiFit } from './kiwifit.js';
import { createLeva } from './leva.js';
import { createCltPj } from './clt-pj.js';
import { createWaxwake } from './waxwake.js';

/*
 * Seção de projetos: um ladrilho animado e o texto de cada projeto da
 * `vitrine`, alternando os lados. Clicar na prancha do topo rola até
 * aqui (evento `projeto:ver`) e a animação daquele projeto recomeça.
 */

const factories = { kiwifit: createKiwiFit, leva: createLeva, 'clt-pj': createCltPj, waxwake: createWaxwake };

const LOCK_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';

function link(href, text) {
  const a = document.createElement('a');
  a.className = 'proj__link';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = `${text} <span aria-hidden="true">↗</span>`;
  return a;
}

function renderProject(p, i) {
  const li = document.createElement('li');
  li.className = i % 2 ? 'proj proj--flip' : 'proj';
  li.id = `projeto-${p.id}`;

  const parts = createStage(`Rever a animação do ${p.nome}`);

  const body = document.createElement('div');
  body.className = 'proj__body';

  const meta = document.createElement('p');
  meta.className = 'proj__meta';
  const when = ago(github.projetos?.[p.id]?.ultimoCommit);
  meta.textContent = when ? `último commit ${when}` : 'ainda sem commits';

  const name = document.createElement('h3');
  name.className = 'proj__name';
  name.textContent = p.nome;

  const desc = document.createElement('p');
  desc.className = 'proj__desc';
  if (p.descricao) desc.textContent = p.descricao;
  else {
    const pending = document.createElement('span');
    pending.className = 'is-pending';
    pending.textContent = 'o que é o projeto';
    desc.append(pending);
  }

  const tags = document.createElement('ul');
  tags.className = 'proj__tags tags';
  tags.setAttribute('aria-label', 'Tecnologias');
  for (const tech of p.stack) {
    const tag = document.createElement('li');
    tag.textContent = tech;
    tags.append(tag);
  }

  const links = document.createElement('p');
  links.className = 'proj__links';
  if (p.site) links.append(link(p.site, 'ver o site'));
  if (p.url) links.append(link(p.url, 'ver no GitHub'));
  if (!p.url) {
    const lock = document.createElement('span');
    lock.className = 'proj__private';
    lock.innerHTML = `${LOCK_ICON}<span>repositório privado</span>`;
    links.append(lock);
  }

  body.append(meta, name, desc, tags, links);
  li.append(parts.stage, body);
  return { li, parts, body };
}

export function initProjetos() {
  const list = document.querySelector('[data-projetos]');
  if (!list) return;

  const players = new Map();
  vitrine.forEach((id, i) => {
    const p = projetos.find((proj) => proj.id === id);
    if (!p) return;
    const { li, parts, body } = renderProject(p, i);
    list.append(li);

    const logo = factories[id]();
    const lines = body.querySelectorAll('.proj__meta, .proj__name, .proj__desc, .proj__tags, .proj__links');
    players.set(id, { logo, ...mountStage(parts, logo, lines) });
  });

  // veio da prancha: mostra a animação desse projeto de novo
  document.addEventListener('projeto:ver', (e) => players.get(e.detail)?.replayOnView());

  // link direto (#projeto-leva): a seção só existe depois do JS, então rola aqui
  const target = location.hash.startsWith('#projeto-') && document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ block: 'center' });

  if (import.meta.env.DEV) window.__projetos = Object.fromEntries([...players].map(([id, p]) => [id, p.logo]));
}
