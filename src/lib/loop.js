import { gsap } from 'gsap';
import { reducedMotion } from './doodle.js';

/**
 * Chama `fn(t, dt)` a ~`fps` quadros por segundo enquanto `root` estiver
 * na tela (ondinhas, respiração, piscadas: coisas que não param nunca).
 * Com movimento reduzido, desenha um quadro só.
 */
export function frameLoop(root, fn, fps = 30) {
  fn(0, 0);
  if (reducedMotion) return;

  const step = 1 / fps;
  let t = 0;
  let acc = 0;
  const tick = (_time, deltaMs) => {
    if (document.hidden) return;
    acc += Math.min(0.1, deltaMs / 1000);
    if (acc < step - 0.002) return;
    t += acc;
    fn(t, acc);
    acc = 0;
  };

  let on = false;
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting === on) return;
      on = entry.isIntersecting;
      if (on) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    },
    { rootMargin: '80px' },
  ).observe(root);
}
