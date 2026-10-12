import { gsap } from 'gsap';
import { experiencias } from '../data/experiencias.js';
import { reducedMotion } from '../lib/doodle.js';
import { createBenner } from './benner.js';
import { createLince } from './lince.js';

const factories = { benner: createBenner, lince: createLince };

const REPLAY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 3.5v4.4h4.4"/></svg>';

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

  const stage = document.createElement('div');
  stage.className = 'job__stage';
  const tilt = document.createElement('div');
  tilt.className = 'job__tilt';
  stage.append(tilt);

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'job__replay';
  replay.innerHTML = `${REPLAY_ICON}<span>de novo</span>`;
  replay.setAttribute('aria-label', `Rever a animação do logo da ${job.empresa}`);
  stage.append(replay);

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
    tags.className = 'job__tags';
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

  li.append(stage, body);
  return { li, stage, tilt, replay, body };
}

/** Inclina o logo seguindo o mouse, como um cartão 3D. */
function attachTilt(stage, tilt, onHover) {
  if (reducedMotion || !window.matchMedia('(hover: hover)').matches) return;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg) translateZ(0)`;
  });
  stage.addEventListener('pointerenter', () => onHover?.(true));
  stage.addEventListener('pointerleave', () => {
    tilt.style.transform = '';
    onHover?.(false);
  });
}

export function initEmpresas() {
  const list = document.querySelector('[data-jobs]');
  if (!list) return;

  const players = [];
  for (const job of experiencias) {
    const { li, stage, tilt, replay, body } = renderJob(job);
    list.append(li);

    const factory = factories[job.id];
    if (!factory) continue;
    const logo = factory();
    tilt.append(logo.svg);
    attachTilt(stage, tilt, logo.hover);

    logo.tl.eventCallback('onComplete', () => replay.classList.add('is-visible'));
    replay.addEventListener('click', () => {
      replay.classList.remove('is-visible');
      logo.tl.restart();
    });

    if (reducedMotion) {
      logo.tl.progress(1);
      continue;
    }

    // texto entra junto com o logo
    const lines = body.querySelectorAll('.job__meta, .job__name, .job__role, .job__desc, .job__list, .job__tags, .job__todo');
    const textIn = gsap.from(lines, { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', paused: true });

    players.push({ stage, logo, textIn });
  }

  if (import.meta.env.DEV) window.__logos = players.map((p) => p.logo);
  if (reducedMotion) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const player = players.find((p) => p.stage === entry.target);
        if (!player) continue;
        io.unobserve(entry.target);
        player.logo.tl.play(0);
        player.textIn.play();
      }
    },
    { threshold: 0.5 },
  );
  players.forEach((p) => io.observe(p.stage));
}
