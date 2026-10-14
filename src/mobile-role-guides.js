/** Conteúdo dos guias operacionais móveis.
 * Somente informativo: não altera navegação, permissões ou dados.
 * Não atribui funcionamento remoto aos recursos demonstrativos.
 */
export const MOBILE_GUIDES = Object.freeze({
  operador: Object.freeze({
    title:'Central de Monitoramento',
    subtitle:'Acompanhe vigias, rondas e alertas com os controles da central.',
    stages:Object.freeze([
      Object.freeze({
        title:'Conheça sua central',
        body:'<p>O acesso de <strong>Operadores</strong> reúne as áreas Monitoramento, Alertas, Ocorrências e Vigias.</p><ol><li>Abra <strong>Monitoramento</strong> para ter a visão geral.</li><li>Use o menu inferior ou o menu de navegação para mudar de área.</li><li>Retorne ao monitoramento sem perder o contexto local da demonstração.</li></ol>'
      }),
      Object.freeze({
        title:'Acompanhe as rondas',
        body:'<p>Na área <strong>Monitoramento</strong>, consulte as informações de rondas, pontos e vigias disponíveis no cenário.</p><ol><li>Escolha o vigia ou a rota, quando o filtro estiver disponível.</li><li>Confira horário, progresso e localização apresentada no mapa.</li><li>Distinga posição simulada de GPS real e observe a qualidade do sinal.</li></ol>'
      }),
      Object.freeze({
        title:'Entenda os alertas',
        body:'<p>Abra <strong>Alertas</strong> para consultar avisos e mudanças registradas no cenário.</p><ol><li>Identifique o tipo de evento e o horário.</li><li>Consulte o contexto do ponto ou rota envolvida.</li><li>Não interprete GPS impreciso como prova automática de desvio: falhas técnicas precisam de análise.</li></ol>'
      }),
      Object.freeze({
        title:'Consulte ocorrências',
        body:'<p>Na área <strong>Ocorrências</strong>, acompanhe justificativas, histórico e registros disponíveis.</p><ol><li>Abra uma ocorrência para entender o fato informado.</li><li>Verifique a sequência de eventos e as informações apresentadas.</li><li>Encaminhamento, comunicação ou tratamento remoto só têm efeito operacional quando integrados à central autenticada.</li></ol>'
      }),
      Object.freeze({
        title:'Equipe e limites',
        body:'<p>Em <strong>Vigias</strong>, consulte a equipe e as informações de cada colaborador no cenário de avaliação.</p><p><strong>Importante:</strong> esta interface de demonstração usa dados fictícios ou locais. O acompanhamento remoto real depende de autenticação, servidor configurado, permissões e conexão. A ausência de GPS confiável não determina irregularidade.</p>'
      })
    ])
  }),
  admin:Object.freeze({
    title:'Painel Administrativo',
    subtitle:'Organize o acompanhamento, investigue registros e consulte indicadores.',
    stages:Object.freeze([
      Object.freeze({
        title:'Visão geral do painel',
        body:'<p>O <strong>Administrativo</strong> reúne a visão global do cenário: indicadores, rondas, notificações, ocorrências e equipe.</p><ol><li>Abra <strong>Visão geral</strong> para ver os indicadores.</li><li>Confira o período ou contexto exibido antes de comparar números.</li><li>Use os atalhos de cada área para chegar aos registros.</li></ol>'
      }),
      Object.freeze({
        title:'Rondas e equipe',
        body:'<p>Nas áreas <strong>Rondas</strong> e <strong>Equipe</strong>, acompanhe as atividades e seus responsáveis.</p><ol><li>Selecione uma ronda ou colaborador para consultar o histórico exibido.</li><li>Observe horários, etapas concluídas e pendências.</li><li>Diferencie registros demonstrativos de operações autenticadas.</li></ol>'
      }),
      Object.freeze({
        title:'Alertas e ocorrências',
        body:'<p>Use <strong>Notificações</strong> e <strong>Ocorrências</strong> para compreender as exceções da atividade.</p><ol><li>Confira local, horário e contexto de cada evento.</li><li>Leia justificativas antes de avaliar uma ocorrência.</li><li>Trate baixa precisão GPS como condição técnica a verificar, não como desvio comprovado.</li></ol>'
      }),
      Object.freeze({
        title:'Relatórios e ajustes',
        body:'<p>A área <strong>Relatórios</strong> apresenta informações consolidadas e opções de exportação disponíveis nesta versão.</p><ol><li>Consulte os indicadores e os dados do período.</li><li>Use os formatos de exportação disponibilizados na interface.</li><li>Em <strong>Configurações</strong>, revise os parâmetros apresentados no cenário, sem presumir alteração de um servidor real.</li></ol>'
      }),
      Object.freeze({
        title:'Resultados e limites',
        body:'<p>O objetivo do painel é facilitar conferências e decisões com trilha de registros.</p><p><strong>Ambiente de avaliação:</strong> dados fictícios ou locais não equivalem a monitoramento de colaboradores reais. Uso operacional exige integração ao servidor, autenticação, persistência segura, regras de acesso e validação do desempenho em campo.</p>'
      })
    ])
  })
});

export function mobileGuideFor(role){
 return MOBILE_GUIDES[role] || null;
}
