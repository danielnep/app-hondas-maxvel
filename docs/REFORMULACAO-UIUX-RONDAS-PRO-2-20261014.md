# Rondas Pro 2.0 · Reformulação UI/UX autorizada
Data: 14/10/2026 · Grupo Maxvel · branch `feat/rondas-pro-2-uiux-reformulacao-20261014`

## Objetivo e escopo
Redesenhar a experiência da demonstração (`index.html`) e da central autenticada (`central.html`), preservando identidade Maxvel, fluxo de ronda, perfis, dados reais e regras de autorização.
A identidade Maxvel continua com fundo geral grafite preto, vermelho institucional existente, branco e cores funcionais previamente aprovadas. Os tokens CSS documentam valores em uso e não reivindicam corresponder a um manual oficial da marca.

## Auditoria de origem
- As duas interfaces possuem folhas de estilo legadas extensas e especificidade excessiva, especialmente `ronda-pro.css` e os overrides transversais. A refatoração integral deve ocorrer em lotes com captura visual antes/depois; remover de uma vez quebraria telas existentes.
- O seletor de cinco abas da demonstração comprimia texto no mobile.
- A central autenticada apresentava muitas seções no mesmo patamar de menu, dificultando as tarefas mais frequentes.
- O COI mostrava a agenda antes de ocorrências e alertas que exigem decisão.
- A verificação do ponto continha anexos identificados, mas sem prévia visual reutilizável do arquivo salvo na sessão.
- A experiência de cliente precisava tornar a cronologia explícita; o formulário do vistoriador precisava descrever a sequência tarefa→critério→evidência.
- O cronômetro dinâmico com `aria-live="polite"` poderia causar anúncios excessivos, especialmente em uso por leitor de tela.

## Mapa de navegação aprovado
**Vigia:** ronda, atribuições, notificações, comunicar. Histórico e ajuda em Mais áreas.
**COI/Monitoramento:** operação, notificações, despachos, ocorrências. Rotas, equipe, alertas e relatórios em Mais áreas, conforme permissão existente.
**Administração:** indicadores, monitoramento, notificações, despachos. Demais seções, incluindo permissões, em Mais áreas.
**Vistoriador:** vistorias, despachos, notificações, comunicação. Guia em Mais áreas.
**Cliente:** Meu acompanhamento, com guia contextual.
Desktop utiliza lista lateral; mobile exibe ações primárias em grade e expande as áreas secundárias sob demanda.

## Implementado nesta branch
- Navegação central por tarefas com ícones SVG coerentes, indicação da página atual e área de informações de perfil autenticado.
- COI com fila de prioridades acima da agenda: pânico primeiro, depois desvios/ocorrências e falhas de GPS; não representa classificação automática de culpa.
- Cliente com linha do tempo clicável dos registros existentes e localização opcional do último GPS disponível.
- Vistoriador com indicação de etapas, checklist numerado e campos preservados para a API real.
- Vigia com `aria-current` na navegação; abas administrativas mobile em três colunas, não cinco comprimidas.
- Cortina de ponto com miniaturas de imagens e confirmação de captura por posição, limpeza de Object URLs e separação entre cronômetro visual e mensagens anunciáveis.
- Design tokens de espaçamento, raios já aprovados 7/10/14px, ajustes de responsividade, foco visível e preferência por movimento reduzido no CSS transversal existente.
- PWA v28 para renovação segura de cache visual.
- Testes de contrato visual e regressão das responsabilidades.

## Estados e limites
1. **Simulação:** index.html usa dados locais ilustrativos, mesmo quando representa múltiplos perfis.
2. **Operação autenticada:** central.html reflete registros reais armazenados pela API. Os elementos novos não ampliam autorizações.
3. **GPS:** localização recente ou ausente deve ser comunicada como medição, nunca prova absoluta de presença.
4. **Evidências:** miniaturas permanecem locais até a persistência/transferência já implementada pelo fluxo; não declarar envio remoto antes de confirmação.
5. **Offline:** reenvio de dados, notificações em background e armazenamento nativo ainda precisam homologação em hardware real.
6. **Identidade:** a marca e cores Maxvel não podem ser substituídas por Horizon.

## Quality gates
- Sintaxe JS, testes Node e testes visuais existentes precisam passar.
- Testes de navegador em sete larguras, acessibilidade automatizada, auditoria mobile e build Android.
- Teste físico Android: GPS negado, precisão variável, selfie/câmera traseira, pânico, teclado virtual, bateria, desconexão e reinstalação da PWA.
- Teste multi-perfil: vigia, COI, admin, cliente e vistoriador, incluindo filtros de posto.
- Comparação de capturas antes/depois e inspeção manual de sobreposições ainda são necessárias para homologação visual integral.
- Merge somente depois dos checks automatizados verdes; publicação externa somente com confirmação de SHA.

## Próximas etapas de redução de dívida CSS
Inventariar seletores duplicados; decidir por componentes e tokens comuns; migrar regras legadas tela a tela; remover `!important` redundantes mediante screenshot diff; não destruir estilos antigos sem evidência de equivalência.

## Métricas a observar em piloto
Conclusão de tarefa, tempo até ação crítica, abandono de formulários, falhas de captura, passos para abrir notificação, recuperação após GPS e taxa de erros por perfil. Não inventar números de melhora sem usuários reais.
