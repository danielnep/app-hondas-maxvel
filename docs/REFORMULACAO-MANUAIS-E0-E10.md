# HONDAS MAXVEL | E0–E10 e contratos de evolução
**Data: 12/10/2026 · Horizon | Protocolo de reformulação**

## Fonte de método e fidelidade
Este plano adapta três manuais **lidos nesta execução**:
1. `HORIZON_APP_FACTORY_01_UI_UX_MANUAL_COMPLETO.md` (edição 1.0, 12-10-2026): problema/fluxos, anti-cards, mobile-first, adaptação desktop, tutorial contextual e UX verificável.
2. `HORIZON_APP_FACTORY_02_FRONTEND_MANUAL_COMPLETO.md` (edição 1.0, 12-10-2026): UI semântica, estados, componentes coesos, responsividade estrutural, validação e testes.
3. `HORIZON_APP_FACTORY_03_BACKEND_MANUAL_COMPLETO.md` (edição 1.0, 12-10-2026): domínio, estado, dados e permissões antes de integração; contratos/erros, integridade e proteção de informações.
Os exemplos nos manuais são orientação; não significam que servidores, APIs ou testes humanos já existam.

**Escopo aprovado do usuário:** reformular visual e funcionalidades do app existente, mantendo a identidade Horizon × Maxvel e o modo de avaliação. Rondas programadas e vários vigias são requisitos explícitos. Sem publicação como plataforma operacional autenticada sem uma decisão específica de infraestrutura/segurança.

## E0 Captura · APROVADO PELO BRIEFING
- Produto Hondas Maxvel por Horizon; co-branding real por `assets/horizon-maxvel-lockup.svg`.
- Visual predominantemente grafite/cinza-escuro, azul Horizon, branco minoritário; legibilidade antes de decoração.
- Entrada do próprio app: tela de login de avaliação sem senha com quatro papéis.
- Operador: uma página de ronda com mapa/ação e agenda pessoal. Supervisor, Gestão e Administração: Rondas → Programar ronda.
- Vários vigias, muitos exemplos coerentes, não centenas de cards.
- Tutorial spotlight opcional com ajuda ? e acesso lateral; preservar geocerca 25 m, 30 s contínuos, desvio/justificativa/retorno.

## E1 Entendimento · VERIFICADO
A operação cotidiana combina duas atividades distintas: **planejar rondas** e **executar rondas**. A execução possui registros de movimento, tempo e incidentes; a programação possui escalas, vigias e horários. Misturar ambos gera alteração indevida de histórico.

## E2 Escopo · APROVADO/PROPOSTO
**Presente no repositório:** seleção demonstrativa de perfil; 12 vigias, 3 unidades e 48 rondas fictícias iniciais; formulário de programação; início de ronda com vínculo à programação; tutorial e ajuda; relatórios locais, mapa ilustrativo sobre cartografia real.
**Adição nesta rodada:** filtros de agenda por unidade, vigia, status e texto; paginação sem descartar linhas; reprogramação validada e confirmada com histórico local; resumo da supervisão com prioridade a escalas e eventos.
**Proposta não implementada:** backend multiusuário remoto, sincronização entre dispositivos, administração de usuários reais, push real, retenção, auditoria servidor, multitenancy e GPS nativo homologado.

## E3 Operação e jornadas · VERIFICADO
- Vigia acessa perfil → escolhe a ronda programada → inicia → desloca-se → permanece 30 s dentro de raio 25 m → valida → conclui e retorna à base.
- Desvio gera notificação ilustrativa e pede justificativa; justificar não dispensa retorno.
- Supervisor abre Rondas → filtra o efetivo → escolhe programação → cria/reprograma/cancela quando ainda não executada → consulta mapa/alertas.
- Gestão visualiza a mesma agenda e relatórios, sem tratamento real de permissões.
- Administração mostra recursos demonstrativos e ajustes locais; ações protegidas de produção ainda não existem.

## E4 Regras e estados · VERIFICADO + ALTERAÇÃO LOCAL
**Programação:** `scheduled` ou `cancelled`; situação exibida é derivada de prazo e execuções: programada, atrasada, em andamento, concluída, cancelada.
**Execução:** ativa → pontos verificados em sequência → retorno validado → concluída; condição de desvio bloqueia progressão.
**Reprogramar:** somente `status=scheduled` e sem execução vinculada; impedir conflito do mesmo vigia em intervalos sobrepostos e rota de unidade incompatível; registrar o valor anterior em `changes[]` e conservar a identidade do registro. O histórico local não é auditoria de segurança.

## E5 Contrato de dados e papéis
Entidades de **avaliação local**:
- `Watcher {id,name,unit}`
- `Route {id,name,unit,points[]}`
- `Program {id,watcherId,routeId,startAt,endAt,notes,status,createdAt,updatedAt?,cancelledAt?,changes[]?}`
- `Execution {id,programId?,watcherId?,route,checkpoints[],deviations[],incidents[],notifications[],timeline[],status}`
Persistência atual: estado no navegador. O visitante pode alternar perfis sem senha para conhecer funcionalidades; isso **não comprova acesso autorizado**.

Matriz **proposta para produção**, a ser detalhada:
| Recurso | Vigia | Supervisor | Gestor | Administrador |
|---|---|---|---|---|
| Consultar escalas | Somente as atribuídas | Da unidade autorizada | Do âmbito autorizado | Da organização autorizada |
| Criar/reprogramar/cancelar escalas | Não | Sim, na própria unidade | Conforme escopo | Conforme escopo |
| Iniciar/alterar execução | Somente própria | Consultar e analisar | Consultar e analisar | Configurar política, não falsificar histórico |
| Justificar desvio | Própria execução | Consultar e analisar | Consultar | Auditar conforme função |
| Relatórios | Próprios | Da unidade | Do âmbito autorizado | Conforme autorização |

Não há controle de acesso real sem servidor; camuflar botão não serve de autorização.

## E6 Arquitetura e contratos · BASE LOCAL REAL / API APENAS PROPOSTA
Arquitetura efetiva: `src/domain.js` regras da execução; `src/scheduling.js` regras puras de programação; `src/storage.js` persistência em `localStorage`; `src/app.js` fluxo e UI; `src/tutorial.js` ajuda; `src/map.js` mapa. Sem servidor.
**Contratos de API candidatos para produção** (AINDA NÃO implementados):
- `GET /v1/patrol-programs?unit=&watcher=&status=&query=&page=&page_size=` → página de programações autorizadas; cursor ou paginação com total segundo escala.
- `POST /v1/patrol-programs` → criar mediante vínculo de unidade e disponibilidade, com `Idempotency-Key`.
- `PATCH /v1/patrol-programs/{id}` → reprogramar com `version` ou `If-Match` e transação, preservando trilha de alterações.
- `POST /v1/patrol-programs/{id}/cancel` → cancelamento contextual com justificativa, autor e timestamp.
- `POST /v1/patrol-executions` → abrir execução ligada a programa/colaborador autenticado.
- `GET /v1/patrol-executions/{id}/events` → eventos com fonte e timestamps verificáveis.
Erros previsíveis: `400` validação de formato; `401` sessão inválida; `403` falta de acesso; `404` registro não autorizado ou inexistente; `409` conflito de agenda/versão; `422` regra de negócio não satisfeita. Propor `application/problem+json` (RFC 9457). Escolha de banco/hospedagem/segregação ainda pendente.

## E7 UX · APLICADO PARCIALMENTE, EM VALIDAÇÃO
- Agenda agora oferece busca com acentuação tolerada, unidade, vigia, estado e paginação real de 16 registros.
- Sem cards repetidos para cada métrica; resumo em faixa organizada e registros listados por linha.
- Supervisor prioriza rondas programadas, andamento, concluídas e alertas.
- Estado vazio contextual substitui CTA de apresentação comercial.

## E8 UI · APLICADO PARCIALMENTE, EM VALIDAÇÃO
- Paleta Graphite Dark existente preservada. Bordas e superfícies sem luzes desnecessárias.
- Faixas de KPI com divisórias discretas; filtros responsivos; resumo operacional menos intrusivo.
- Marca combinada real mantém seu espaço, com variação compacta; não substituir por texto ou arte sintética genérica.

## E9 Testes · EM EXECUÇÃO
- Unitário: filtragem combinada, busca sem acento, paginação completa, reprogramação, conflito, integridade e histórico local.
- Playwright: entrada, spotlight, múltiplos perfis, agendamento, filtro por vigia e reprogramação, desvio/justificativa, ajuda.
- CI Github: Node, a11y, UX mobile, jornada real app, Android debug. Cada status deve ser comprovado no workflow da revisão final.
- Pendente: teste humano com vigias/supervisores, TalkBack em aparelho e GPS de campo.

## E10 Handoff · CONDICIONADO À APROVAÇÃO DO E9
- Entregar links do GitHub, resultado medido (sem inventar taxa), limitações e itens por validar.
- App é versão de avaliação funcional; não chamar de produção nem prometer notificações entre aparelhos.
- Próximos itens de produto exigem decisão de backend, autenticação, separação por organização, política LGPD e piloto.
