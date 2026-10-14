/**
 * Rondas Pro / Grupo Maxvel. Guias demonstrativos atualizados em 14-10-2026.
 * Estes textos descrevem os acessos de avaliação, NÃO provam integração operacional.
 */
const guide=(title,subtitle,sections)=>Object.freeze({
 title,subtitle,stages:Object.freeze(sections.map(([title,body])=>Object.freeze({title,body})))
});
export const MOBILE_GUIDES=Object.freeze({
 ronda:guide('Operação de Ronda','Seu percurso, validação de pontos e registros em ordem.',[
  ['Antes de começar','<p>Esta demonstração abre direto na visão do vigia, sem login. Uma cortina escura solicita autorização para a localização; sem permitir, a ronda não inicia. Se negar, será possível tentar novamente pelas permissões do celular.</p><p><strong>Na implantação real:</strong> o administrador cadastrará cada vigia e profissional com login, senha e painel designado. Neste teste, o trajeto e os eventos são simulados.</p>'],
  ['Percorra os pontos','<p>Depois da autorização, o mapa apresenta a localização fornecida pelo aparelho e reenquadra o percurso demonstrativo. Toque em Iniciar ronda. Use Ir ao ponto e siga a ordem obrigatória. Ao chegar ao raio de 25 metros, uma cortina inicia 30 segundos contínuos e orienta a observar o ambiente.</p><p>Quando a contagem terminar, marque Tudo dentro do esperado (observações opcionais) ou Situação que exige atenção (descrição obrigatória), e só então finalize o ponto.</p>'],
  ['Desvios e falhas técnicas','<p>Se o sistema identificar uma possível saída da rota, informe a justificativa. Baixa precisão ou perda de GPS exige análise e não comprova desvio.</p>'],
  ['Evidências e pânico','<p>Ações rápidas: Alerta amarelo, Ocorrência azul e Mensagem branca. PÂNICO permanece vermelho. Em evidências, use os ícones de Foto, Vídeo ou Áudio; o áudio tem gravador próprio. Todos os registros reais e a comunicação remota dependem da central autenticada.</p>'],
  ['Meu histórico','<p>Consulte seus horários, pontos, ocorrências e progresso no menu Meu histórico. O demonstrativo armazena registros no navegador; a central autenticada possui dados sincronizados.</p>']
 ]),
 operador:guide('Central de Monitoramento','Rotas e vigias, com prioridade para alertas.',[
  ['Visão da operação','<p>Abra Monitoramento para consultar as rondas do cenário, a localização indicada e o status de cada vigia.</p>'],
  ['Escolher colaborador','<p>Selecione um vigia para analisar sua rota atual ou as rondas anteriores. Veja os detalhes antes de interpretar um alerta.</p>'],
  ['Alertas e ocorrências','<p>Consulte as abas Alertas e Ocorrências para verificar os fatos, justificativas e sequência de eventos.</p>'],
  ['Qualidade do GPS','<p>Sinal desatualizado ou impreciso não representa automaticamente uma falha do vigia. Compare horários e registros confiáveis.</p>'],
  ['Integração real','<p>Este ambiente é demonstrativo. Na central autenticada, o operador recebe apenas dados enviados ao servidor, sujeitos às permissões da conta.</p>']
 ]),
 coi:guide('COI · Central de Monitoramento','Controle visual da operação e priorização de ocorrências.',[
  ['Monitoramento COI','<p>Visualize as rondas disponíveis, suas últimas posições e as condições de acompanhamento em um único local.</p>'],
  ['Situação dos percursos','<p>Confira se a execução está em andamento, foi concluída ou apresenta registros que exigem análise. Dados técnicos insuficientes permanecem sinalizados como tal.</p>'],
  ['Vigias e histórico','<p>Selecione o colaborador e consulte os registros por data, começando pelos mais recentes.</p>'],
  ['Comunicação e alertas','<p>Abra Alertas ou Ocorrências para verificar justificativas. A central autenticada mantém conversas e providências, conforme a permissão.</p>'],
  ['Frequência de atualização','<p>Na central autenticada, o painel procura novos registros a cada 30 segundos enquanto está aberto. A versão de avaliação não rastreia outros aparelhos.</p>']
 ]),
 admin:guide('Administração e Gestão','Gestão de vigias, rotas, indicadores e relatórios.',[
  ['Visão geral','<p>Consulte os indicadores de rondas, alertas e atividades. Acompanhe os locais e verifique o período dos dados antes de compará-los.</p>'],
  ['Rotas por vigia','<p>Abra Rondas e selecione um colaborador. As execuções ficam em ordem cronológica, cada uma com mapa e detalhes. O mapa da demonstração usa dados fictícios.</p>'],
  ['Criar uma nova rota','<p>Na seção de rotas, use <strong>Criar nova rota para colaborador</strong> para abrir a central autenticada. Lá o administrador escolhe vigia, nome e pontos, marcando no mapa ou inserindo coordenadas.</p>'],
  ['Tratamento','<p>Use Notificações e Ocorrências para investigar, justificar e registrar a análise. Perda de precisão do GPS não é prova de irregularidade.</p>'],
  ['Relatórios e acesso real','<p>A apresentação dispensa login para facilitar a avaliação de cada perfil. Na implantação, o administrador cadastra os usuários e distribui login, senha e permissões individuais. Relatórios, configurações e registros remotos só operam mediante autenticação da central; o cenário não é produção.</p>']
 ]),
 cliente:guide('Acompanhamento do Cliente','Transparência das rondas do seu local, sem administração.',[
  ['Seu local','<p>A primeira informação é o nome do local acompanhado. No demonstrativo a unidade é fictícia; na central real o acesso fica limitado à unidade atribuída.</p>'],
  ['Rondas em andamento','<p>Veja o número de rondas atuais, a rota e a última posição disponível. A ausência de sinal não significa movimento nem desvio.</p>'],
  ['Histórico','<p>Abra as últimas rondas para conferir data, horário, situação e os registros exibidos na área permitida.</p>'],
  ['Mapa e atualização','<p>A posição no cenário de demonstração é ilustrativa. A visão autenticada atualiza os registros do servidor aproximadamente a cada 30 segundos com a tela aberta.</p>'],
  ['Permissões','<p>Este perfil é de consulta, sem criação de usuários, edição de rotas, tratamento interno de ocorrências ou acesso à operação de outros locais.</p>']
 ]),
 vistoriador:guide('Vistoriador · Qualidade','Checklist simples com indicadores do posto.',[
  ['Nome do local','<p>Confira o local apresentado no início da tela antes de avaliar. O local de demonstração é ilustrativo.</p>'],
  ['Nova vistoria','<p>Verifique cada critério apresentado: acessos, estrutura, equipamentos e sinalização. Marque somente os critérios conformes e descreva o que observou.</p>'],
  ['Indicador de qualidade','<p>O percentual representa a quantidade de critérios atendidos entre os quatro avaliados. É um indicador do local, não uma nota de desempenho pessoal.</p>'],
  ['Histórico','<p>Após registrar, consulte a lista com data, hora, observações e porcentagem das vistorias anteriores.</p>'],
  ['Salvar corretamente','<p>Esta demonstração registra vistorias neste navegador. Para salvar no servidor, acesse a Central operacional com perfil Vistoriador e local vinculado.</p>']
 ])
});
export function mobileGuideFor(role){return MOBILE_GUIDES[role]||null}
