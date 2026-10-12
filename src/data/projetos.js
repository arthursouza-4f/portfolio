/*
 * Projetos que viram pranchas fincadas na areia do topo.
 * `repos` são os repositórios do GitHub de cada projeto: o script
 * `npm run sync:github` usa essa lista para buscar a data do último
 * commit. `url: null` = repositório privado (a plaquinha mostra um
 * cadeado em vez do link). Campos `null` aparecem tracejados.
 *
 * `resumo` é a linha da plaquinha da prancha; `descricao`, o texto da
 * seção de projetos. `site` vira o link principal quando existe.
 *
 * `prancha` é só a pintura: cor do casco, da faixa e o comprimento
 * relativo (as pranchas de um quiver nunca têm o mesmo tamanho).
 */
export const projetos = [
  {
    id: 'trainview',
    nome: 'TrainView SP',
    apelido: 'TrainView',
    resumo: 'Mapa 3D dos trilhos de São Paulo, com a posição estimada de cada trem de metrô e CPTM em tempo real.',
    descricao: null,
    stack: ['JavaScript', 'Mapas 3D'],
    repos: ['train_sp'],
    url: 'https://github.com/arthursouza-4f/train_sp',
    site: null,
    prancha: { casco: '#ffffff', faixa: '#e51f48', tamanho: 1 },
  },
  {
    id: 'waxwake',
    nome: 'Waxwake',
    apelido: 'Waxwake',
    resumo: 'Jogo em que você e os amigos constroem um veleiro na oficina e depois levam ele pro mar para explorar.',
    descricao:
      'Jogo indie multiplayer em primeira pessoa, com cara de PS1. Você e seus amigos montam um veleiro na mão, numa oficina: serrando, lixando e pregando tábua por tábua. Depois é só levar o barco pro mar e sair velejando juntos.',
    stack: ['Unity', 'C#'],
    repos: ['waxwake', 'waxwake_pixel'],
    url: null,
    site: null,
    prancha: { casco: '#1f66d1', faixa: '#ffffff', tamanho: 0.92 },
  },
  {
    id: 'leva',
    nome: 'Leva',
    apelido: 'Leva',
    resumo: 'App de logística para o material de eventos, como as conferências de igreja: caixa por caixa, do depósito e de volta.',
    descricao:
      'App de logística para o material de eventos, pensado para as conferências de igreja. Cada caixa e cada item ficam cadastrados com foto, e a equipe confere caixa por caixa em cada etapa, do depósito ao evento e de volta. O que faltou ou quebrou fica registrado com foto, a conferência funciona até sem sinal e, no fim, sai um relatório em PDF.',
    stack: ['React Native', '.NET'],
    repos: ['leve.mobile', 'leve.backend'],
    url: null,
    site: 'https://www.levatech.site',
    prancha: { casco: '#ffd447', faixa: '#151515', tamanho: 0.84 },
  },
  {
    id: 'kiwifit',
    nome: 'KiwiFit',
    apelido: 'KiwiFit',
    resumo: 'App para emagrecer contando o que você come, com o Ki: uma IA que lê o cardápio e o prato pela foto.',
    descricao:
      'App para quem quer emagrecer: registra o quanto você come no dia e mostra a projeção da perda de peso em gráficos. O coração dele é o Ki, a IA do app. Tira foto do cardápio e ele diz o que dá para pedir no restaurante sem estourar o dia; tira foto do prato e ele já calcula tudo. E ainda dá para conversar com ele e tirar dúvidas sobre alimentação.',
    stack: ['React Native', '.NET', 'IA'],
    repos: ['kiwifit.frontend', 'kiwifit.backend', 'kiwifit.ios'],
    url: null,
    site: null,
    prancha: { casco: '#8cc63f', faixa: '#ffffff', tamanho: 0.96 },
  },
  {
    id: 'clt-pj',
    nome: 'Calculadora CLT x PJ',
    apelido: 'CLT x PJ',
    resumo: 'App em Flutter que mostra quanto você precisa ganhar como PJ para compensar os benefícios da CLT.',
    descricao:
      'Quanto você precisa ganhar como PJ para valer a pena sair da CLT? Você coloca o salário bruto e os benefícios, e o app calcula por mês o 13º e as férias proporcionais, o FGTS e o total de benefícios. No fim, mostra o valor que o PJ precisa pagar para compensar tudo isso.',
    stack: ['Flutter', 'Dart', 'MobX'],
    repos: ['calculadora_clt_x_pj'],
    url: 'https://github.com/arthursouza-4f/calculadora_clt_x_pj',
    site: null,
    prancha: { casco: '#ee8b12', faixa: '#ffffff', tamanho: 0.8 },
  },
];

/** Projetos com espaço (e animação) na seção de projetos, na ordem da página. */
export const vitrine = ['kiwifit', 'leva', 'clt-pj', 'waxwake'];
