# Auditoria consolidada do Rondas Pro, 14 de outubro de 2026

**Origem:** instruções recuperáveis dos chats de 13–14/10/2026 (incluindo outros chats do projeto), captura do usuário em Android às 13h46, `main`, branches do GitHub e deploy no Railway. **Não confundir as páginas:** `index.html` é demonstração com dados locais; `central.html` é a operação com conta autenticada e API SQLite.

**Objetivo:** consolidar os pedidos sem substituir silenciosamente requisitos anteriores, fechar as pendências verificáveis e manter uma lista honesta do que ainda requer implementação/teste.

## PRIORIDADE CRÍTICA
| Requisito do usuário | Evidência e situação | Aceite ainda necessário |
| --- | --- | --- |
| Unificar Monitoramento + Central COI em um único acesso do demonstrativo | O print exibia seis áreas e modal excessivamente alto. `src/app.js` na main apresenta cinco áreas, COI/Monitoramento unificados. Foi corrigida a política de atualização de JS/CSS da PWA, que antes respondia do cache primeiro (`sw.js`, `index.html`). | Testar abertura após atualização de service worker no Android; verificar somente 1 acesso COI e 5 opções totais, modal sem espaço vazio |
| Publicar tudo na branch correta | Railway estava vinculado a branch antiga; reposicionamento anterior apontou o serviço `ronda-pro` à main. `main` segue recebendo commits. | Conferir no Railway SHA do novo deploy e comparar ao HEAD testado do GitHub, não somente status online |
| Armazenamento persistente | Railway projeto Horizon Site contém serviço separado `ronda-pro`, domínio próprio e volume de 500 MB montado em `/data`; variável `RONDA_PRO_DB_PATH=/data/rondas-pro.sqlite`. | Teste de gravação e reinício, retenção e crescimento; backup Google Drive **não automatizado** |
| Não usar azul-escuro opaco | CSS visual Zinc, tons translúcidos e alertas semânticos presentes. | Capturas reais nas telas e resoluções, inclusive sobreposições de mapa |
| GPS inicial obrigatório e sensato | Permissão previamente concedida deve ser detectada sem novo pedido; quando indisponível, janela de ativação; controles da ronda continuam dependentes de localização. | Testes de permissão concedida, negada, aproximada e revogada em aparelhos distintos |
| Pânico prioritário, botão vermelho, saída para 190 | Interfaces e registro de evento existem. | Homologação de alerta servidor/COI e localização/bateria na evidência, sem afirmar push em segundo plano |
| Comunicação e tratativas auditáveis | API guarda eventos, mensagens gerais/internas, tratamentos, foto/vídeo e notificações, com horários e perfis. | Validação em vários aparelhos, PDF de conversas e retenção com backup |

## DIRETRIZES MOBILE, PERFIS E UX
| Pedido | Situação no código | Pendente |
| --- | --- | --- |
| Mapa ocupa o fundo da tela do vigia, com controles sobrepostos e não card azul | `src/app.js`, `assets/maxvel-visual-2026.css`, `assets/field-entry-v2.css` usam mapa operacional e controles; o layout exige audit real em Android | Conferir 320px–1920px e estados antes, durante, ao chegar e depois da ronda |
| Botão Pânico maior, redondo, destacado; Alerta amarelo, Ocorrência azul, Mensagem branca, menores e no lado oposto | Regras de visual e componentes estão presentes na base | Conferir tamanhos, posições, cliques sem sobreposição |
| Registrar ocorrência também na inicial, sem eliminar ações existentes | Presente na experiência de ronda e nos arquivos de operações | Testar ação e reentrada na central real |
| Guia com rolagem vertical e Anterior/Próxima, fechar, sem paginação inteira artificial | Guias por perfil existem, audit de 8 larguras em `scripts/ux-mobile-audit.mjs` | Pipeline precisa estar verde após corrigir expectativas de GPS e nomenclatura |
| Cinco áreas da demonstração: Vigia, COI · Monitoramento, Cliente, Vistoriador, Administração | Previstas em `src/app.js`; antiga captura mostrava seis | Testar seletor real depois de atualização PWA |
| Áreas autenticadas com papéis de operador/COI, administração, ronda, cliente e vistoria | `central.html` + `server/operational-api.js`; operador e COI compartilham navegação | Testar controle de acesso real de ponta a ponta |

## OPERAÇÃO E DADOS
| Pedido | Implementação e limitação |
| --- | --- |
| Sequência obrigatória, raio ~25 m, permanência ~30 s, GPS e observação | Regras de domínio e inteligência GPS presentes; validar em rota real e precisão variável |
| Diferenciar falha técnica GPS de verdadeiro desvio | Há regras de qualidade e eventos específicos. Não presumir que qualquer perda de sinal seja desvio |
| Registro de bateria, horário, localização, mídia e evento | API de eventos e mídia mantém metadados. Verificar periodicidade real da bateria por sistema operacional |
| Quatro fotos/etapas, selfie, giroscópio, consentimento | Demo ilustra fluxo; evidência realmente obtida depende de APIs do dispositivo e validação no servidor. Não confundir simulação com prova |
| Foto, vídeo e áudio | Gravador de áudio já existia no frontend; API passou a aceitar áudio WebM/MP4/Ogg com validação de assinatura e central agora reproduz áudio |
| Disponível/Em ronda/Fora de serviço e despacho com motivo | Presença autenticada, ordens, início/conclusão com GPS e notificação via API; dependem de central autenticada |
| Alerta em tempo real e lembretes de hora em hora | SSE + polling enquanto central está aberta. **Não é Web Push em segundo plano**; ainda precisa da implementação com assinatura/worker |
| Permissões de COI editadas pela administração | Flags por módulo validadas no backend. **Não são permissões individuais por operador** |
| Cliente vê rondas de sua unidade, últimos locais e cronologia | Existem filtros de unidade e cronologias. Homologar com duas unidades distintas |
| XLSX com abas, dashboards e análises | `src/report-xlsx.js`, `src/central.js` e testes; conferir aparência, dados e importação no Excel |
| PDF de conversas com horários | **Pendente**: tratamento e visualização existem; exportação PDF completa não homologada |
| Offline com persistência nativa fora do navegador | **Pendente**: demonstração usa armazenamento web (`src/storage.js`), que não substitui dispositivo nativo/offline seguro; exige implementação Android e fila confiável de sincronização |
| Destinos por posto cadastrados e despacho para vistoriador com laudo | Há implementação em `feat/rondas-pro-spec-v2-dispatch-20261014`, mas **não foi mesclada integralmente à main**. Exige integração seletiva com a API de despachos atual |
| Backups no Google Drive | Pasta já criada em `maxvel_backups/Rondas Pro/Backups do Banco e Evidências`; **sem transferência periódica ainda** |

## Critérios de conclusão
1. `npm run check && npm test` com sucesso, incluindo testes reais de navegador e de autenticação.
2. Workflows de acessibilidade, experiência simulada e auditoria móvel sem erros reais. Corrigir testes incompatíveis com comportamento aprovado em vez de maquiar falhas.
3. Railway aponta exatamente para o SHA validado e o serviço `ronda-pro` responde no domínio próprio.
4. Registrar o que é demo, o que é operacional e o que depende de recursos nativos/offline/segundo plano.
5. Homologação física Android, evidência de reinício do serviço preservando dados e teste de dois perfis simultâneos.
6. Não declarar **100% concluído** enquanto houver itens acima pendentes.

**Histórico de mudanças deste ciclo:** PWA com estratégia network-first para recursos versionados, atualização do controlador sem interromper ronda ativa, alinhamento do teste mobile para GPS já autorizado, suporte a mídia de áudio na API e na central. Validar no GitHub Actions e publicar no Railway somente após as validações possíveis.
