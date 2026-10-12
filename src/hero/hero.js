import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { createHeroScene } from './scene.js';
import { reducedMotion } from '../lib/doodle.js';

gsap.registerPlugin(DrawSVGPlugin);

export function initHero() {
  const hero = document.querySelector('.hero');
  const textEls = hero.querySelectorAll('.hero__word, .hero__name, .hero__role-text, .hero__role-mark');
  const scene = createHeroScene(hero.querySelector('.hero__scene'), {
    overlay: hero.querySelector('.hero__props'),
    // caixa que cobre só as letras do título (o bloco em si é bem mais largo)
    avoid() {
      const origin = hero.getBoundingClientRect();
      const boxes = [...textEls].map((el) => el.getBoundingClientRect());
      return {
        left: Math.min(...boxes.map((b) => b.left)) - origin.left,
        right: Math.max(...boxes.map((b) => b.right)) - origin.left,
        bottom: Math.max(...boxes.map((b) => b.bottom)) - origin.top,
      };
    },
  });

  const nav = document.querySelector('[data-intro="nav"]');
  const hello = hero.querySelector('.hero__hello');
  const helloWave = hero.querySelector('.hero__hello-wave path');
  const words = hero.querySelectorAll('.hero__word, .hero__name');
  const role = hero.querySelector('.hero__role-text');
  const mark = hero.querySelector('.hero__role-mark');
  const underline = hero.querySelector('.hero__underline path');
  const scroll = hero.querySelector('.hero__scroll');

  gsap.set([nav, hero.querySelector('.hero__copy'), scroll], { visibility: 'visible' });
  if (reducedMotion) return;

  const s = scene.state;
  const intro = gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(nav, { y: -24, opacity: 0, duration: 0.8 }, 0)
    // o "bem-vindo" chega primeiro, meio torto, e a ondinha se desenha embaixo
    .from(hello, { y: 16, opacity: 0, rotate: -10, duration: 0.75, ease: 'back.out(2.2)' }, 0.05)
    .from(helloWave, { drawSVG: '0%', duration: 0.8, ease: 'power2.inOut' }, 0.4)
    .from(words, { yPercent: 115, rotate: 5, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, 0.2)
    .from([role, mark], { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.55)
    .from(underline, { drawSVG: '0%', duration: 0.75, ease: 'power2.inOut' }, 1.05)
    // a linha da praia se desenha da esquerda para a direita e o mar ganha vida
    .to(s, { ground: 1, duration: 1.5, ease: 'power2.inOut' }, 0.3)
    .to(s, { dots: 1, duration: 1.2, ease: 'power1.out' }, 1.0)
    .to(s, { prints: 1, duration: 1.3, ease: 'none' }, 1.1)
    // a onda cresce e o surfista dropa lá de cima
    .to(s, { grow: 1, duration: 1.65, ease: 'power2.inOut' }, 1.05)
    .to(s, { surferIn: 1, duration: 1.1, ease: 'back.out(1.3)' }, 2.25)
    .to(s, { birds: 1, duration: 1.2, ease: 'none' }, 2.1)
    // a placa sobe da areia, o grid se preenche e as pranchas caem fincando
    .to(s, { sign: 1, duration: 0.9, ease: 'back.out(1.8)' }, 1.5)
    .to(s, { grid: 1, duration: 1.3, ease: 'power1.inOut' }, 1.9)
    .to(s, { boards: 1, duration: 1.3, ease: 'none' }, 1.75)
    .from(scroll, { opacity: 0, y: 10, duration: 0.6 }, 3.2);

  // só em desenvolvimento: permite inspecionar quadros específicos
  if (import.meta.env.DEV) window.__hero = { scene, intro };
}
