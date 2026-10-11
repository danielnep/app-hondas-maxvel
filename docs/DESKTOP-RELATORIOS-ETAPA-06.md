# Etapa 06 · Desktop, relatórios e manutenção do design system
**Hondas Maxvel | Horizon Operacional | 11/10/2026**

## Objetivo
Elevar a experiência desktop/tablet e dar continuidade à qualidade mobile, sem trocar arquitetura por mockups, sem gamificação, sem números fictícios apresentados como medição real.

## Entregas no código
- **Relatório operacional** com dados provenientes de `sessionList()`, `recentNotification()` e registros de ponto; indicadores de rondas concluídas, pontos verificados e eventos analisados, calculados com denominador real. Se não houver dados locais, todos os percentuais ficam em zero, sem simular desempenho.
- **Visão desktop com informação densa:** cartões KPIs mais legíveis, progresso operacional, feed de eventos com links para detalhamento, histórico e impressão local.
- **Ajustes responsivos:** relatório em duas colunas largas; empilha de forma controlada em tablet/mobile; histórico tabelado com scroll próprio; nenhum scroll horizontal global deve surgir.
- **Impressão e PDF via navegador:** estilos específicos removem sidebar, menu e controles não úteis e apresentam os indicadores com superfícies legíveis, sem transmitir documentos a servidor.
- **CSS consolidado:** `styles/horizon-operacional.css` e `assets/horizon-operacional.css` foram concatenados, na mesma ordem da cascata, em **uma folha** `assets/horizon-operacional.css`; `index.html` carrega esse arquivo. O arquivo antigo foi excluído após preservar seu conteúdo completo na folha consolidada, conservando o histórico no GitHub. `styles.css` ainda permanece como camada base compatível. Reorganizar completamente esse legado em componentes é melhoria arquitetural futura, não uma tarefa segura de fazer sem regressão visual.
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

**Resultado:** auditoria ampliada de **112 estados** em 8 larguras, nenhuma expansão de viewport e nenhum erro no fluxo, concluída com sucesso antes da exclusão da cópia redundante. Após a exclusão, a validação funcional e a publicação do projeto atual passaram; a auditoria extra do commit final foi iniciada, sem alterações comportamentais nesse commit.

## Próxima etapa
Etapa 07: validação integral de fluxos, segurança e transparência do protótipo, acessibilidade (contraste, foco, leitor de tela), performance e especificação do build/piloto Android.

**Desenvolvido por Horizon | Daniel N. Xavier**.

## Evidências de conclusão
- [Auditoria responsiva 112 estados, 320 a 1920 px, sucesso](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38180576008)
- [Validação automatizada e publicação após remoção da cópia de CSS](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38180746352)
- [Site publicado](https://danielnep.github.io/app-hondas-maxvel/)
