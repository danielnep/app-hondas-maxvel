# Rondas Pro · COI de Acompanhamento e Tratativas
Data: 15/10/2026 · Grupo Maxvel · PR #53

## Decisão funcional
O COI é a unidade responsável pelo contato do campo e acompanhamento da execução. Não é uma aba genérica de mapas. Quem acompanha a operação visualiza **Rondas** e **Vistorias** separadamente; os mapas aparecem apenas nas atividades que tenham coordenadas.

## Implementado nesta revisão
1. Painel COI com cabeçalho do posto, relógio, resumo de rondas e vistorias em andamento e pendências, atalhos a Tratativas, Notificações e Despachos.
2. Abas de **Rondas** e **Vistorias**, com históricos baseados no banco operacional, detalhes das pessoas, pontos e horários. Em cada registro com GPS, mapa Leaflet escuro e bolinha; para rondas com rota definida, traçado e pontos. Não há uma aba de mapa avulsa.
3. COI recebe eventos e laudos por notificações persistentes. O menu Notificações distingue pendências, todas e, na Administração, auditoria. A leitura não encerra o tratamento.
4. Nova tela **Tratativas**, com pendências, pânicos prioritários e concluídas; COI registra justificativa obrigatória para finalizar; Administração lê auditavelmente o histórico do responsável, horário e conclusão. O controle de autorização permanece no backend.
5. Novos heartbeats de presença com GPS *quando já permitido*, persistência em SQLite e leitura dos 120 segundos mais recentes; se obsoleta, a posição é identificada como última conhecida. Dados inválidos não sobrescrevem o último GPS registrado.
6. Comunicação do Vigia/Vistoriador ao COI por texto e mídia (voz, foto, vídeo) via capturador existente, vinculada a evento específico. O status real do upload é informado.
7. Despachos de campo existentes continuam disponíveis: COI seleciona profissional disponível, preenche motivo obrigatório e define destino. Vistoriador só recebe destino cadastrado pela Administração, com auditoria.
8. Demonstração COI deixa de usar ícone de mapa e possui própria tela de Rondas e Vistorias com dados apenas ilustrativos.
9. Portal Cliente ganha o campo **Próxima Ronda** a partir do início programado na rota pelo administrador. Previsão de término baseada no segmento geográfico entre pontos, em velocidade hipotética de 20 km/h e 30 s/ponto; não é trajeto viário real ou compromisso de chegada.
10. Tema exclusivamente Maxvel, zinc preto, vermelho e detalhes celestes funcionais, layout responsivo, foco e elementos arredondados.
11. Cache web/PWA v29 e testes de regressão / integração / navegador autenticado em viewports 390px e 1366px.

## Dados e papéis
- `operational_presence` recebe campos opcionais `lat,lng,accuracy,fix_at` via migração aditiva. Sem GPS válido, não é exibido um ponto falso.
- `planned_routes` recebe coluna opcional `planned_start`; rotas antigas permanecem intactas, sem programação até atualização autorizada.
- O cliente só consulta rotas e registros de seu posto pela API já segregada. Arquivos de vistoria continuam protegidos pela checagem do servidor.
- Vigia/Vistoriador enviam eventos e evidências.
- COI/Operador acessam registros permitidos, enviam resposta e registram tratativas.
- Administração visualiza despacho, conclusão e histórico do COI, sem assumir ação de tratamento.
- `coi_permissions` continua respeitado, com módulos ativos por padrão e configurações de administração aplicadas pelo servidor.

## Limites não homologados / próximos incrementos
- **Base Maxvel como circuito obrigatório para todas as rotas reais:** Rua Mato Grosso, 1546, Centro, Divinópolis/MG foi informada pelo solicitante, mas coordenadas e política de trajeto não foram homologadas no motor de rondas real. Não vincular endereço real às coordenadas fictícias da demo.
- GPS em segundo plano/Android: o heartbeat web opera com janela aberta e permissão já concedida, portanto **não assegura rastreamento permanente com o aparelho bloqueado**. Deve ser homologado e, se necessário, integrado ao serviço Android.
- Mini-mapa mostra segmento entre pontos, não turn-by-turn viário. Sem posição válida há estado vazio explícito.
- O percentual atual da vistoria mede **conformidade do local em quatro critérios**, não desempenho individual. Indicadores de pontualidade, nitidez de mídia e precisão de atendimento exigem indicadores verificáveis e critérios de avaliação objetivos.
- Transições e testes completos do circuito base → pontos → base em hardware, tocha compatível com navegador, ausência de rede e comportamento de prova de presença dependem de piloto.
- Os registros de clientes fictícios pertencem somente a uma eventual base de demonstração; não cadastrar nomes de clientes fictícios automaticamente em produção.
- Uma conclusão de COI representa registro auditado de providência, não garantia física de que o incidente foi resolvido; o piloto deve validar critérios e auditoria em campo.

## Quality gates
- `npm run check` e `npm test`.
- Chromium abre a demonstração e a central autenticada em celular e desktop; navegação de abas, Tratativas e Notificações sem overflow.
- Auditoria automatizada de acessibilidade e build Android.
- Teste de produção com contas autorizadas após publicação, sem compartilhar senhas/tokens e sem alterar dados reais para simular.
- Merge e publicação apenas após status CI verde na PR e confirmação do SHA da implantação.
