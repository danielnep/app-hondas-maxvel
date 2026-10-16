# Auditoria UI/UX do Rondas Pro · 15-10-2026

**Escopo:** demonstração / e central autenticada; foco inicial em janelas, organização e continuidade operacional.
**Identidade inegociável:** Maxvel, fundo geral escuro/grafite, vermelho institucional preservado, azul apenas nas ações de comunicação. Vigia: jornada mobile-first; COI, Administração, Cliente e Vistoriador: desktop + mobile estruturais.
**Ponto de partida:** `main` SHA `b71143d`, incluindo PR #57 e alterações seguintes. Não confundir demonstração com central autenticada.
**Fontes internas:** `docs/TRATATIVAS-E-PONTO-20261015.md`, `docs/EVENTOS-CHAT-HISTORICO-20261015.md`, `docs/AUDITORIA-CONSOLIDADA-RONDAS-PRO-2026-10-14.md`, `docs/REFORMULACAO-MANUAIS-E0-E10.md`, `docs/R6-BACKEND-CONTRATOS-E-DEPENDENCIAS.md`.
**Padrões externos:** IBM Carbon (https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines), acessibilidade de diálogos (https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs), TrackTik Guard Tour (https://support.tracktik.com/hc/en-us/articles/1500001570442-Overview-of-the-TrackTik-Guard-Tour-mobile-app).

## Observações verificadas em captura real

- Formulário do vigia em 390 px apresentava grande área sem conteúdo entre o botão primário e a margem inferior da janela, cobrindo todo o cockpit.
- Com o ajuste de `height:max-content`, captura do novo run mostra a janela terminando após a última ação, com o mapa e comandos preservados no fundo. Conferir 320 e 1366 px em nova revisão.
- Código de diálogos autenticados reutilizava `.rp-record-dialog` com largura genérica 950 px mesmo em tarefas simples; alterações agora específicas por finalidade.
- Teste do perfil Administração tentava editar `assignee`, campo corretamente somente leitura; corrigido o contrato do teste, não a regra.
- Testes de cache atrelados à versão 35 falhavam ao atualizar para v36; as verificações devem aceitar um número de versão incrementável.

## Regras de interface aceitas como direção

1. **Diálogo curto:** centralizado, largura proporcional ao contexto, altura somente do conteúdo. Confirmação e contato não são tela inteira.
2. **Formulário médio:** ordem única de leitura, mensagens de erro junto ao campo, teclado e foco sem ocultar botão. Rolagem somente se exceder altura disponível.
3. **Registro denso com mapa:** mais largura no desktop; uma coluna de leitura no mobile, mapa proporcional, seções acessíveis por rolagem.
4. **Fluxo imersivo:** mapa principal do vigia, guia passo a passo e menu lateral são exceções justificadas; não aplicar o limite compacto global nessas áreas.
5. **Operação:** jamais marcar dados como recebidos ou concluídos por uma animação; aguardar confirmação de persistência real. Abrir notificação não equivale a resolver.
6. **Acessibilidade:** alvos >= 44px quando aplicável; foco inicial coerente, Esc/fechar, retorno ao elemento de origem; contraste e prefers-reduced-motion.
7. **Animação:** efeitos curtos e funcionais, sem flashes repetitivos ou atraso que impeça emergência/registro.

## Pente-fino por perfil e próximos critérios

| Perfil | Interface esperada | Critérios pendentes |
| --- | --- | --- |
| Vigia | Celular, mapa como contexto, próxima ação central, pânico inequívoco | Android físico, teclado aberto, GPS real, câmera e retomada de execução; medir passagem pelos pontos |
| COI | Painel desktop com mapa/alertas/atendimento simultâneos; mobile em painéis navegáveis | validar estados de eventos, abertura de tratativa e retorno após atender; sem duplicar controles |
| Administrador | Gestão, permissões, auditoria, relatórios com espaço de trabalho desktop e adaptação móvel | diferenciar visualização, acompanhamento e assunção de pendências |
| Vistoriador | Celular e desktop sem perder checklist, evidências e despacho | testar conclusão, campos obrigatórios, sincronização e sem falsas garantias |
| Cliente | Visão de sua própria unidade, histórico e evidências autorizadas | testar escopo de dados com unidades distintas e exportação legível |

## Registro de validação

- Capturas antigas e novas do job `Experiencia real do app simulada`: formulário em 390 e 1366 px mostram grande melhora de geometria.
- Não considerar esta revisão prova de WebRTC entre dispositivos, GPS real, captura de mídia em hardware ou implantação em produção.
- Não publicar na main/Railway sem revisar resultados completos das suites e autorizar.
