# Etapa 06 · Desktop, relatórios e manutenção do design system
**Hondas Maxvel | Horizon Operacional | 11/10/2026**

## Objetivo
Elevar a experiência desktop/tablet e dar continuidade à qualidade mobile, sem trocar arquitetura por mockups, sem gamificação, sem números fictícios apresentados como medição real.

## Entregas no código
- **Relatório operacional** com dados provenientes de `sessionList()`, `recentNotification()` e registros de ponto; indicadores de rondas concluídas, pontos verificados e eventos analisados, calculados com denominador real. Se não houver dados locais, todos os percentuais ficam em zero, sem simular desempenho.
- **Visão desktop com informação densa:** cartões KPIs mais legíveis, progresso operacional, feed de eventos com links para detalhamento, histórico e impressão local.
- **Ajustes responsivos:** relatório em duas colunas largas; empilha de forma controlada em tablet/mobile; histórico tabelado com scroll próprio; nenhum scroll horizontal global deve surgir.
- **Impressão e PDF via navegador:** estilos específicos removem sidebar, menu e controles não úteis e apresentam os indicadores com superfícies legíveis, sem transmitir documentos a servidor.
- **CSS consolidado:** `styles/horizon-operacional.css` e `assets/horizon-operacional.css` foram concatenados, na mesma ordem da cascata, em **uma folha** `assets/horizon-operacional.css`; `index.html` carrega esse arquivo. O arquivo antigo é mantido temporariamente para comparação e deve ser excluído somente após validar a equivalência. `styles.css` ainda permanece como camada base compatível. Reorganizar completamente esse legado em componentes é melhoria arquitetural futura, não uma tarefa segura de fazer sem regressão visual.
- **Cobertura automatizada:** novos testes do relatório em `tests/reports-desktop.test.mjs`; Playwright da auditoria percorre os perfis e as telas de relatório, com larguras **320, 360, 390, 430, 768, 1024, 1440 e 1920 px**. Testes de integração ainda devem rodar após a última consolidação para concluir a etapa.

## Critérios e limitações
- Dados exibidos **somente locais**; não existe ainda servidor de produção ou supervisão remota.
- Status de GPS é informação operacional e não atestado inequívoco de comportamento.
- 25 m, permanência contínua de 30 s, sequência, desvio/justificativa/retorno ao ponto e base continuam inalterados.
- O serviço Android de localização em segundo plano precisa de build e testes em dispositivos reais; o navegador não mantém rastreio após encerramento.
- Tratar `100%` em uma amostra de uma única ronda como indicador **local do cenário**; nunca anunciar como evidência de eficiência empresarial.
- A melhoria de desktop não justifica reduzir o espaço de ação ou criar textos minúsculos no celular.
- A auditoria não substitui testes com pessoas, leitores de tela, verificação de serviço Android, segurança e LGPD.

## Verificação
- [Suite Node de sintaxe e testes](https://github.com/danielnep/app-hondas-maxvel/actions)
- [Auditoria ampliada Chromium mobile/tablet/desktop](https://github.com/danielnep/app-hondas-maxvel/actions)
- [Issue da etapa](https://github.com/danielnep/app-hondas-maxvel/issues/6)

**Estado deste documento:** entregas implementadas; conclusão final condicionada a QA da versão atual após consolidação.

## Próxima etapa
Etapa 07: validação integral de fluxos, segurança e transparência do protótipo, acessibilidade (contraste, foco, leitor de tela), performance e especificação do build/piloto Android.

**Desenvolvido por Horizon | Daniel N. Xavier**.
