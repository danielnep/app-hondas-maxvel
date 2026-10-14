# Rondas Pro · Premium Dark transversal · 14-10-2026

## Aprovação e escopo
O usuário aprovou replicar a repaginação Premium Dark do cockpit no restante do sistema, preservando a identidade institucional Maxvel e as regras operacionais.

- Ambiente do aplicativo: `index.html` (perfis simulados de vigia, COI/monitoramento, cliente, vistoriador e administração).
- Ambiente autenticado: `central.html` (operador/COI, cliente, gestão e outros papéis autorizados).
- Estilo compartilhado: `assets/maxvel-premium-system-20261014.css`, carregado **depois** das folhas anteriores.
- Não há alteração de JavaScript operacional, servidor, banco, GPS, permissões ou componentes de registro.

## Decisões visuais
- Fundo geral grafite preto `#09090B`; vermelho Maxvel `#F5223D` para marca e emergência; celeste existente `#38BDF8` para rotas e foco; amarelo de alerta `#F7CB35`; verde de confirmação `#10B981`.
- Header e menu com linhas institucionais discretas, superfície fosca e seleção legível.
- Títulos, métricas e filtros com hierarquia; listas/tabelas priorizadas sobre cards de detalhe repetitivos.
- Campos escuros e acessíveis, foco aparente, controles de toque de 43–44 px, modais no primeiro plano.
- Desktop utiliza densidade informacional; mobile reconstrói composição sem depender de rolagem lateral das abas.
- Conteúdos extensos continuam permitindo rolagem **necessária**; nenhuma regra global força `overflow:hidden` em relatórios/triagem.
- Redução de movimento respeita preferência do sistema e animações não alteram estado operacional.
- Cockpit de ronda e cortina de cronômetro aprovados permanecem inalterados nesta etapa.

## Validação
- `npm run check`, `npm test` e auditorias GitHub Actions do projeto; teste estático `premium-dark-system.test.mjs`.
- Conferência obrigatória em dispositivo real e navegador com estados de erro, tabelas grandes, modal com teclado e fonte ampliada.
- Ambiente PWA atualiza cache v24; publicação e sincronização de serviço externo devem ser confirmadas por commit.

## Revisão Uniform aprovada em 14/10/2026
- Remoção de degradês decorativos nas superfícies dos estilos ativos do sistema, Central e cockpit.
- Raios de referência de 7px nos controles, 10px nos painéis e 14px nas janelas; ícones de pânico seguem circulares.
- Abas do dashboard em uma linha de cinco, sem card envolvente; listas de equipe, alertas e histórico com divisórias, sem cards individuais.
- Indicadores compactos na mesma faixa; somente mapas, formulários e blocos independentes mantêm contêiner.
- Fundo geral preto grafite, vermelho Maxvel, celeste atual e alertas semânticos preservados.
- Motor de ronda, cronômetro sobreposto, permissões, dados e backend não alterados.
- Editadas folhas CSS existentes; nenhuma folha extra foi criada.
