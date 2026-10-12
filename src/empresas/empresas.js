import { experiencias } from '../data/experiencias.js';
import { createStage, mountStage } from '../lib/stage.js';
import { createBenner } from './benner.js';
import { createLince } from './lince.js';

const factories = { benner: createBenner, lince: createLince };

function field(value, placeholder) {
  const span = document.createElement('span');
  if (value) span.textContent = value;
  else {
    span.textContent = placeholder;
    span.className = 'is-pending';
  }
  return span;
}

function renderJob(job) {
  const li = document.createElement('li');
  li.className = 'job';
  li.id = `job-${job.id}`;

  const parts = createStage(`Rever a animação do logo da ${job.empresa}`);

  const body = document.createElement('div');
  body.className = 'job__body';

  const meta = document.createElement('p');
  meta.className = 'job__meta';
  meta.append(field(job.periodo, 'período'), field(job.local, 'local'));

  const name = document.createElement('h3');
  name.className = 'job__name';
  name.textContent = job.empresa;

  const role = document.createElement('p');
  role.className = 'job__role';
  role.append(field(job.cargo, 'cargo'));

  const desc = document.createElement('p');
  desc.className = 'job__desc';
  desc.append(field(job.resumo, 'o que eu fazia por lá — resumo da experiência'));

  body.append(meta, name, role, desc);

  if (job.destaques.length) {
    const list = document.createElement('ul');
    list.className = 'job__list';
    for (const item of job.destaques) {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.append(entry);
    }
    body.append(list);
  }

  if (job.tecnologias.length) {
    const tags = document.createElement('ul');
    tags.className = 'job__tags tags';
    tags.setAttribute('aria-label', 'Tecnologias');
    for (const tech of job.tecnologias) {
      const tag = document.createElement('li');
      tag.textContent = tech;
      tags.append(tag);
    }
    body.append(tags);
  }

  if (!job.cargo || !job.periodo || !job.resumo) {
    const todo = document.createElement('span');
    todo.className = 'job__todo';
    todo.setAttribute('aria-hidden', 'true');
    todo.textContent = '↑ falta preencher com o LinkedIn';
    body.append(todo);
  }

  li.append(parts.stage, body);
  return { li, parts, body };
}

export function initEmpresas() {
  const list = document.querySelector('[data-jobs]');
  if (!list) return;

  const logos = [];
  for (const job of experiencias) {
    const { li, parts, body } = renderJob(job);
    list.append(li);

    const factory = factories[job.id];
    if (!factory) continue;
    const logo = factory();
    const lines = body.querySelectorAll('.job__meta, .job__name, .job__role, .job__desc, .job__list, .job__tags, .job__todo');
    mountStage(parts, logo, lines);
    logos.push(logo);
  }

  if (import.meta.env.DEV) window.__logos = logos;
}
