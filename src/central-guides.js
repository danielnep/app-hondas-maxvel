/** Guias operacionais por perfil. Conteúdo estático, sem dados pessoais. */
export const CENTRAL_GUIDES={
 ronda:{title:'Instruções para o vigia',steps:[
  ['Seu local de trabalho','Confirme o posto indicado no início. Acompanhe apenas suas rondas e seu histórico.'],
  ['Ronda e localização','Na execução, permita o GPS, siga os pontos na ordem, respeite o raio e a permanência configurados. Sinal fraco interrompe validações, mas não comprova desvio.'],
  ['Registros e comunicação','Use Alerta para situações relevantes, Ocorrência para fatos documentados e Mensagem para contatos comuns. Fotos e vídeos podem ser vinculados ao evento.'],
  ['Pânico','O botão de pânico requer confirmação. Para atendimento policial, utilize o discador 190. Registros offline aguardam sincronização confirmada.'],
  ['Histórico','Consulte datas, registros, GPS, bateria e respostas da equipe. A central só apresenta dados realmente recebidos pelo servidor.']]},
 operador:{title:'Guia da Central de Monitoramento',steps:[
  ['Fila prioritária','Comece pelas ocorrências e acionamentos pendentes. Abra cada evento para ler evidências, localização e histórico.'],
  ['Rondas em andamento','Em Monitoramento veja quem está em ronda, posto, última posição recebida, precisão e horário da amostra. Sem sinal recente não significa desvio.'],
  ['Histórico','Expanda a ronda, consulte trajeto disponível e as rondas anteriores. Atualizar busca registros sincronizados.'],
  ['Tratamento','Registre análise e resposta geral ou nota interna. Mensagens internas não são mostradas ao cliente.']]},
 admin:{title:'Guia de Administração',steps:[
  ['Indicadores','O painel apresenta o total de rondas, rondas ativas, pendências e unidades. Confira sempre o horário da atualização.'],
  ['Monitoramento','Abra Monitoramento para ver as rondas atuais; consulte o histórico por posto, colaborador e evento.'],
  ['Usuários e postos','Ao cadastrar vigias, clientes e vistoriadores, associe o mesmo nome de local exatamente. O cliente acessa somente registros da unidade vinculada.'],
  ['Qualidade','O índice resulta apenas das vistorias preenchidas por vistoriadores. Sem vistoria não existe nota. GPS impreciso não reduz automaticamente a qualidade.'],
  ['Auditoria e relatórios','Trate ocorrências, mantenha conversas datadas, confira evidências e exporte planilhas ou conversas em PDF.']]},
 master:{title:'Guia Master',steps:[
  ['Operação','O perfil Master tem todas as áreas da Administração e os controles de implantação.'],
  ['Contas','Associe cada cliente e cada vigia ao local correspondente. Revise cadastro, permissões e acesso aos relatórios.'],
  ['Rastreamento e ocorrências','Consulte rondas, GPS com data, alertas, evidências e as respostas salvas no servidor.'],
  ['Qualidade','Verifique os resultados de vistoria sem pontuar ausências ou erros técnicos como qualidade baixa.']]},
 coi:{title:'Guia do COI',steps:[
  ['Visão gerencial','O COI possui as mesmas telas operacionais e administrativas previstas para o Administrador, exceto funções exclusivas do Master.'],
  ['Acompanhamento','Veja o monitoramento ao vivo, postos, vigias, histórico e mapas a partir das amostras recebidas.'],
  ['Tratamento e qualidade','Revise alertas, ocorrências e indicadores das vistorias. Considere a precisão do GPS antes de concluir um desvio.'],
  ['Relatórios','Consulte e exporte registros e conversas conforme as permissões da central.']]},
 cliente:{title:'Guia do Cliente',steps:[
  ['Sua unidade','No painel inicial confira o nome do local. Este acesso mostra somente dados da unidade autorizada.'],
  ['Acompanhamento','Veja rondas em andamento e o horário da última posição recebida. Posição antiga ou sem GPS não equivale a acompanhamento ao vivo.'],
  ['Histórico','Consulte as últimas rondas, ocorrências autorizadas, evidências e horários.'],
  ['Privacidade','O cliente não altera ocorrências, usuários, configurações ou mensagens internas.']]},
 vistoriador:{title:'Guia do Vistoriador',steps:[
  ['Local da vistoria','Confirme seu posto no painel inicial antes de avaliar a unidade.'],
  ['Avaliação de qualidade','Informe Conforme ou Não conforme para cada um dos quatro critérios. O indicador é a porcentagem de critérios conformes entre os realmente avaliados.'],
  ['Registro','Acrescente observação objetiva, confira as respostas e salve. Data, unidade e posição/bateria disponíveis compõem o registro.'],
  ['Histórico e revisão','Consulte suas avaliações. Uma vistoria incompleta não gera nota, e falhas de GPS não são tratadas automaticamente como não conformidade.']]}
};
export function centralGuide(role,esc,compact=false){
 const guide=CENTRAL_GUIDES[role]||CENTRAL_GUIDES.operador;
 const items=compact?guide.steps.slice(0,3):guide.steps;
 return '<section class="surface central-guide" aria-label="'+esc(guide.title)+'">'+
  '<div class="eyebrow">'+(compact?'PRIMEIRO ACESSO':'MANUAL DA SUA ÁREA')+'</div>'+
  '<h2>'+esc(guide.title)+'</h2><ol class="guide-steps">'+items.map(([title,body])=>
   '<li><strong>'+esc(title)+'</strong><p>'+esc(body)+'</p></li>').join('')+'</ol>'+
  '<p class="muted">Atualizado em 14/10/2026. Recursos da Central exigem autenticação e dados efetivamente sincronizados. A demonstração do site usa dados locais fictícios.</p></section>';
}
