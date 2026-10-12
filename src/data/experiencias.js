/*
 * Experiências exibidas em "Empresas que já trabalhei".
 * Campos `null` aparecem tracejados na página até serem preenchidos
 * com os dados do LinkedIn.
 */
export const experiencias = [
  {
    id: 'benner',
    empresa: 'Benner',
    cargo: 'Desenvolvedor Júnior → Pleno',
    periodo: 'ago 2022 — atual · 4 anos',
    local: 'Blumenau, SC',
    resumo:
      'Entrei construindo do zero o app de WMS em Flutter e a API em .NET que conversa com ele. Hoje, como pleno, cuido de várias soluções do time de projetos ao mesmo tempo — da validação técnica ao CI/CD — e dou suporte a equipes externas e a quem está começando.',
    destaques: [
      'Construí o app de WMS do zero até a publicação na Play Store, em Flutter',
      'Ajudei a desenvolver a API REST em .NET Core que integra com o app, com foco em performance e escalabilidade',
      'Implantei em produção um app crítico para um cliente de suma importância para a empresa',
      'Montei o pipeline completo de CI/CD dos apps mobile com Jenkins e Fastlane',
      'Responsável pela validação técnica e padronização de código nos projetos de WMS e de Frotas',
      'Levei testes unitários e de integração para dentro do processo de entrega',
      'Mentoria a devs iniciantes nas ferramentas, frameworks e boas práticas da empresa',
    ],
    tecnologias: ['Flutter', 'C#', '.NET 4.8 e 6.0', 'APIs REST', 'SQL Server', 'Clean Architecture', 'MobX', 'Dio', 'Jenkins', 'Fastlane', 'Git'],
  },
  {
    id: 'lince',
    empresa: 'Lince',
    cargo: 'Estagiário → Assistente desenvolvedor I',
    periodo: 'jun 2021 — jul 2022 · 1 ano e 2 meses',
    local: 'Gaspar, SC',
    resumo:
      'Comecei como estagiário de desenvolvimento de sistemas na área industrial e, em 2022, fui efetivado como assistente desenvolvedor.',
    destaques: [
      'Desenvolvi sistemas web internos para as empresas Círculo e Plasvale',
      'Digitalizei processos industriais, melhorando a eficiência operacional',
    ],
    tecnologias: ['Java', 'HTML', 'CSS', 'JavaScript', 'SQL Server'],
  },
];
