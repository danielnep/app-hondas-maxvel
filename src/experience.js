/**
 * Base de conhecimento contextual Horizon × Maxvel.
 * A experiência ensina o próprio aplicativo, sem landing ou overlay comercial.
 * Toda menção a funcionalidades reais diferencia a simulação local do backend futuro.
 */
export const KNOWLEDGE={
  roles:{
    title:'Perfis e áreas de trabalho',
    summary:'Alterne entre Vigia/Ronda, Supervisão, Gestão e Administração no topo.',
    detail:'Cada perfil mostra as ferramentas adequadas à sua função. Nesta versão de avaliação, a troca preserva a mesma ronda e seus eventos no navegador. Em produção, cada pessoa terá identidade e permissões próprias; a seleção livre de perfis não representa autenticação.'
  },
  actions:{
    title:'Próxima ação da ronda',
    summary:'O painel indica o passo permitido agora: iniciar, deslocar, verificar ou justificar.',
    detail:'A sequência é obrigatória. O botão principal muda conforme a situação atual. Ele não valida automaticamente um ponto: dentro do raio de 25 metros é necessária permanência contínua de 30 segundos e localização suficientemente confiável. Se houver um desvio, primeiro registre a justificativa e retorne ao ponto.'
  },
  map:{
    title:'Mapa operacional',
    summary:'Visualize os pontos, a posição e a região de verificação.',
    detail:'As ruas são fornecidas pela cartografia OpenStreetMap quando a conexão permite. A linha entre os pontos é ilustrativa e não constitui um trajeto calculado pelas vias. A geocerca indicada possui raio de aproximadamente 25 metros. O marcador no modo avaliação se desloca por simulação, sem rastreamento real de pessoas.'
  },
  dwell:{
    title:'Raio e permanência',
    summary:'Entenda como o ponto é validado dentro da área prevista.',
    detail:'O ponto exige presença dentro de um raio de cerca de 25 metros por 30 segundos contínuos. Sair da área ou perder precisão confiável impede a confirmação e pode reiniciar a contagem. Falhas de GPS por si sós não são prova de irregularidade; precisam de avaliação humana.'
  },
  movement:{
    title:'Comandos de percurso',
    summary:'Experimente o deslocamento, o retorno e os eventos de ocorrência.',
    detail:'Os botões fazem o marcador se movimentar no cenário local. Sair da rota gera evento contextual e exige justificativa. A justificativa não dispensa retorno ao ponto original. Ocorrências ficam vinculadas à ronda e aparecem na visão da supervisão deste navegador, sem envio remoto.'
  },
  alerts:{
    title:'Alertas da supervisão',
    summary:'Analise eventos, justificativas e pendências registrados na ronda.',
    detail:'A central reúne desvios e ocorrências, com contexto e horário. Os filtros Pendentes e Todos ajudam a priorizar o que precisa de atenção. Os eventos são locais e demonstrativos: nenhum supervisor real recebe notificações de outro dispositivo nesta versão.'
  },
  kpis:{
    title:'Indicadores operacionais',
    summary:'Leia o resumo das rondas, pontos concluídos e situações que precisam de análise.',
    detail:'Os números são derivados dos registros disponíveis neste navegador. Eles ajudam a identificar o que aconteceu no cenário de avaliação, mas não representam dados de equipes conectadas, eficiência empresarial medida ou relatórios multiempresa de produção.'
  },
  reports:{
    title:'Histórico e relatórios',
    summary:'Consulte a linha do tempo, pontos, ocorrências e resultados.',
    detail:'Os relatórios mostram somente registros guardados no navegador e podem ser impressos localmente. Nesta versão ainda não há servidor de produção, autenticação auditável ou sincronização entre dispositivos. Um relatório não é prova isolada de um comportamento.'
  },
  admin:{
    title:'Administração da plataforma',
    summary:'Explore as opções gerais e os parâmetros disponíveis nesta interface.',
    detail:'A seção administrativa desta avaliação mostra as capacidades previstas e registros locais. O controle de acesso de empresas, unidades, usuários e dados sensíveis precisa de backend, segurança e autorização individual antes de uma implantação real.'
  },
  help:{
    title:'Ajuda sempre disponível',
    summary:'Use os pequenos botões ? para entender cada parte sem sair do aplicativo.',
    detail:'O tutorial pode ser fechado a qualquer momento e reaberto por Ajuda ou pela opção Rever tutorial no menu lateral. Cada botão ? abre uma explicação detalhada da função correspondente e escurece o restante da tela. O tutorial não concede autorização de GPS.'
  },
  privacy:{
    title:'Privacidade, GPS e demonstração',
    summary:'A demonstração não ativa localização real e não envia eventos a outras pessoas.',
    detail:'O acompanhamento GPS requer autorização específica do aparelho no modo real. No navegador, o rastreamento não continua após fechar a página. O Android pode ter serviço de localização em primeiro plano com notificação visível, sujeito a permissões e testes físicos, mas não funciona após parada forçada. Dados de avaliação ficam apenas neste navegador.'
  }
};

export const TOUR_STEPS=[
 {selector:'.simulation-roles',topic:'roles',title:'Escolha como trabalhar',short:'No topo estão os quatro perfis. Toque em qualquer um para conhecer sua área de trabalho.'},
 {selector:'.patrol-map-panel',topic:'map',title:'A ronda acontece neste mapa',short:'Acompanhe o ponto obrigatório, o marcador e o raio de verificação. O percurso desenhado é ilustrativo.'},
 {selector:'.patrol-actions',topic:'actions',title:'Uma ação de cada vez',short:'O botão principal indica o próximo passo, sem obrigar você a procurar entre vários cartões.'},
 {selector:'.patrol-help-details',topic:'dwell',title:'Consulte regras e pontos',short:'As instruções ficam disponíveis aqui. Cada ponto exige 25 m de raio e 30 segundos contínuos.'},
 {selector:'.help-toggle',topic:'help',title:'Explicações quando precisar',short:'Use Ajuda ou os pequenos ? para consultar cada função. Você também pode reabrir todo este tutorial no menu lateral.'}
];

export const HELP_ATTACHMENTS=[
 {selector:'.simulation-roles',topic:'roles'},
 {selector:'.patrol-map-heading',topic:'map'},
 {selector:'.patrol-action-heading',topic:'actions'},
 {selector:'.patrol-dwell-info',topic:'dwell'},
 {selector:'.patrol-tools-heading',topic:'movement'},
 {selector:'.map-command-top',topic:'map'},
 {selector:'.map-checkpoint-heading',topic:'dwell'},
 {selector:'.alerts-queue-head',topic:'alerts'},
 {selector:'.ops-topline',topic:'kpis'},
 {selector:'.ops-map-card .ops-panel-heading',topic:'map'},
 {selector:'.ops-activity .ops-panel-heading',topic:'alerts'},
 {selector:'.report-breakdown',topic:'kpis'},
 {selector:'.report-roster .card-title',topic:'reports'},
 {selector:'.map-history .card-title',topic:'reports'},
 {selector:'.page-title',topic:'reports',views:['registros','relatorios']},
 {selector:'.page-title',topic:'admin',views:['configuracoes']},
 {selector:'.page-title',topic:'alerts',views:['notificacoes']},
 {selector:'.app-header .header-actions',topic:'help'},
 {selector:'.side-caption',topic:'help'}
];
