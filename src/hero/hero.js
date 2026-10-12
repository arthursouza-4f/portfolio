import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { createHeroScene } from './scene.js';
import { reducedMotion } from '../lib/doodle.js';

gsap.registerPlugin(DrawSVGPlugin);

export function initHero() {
  const hero = document.querySelector('.hero');
  const scene = createHeroScene(hero.querySelector('.hero__scene'));

  const nav = document.querySelector('[data-intro="nav"]');
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
    .from(words, { yPercent: 115, rotate: 5, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, 0.1)
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
    .from(scroll, { opacity: 0, y: 10, duration: 0.6 }, 3.2);

  // só em desenvolvimento: permite inspecionar quadros específicos
  if (import.meta.env.DEV) window.__hero = { scene, intro };
}
