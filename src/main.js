import '@fontsource-variable/instrument-sans';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/caveat';
import './styles/base.css';
import './styles/hero.css';
import './styles/section.css';
import './styles/empresas.css';
import './styles/projetos.css';

import { initHero } from './hero/hero.js';
import { initEmpresas } from './empresas/empresas.js';
import { initProjetos } from './projetos/projetos.js';

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// espera as fontes para a animação do título não pular de tamanho
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
fontsReady.then(() => {
  initHero();
  initEmpresas();
  initProjetos();
});
