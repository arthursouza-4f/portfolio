import { gsap } from 'gsap';
import { reducedMotion } from './doodle.js';

/*
 * "Palco" de um ladrilho animado (logos das empresas, artes dos projetos):
 * inclina seguindo o mouse, toca quando aparece na tela e tem o botão
 * "de novo" para rever a animação.
 */

const REPLAY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 3.5v4.4h4.4"/></svg>';

export function createStage(replayLabel) {
  const stage = document.createElement('div');
  stage.className = 'stage';
  const tilt = document.createElement('div');
  tilt.className = 'stage__tilt';
  stage.append(tilt);

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'stage__replay';
  replay.innerHTML = `${REPLAY_ICON}<span>de novo</span>`;
  replay.setAttribute('aria-label', replayLabel);
  stage.append(replay);

  return { stage, tilt, replay };
}

/** Inclina o ladrilho seguindo o mouse, como um cartão 3D. */
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

/**
 * Coloca o ladrilho (`{ svg, tl, hover }`) no palco. A animação toca quando
 * metade do palco aparece; `text` são as linhas que entram junto com ela.
 */
export function mountStage({ stage, tilt, replay }, logo, text = []) {
  tilt.append(logo.svg);
  attachTilt(stage, tilt, logo.hover);

  const restart = () => {
    replay.classList.remove('is-visible');
    logo.tl.restart();
  };
  logo.tl.eventCallback('onComplete', () => replay.classList.add('is-visible'));
  replay.addEventListener('click', restart);

  if (reducedMotion) {
    logo.tl.progress(1);
    return { replayOnView() {} };
  }

  const textIn = gsap.from(text, { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', paused: true });

  let played = false;
  let visible = false;
  let again = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.intersectionRatio >= 0.49;
      if (!visible) return;
      if (!played) {
        played = true;
        logo.tl.play(0);
        textIn.play();
      } else if (again) restart();
      again = false;
    },
    { threshold: 0.5 },
  );
  io.observe(stage);

  return {
    /** Recomeça a animação assim que o palco aparecer (ou já, se estiver na tela). */
    replayOnView() {
      if (visible && played) restart();
      else again = true;
    },
  };
}
