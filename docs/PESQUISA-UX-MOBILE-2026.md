# Pesquisa aplicada de UI/UX mobile-first · Hondas Maxvel
**Etapa 01 de 07 | 11 de outubro de 2026 | Horizon**
**Status: pesquisa documental + auditoria inicial concluídas. Código de produção deliberadamente inalterado nesta etapa.**

## 0. Contexto e objetivo
O usuário pediu revisão profunda da experiência do aplicativo **Hondas Maxvel**, com prioridade máxima para celular e melhoria progressiva do desktop. O diagnóstico do usuário: visual muito claro, sem força, excessivamente "infantil", com cores sem personalidade e layout mobile pouco refinado. É um sistema profissional de **acompanhamento de rondas**, não um jogo. A identidade Horizon (branco, azul tecnológico/celeste, azul-prateado) deve permanecer reconhecível, mas não obriga que toda a interface seja clara. A paleta precisa de profundidade, diferenciação de superfícies e hierarquia intencional. Nenhum breakpoint único, altura fixa ou referência de 880 px deve definir o mobile.

**Escopo:** navegação, uso operacional do ronda no celular, onboarding de localização, mapa, justificativas, supervisão e relatórios; apresentação do próprio produto funcional, não conjunto de imagens fictícias. Simulação deve seguir explicitamente rotulada enquanto não houver operação real conectada.

## 1. Método de estudo empregado
1. Leitura de fontes primárias de design e acessibilidade (Android, Apple, Material 3, W3C), mais pesquisas e recomendações NN/g para descobribilidade e ergonomia.
2. Inspeção do CSS, HTML, JS e documentação reais do repositório `danielnep/app-hondas-maxvel`, branch `main`.
3. Revisão visual das capturas geradas pelo GitHub Actions/Chromium (mobile **410×880**, desktop **1450×1040**), obtidas do artefato `maxvel-browser-captures` do run 38174268427. **Essas capturas mostram essencialmente o primeiro modal**, não representam testes de todos os perfis e estados.
4. Verificação matemática preliminar da razão de contraste segundo a fórmula WCAG (luminância relativa, normalização sRGB).
5. Síntese de hipóteses de UX e desenho de entregas com critérios objetivos. **Não houve entrevistas, gravações de sessão, A/B tests ou medição de conversão.**

## 2. Síntese técnica das fontes externas

### Google Material 3 e Material 3 Expressive (2025–2026)
Pesquisa do Google documenta processos iterativos com eye-tracking, avaliação de percepções e testes de usabilidade na evolução do Material 3 Expressive. O resultado **não é licença para exagerar formas, brilhos ou animações**: hierarquia, contraste, alvos de toque, navegação reconhecível e distinção de componentes continuam prioritários. Adotar expressividade controlada para um sistema operacional de segurança: uma ação principal por contexto, destaque forte do próximo ponto, avisos inequívocos e densidade de informação equilibrada.

Fontes:
- https://design.google/library/expressive-material-design-google-research
- https://android-developers.googleblog.com/2025/05/android-design-google-io-25.html
- https://developer.android.com/develop/ui/compose/designsystems/material3
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns

### Ergonomia e navegação adaptativa Android
A documentação Android recomenda alvos de toque de **48×48 dp**, preservando hit targets amplos mesmo quando o ícone desenhado é menor. Em telas compactas, barra inferior é apropriada para **3 a 5 destinos de mesmo nível**. Para muitos destinos, usar hierarquia adicional, sem sobrecarregar a barra. Em telas médias e expandidas, considerar rail/sidebar e layouts lado a lado, nunca ampliar ingenuamente a versão do telefone.

Fontes:
- https://developer.android.com/guide/topics/ui/accessibility/apps
- https://developer.android.com/develop/ui/compose/components/navigation-bar
- https://developer.android.com/develop/ui/views/layout/build-responsive-navigation

### Apple Human Interface Guidelines: cor e modo escuro
Cor deve orientar estado, função e hierarquia, sem ambiguidade. Camadas no modo escuro distinguem **base** e **superfícies elevadas**. Branco intenso em toda a tela pode prejudicar o conforto em pouca luz; modo escuro não é simples inversão. Deve-se verificar legibilidade em luz forte e em baixa iluminação. Estado não pode ser comunicado só por cor.

Fontes:
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/dark-mode

### Nielsen Norman Group: rótulos e contexto
Ícones sem texto exigem interpretação e memorização, especialmente no celular sem hover. Usar ícone + legenda visível em destinos críticos. Bottom sheets servem para detalhes e ações contextuais, **não** para esconder informações que o operador deve acompanhar constantemente. Ajudas curtas junto à ação correta são preferíveis a exigir que o usuário memorize um guia inteiro.

Fontes:
- https://www.nngroup.com/articles/icon-usability/
- https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- https://www.nngroup.com/articles/bottom-sheet/

### W3C WCAG 2.2: acessibilidade mensurável
- Texto normal: razão de contraste **≥4,5:1**; texto grande: **≥3:1** (SC 1.4.3).
- Controles/elementos visuais significativos: **≥3:1** (SC 1.4.11).
- Área clicável de pelo menos **24×24 CSS px** ou exceções definidas na WCAG 2.2; adotar meta mais confortável de **44–48 px** para botões operacionais, sem confundir pixels CSS com dp Android.
- Garantir foco visível, sem dependência exclusiva de cor e sem scroll horizontal indevido.

Fontes:
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## 3. Auditoria da interface atual: evidências e gravidade

| Prioridade | Observação fundamentada | Risco operacional/UX | Próxima ação proposta |
|---|---|---|---|
| Crítica | No screenshot mobile, primeiro modal de localização ultrapassa a altura da área visível; checkbox e CTA ficam abaixo da primeira dobra | Usuário vê textos e cartões antes da decisão; pode abandonar ou acreditar que não há como continuar | Reestruturar em painel mobile compacto, resumo claro e detalhes progressivos; ação alcançável, sem esconder termos |
| Alta | Modal inicial mostra botão X visualmente, mas fluxo obrigatório bloqueia o fechamento | Affordance que sugere ação indisponível; confiança reduzida | Remover X nesse estado ou permitir fechar sem iniciar coleta, com alternativa sem GPS |
| Alta | CSS atual apresenta `:root` claro e múltiplos planos de branco, `#f4f9fc`, `#e9f7fe`, `#fff` em camadas recorrentes | Interface sem foco, sensação de infantilização descrita pelo solicitante | Novos tokens semânticos, superfícies com contraste e cor expressiva controlada |
| Alta | Texto e labels recorrentes em 10–12 px em cartões, legendas e micro-instruções | Baixa legibilidade ao caminhar, sob iluminação forte ou com tela reduzida | Body operacional 14–16 px, labels essenciais >=12–13 px conforme contexto, escala testada |
| Alta | Fonte `#668092` sobre fundo `#f4f9fc`: contraste calculado ≈3,91:1 | Não atinge 4,5:1 para texto normal | Texto secundário mais contrastante e teste de cada token |
| Alta | `#fff` sobre `#0e90c7`: contraste calculado ≈3,60:1 | CTA com branco nesse tom antigo não satisfaz 4,5:1 | Ação escurecida ou texto apropriado; validar states hover/disabled |
| Média | Media queries fragmentadas `max-width:1150,900,600,640,1200,950,600,690,650` em ordem acumulada | Sobrescritas imprevisíveis e divergência entre tamanhos intermediários | Reorganizar mobile-first por intenção/layout, quebrar CSS em módulos de camada |
| Média | Landing e dashboard continuam marcados como `protótipo`/cenário em vários lugares | Aparência pode parecer apresentação técnica, não produto real | Interface operacional como padrão; banner discreto e transparente só para simulação |
| Média | O mapa é real (OpenStreetMap), mas linhas do cenário são ilustrativas, não roteamento pelas ruas | Confusão entre cartografia e percurso homologado | Legenda de rota planejada / caminho observado / geocerca / precisão / fallback, sem prometer navegação real |
| Média | Navegação móvel nasce de `entries.slice(0,5)`, refletindo um recorte da navegação desktop | Pode incluir destinos em excesso ou ocultar prioritários do perfil | Definir arquitetura por perfil; 3–4 destinos essenciais, demais em ações secundárias |
| Média | Vários controles operacionais usam `small` e `min-height:37px` | Toques difíceis em contexto de serviço | Metas de toque 44–48 px e espaçamento de alvos adjacentes |

**Limite da auditoria:** screenshot revisado é de primeiro acesso em uma única versão do Chromium. Tabelas internas, scrolls e comportamento em todos os perfis ainda precisam de capturas e testes na etapa 02. Verificar problemas hipotéticos antes de afirmar que ocorrem em produção.

## 4. Proposta de linguagem visual: Horizon Operacional (proposta para validação na etapa 03)

A marca Horizon continua azul tecnológica; Maxvel ganha personalidade adulta e operacional, com **azul-marinho profundo e grafite frio como estrutura**, acentos azuis vivos, luz ciano pontual e branco reservado a áreas de leitura. Evitar pastéis infantis, gradientes decorativos por toda parte, excesso de cartões e vidro fosco pesado.

### Tokens preliminares
| Papel | Hex | Aplicação |
|---|---|---|
| `--surface-base` | `#091E34` | shell operacional/noite, fundo estrutural |
| `--surface-raised` | `#10283F` | cartões escuros e navegação |
| `--action-strong` | `#0755B5` | ações com texto branco (≈7,06:1) |
| `--action-accent` | `#147CE5` | rota, destaque e ações com foreground adequado |
| `--signal-cyan` | `#54C8F5` | localização/realce contra fundos escuros |
| `--text-on-dark` | `#E9F5FE` | texto principal escuro (≈14,6:1) |
| `--text-secondary-dark` | `#93B0C8` | texto secundário contra `#10283F` (≈6,64:1) |
| `--surface-light` | `#E9F5FE` | documentação, leitura, formulários e áreas contrastantes |
| `--success` | `#31CBA5` | confirmado + ícone/rótulo, não só cor |
| `--warning` | `#FFCF70` | atenção + símbolo/rótulo |
| `--danger` | `#FF6B76` | alerta/desvio + texto explicativo |

**Cuidado:** razões acima dependem dos pares explícitos e não validam qualquer combinação arbitrária. Os tokens são hipóteses de design para revisão, não uma identidade final aprovada.

### Diretrizes anti-infantilização
- Reduzir excesso de bordas arredondadas: usar raios discretos por função (ex.: 10–14 px para controle, 16 px para card).
- Evitar grandes áreas azul-leite e sombras plásticas.
- Uso disciplinado de ícones vetoriais profissionais e tipografia com peso claro; detalhes não devem competir com mapa/ação.
- Noite operacional: fundo escuro para frame, mapa nítido, cartão informacional legível, alertas em cores de segurança.
- O usuário nunca deve perder a informação do ponto atual, o raio de 25 m, a contagem de 30 s e o estado da localização.

## 5. Arquitetura mobile-first de navegação proposta
**Ronda (campo):** barra inferior com três destinos `Minha ronda`, `Ocorrências`, `Histórico`; acesso a ajuda contextual na tela e configurações no perfil. Home com status e GPS, ponto atual e CTA conforme estado; mapa dominante, timer, trajetória, raio e próximos pontos; sem excesso de telemetria decorativa.

**Supervisão (celular):** `Operação`, `Mapa`, `Alertas`, `Registros` (4 destinos). Mapa/cartões/resumos em painéis alternados; detalhes de ocorrências e justificativas em tela legível.

**Gestão/desktop:** sidebar e painéis compostos, mapa + fila + indicadores e histórico; colunas independentes sem transbordamento.

**Aviso da primeira abertura:** ênfase em finalidade, rastreamento durante ronda, limitações do segundo plano e duas escolhas claras. Termos completos acessíveis e roláveis sem esconder a ação primária. A marca informa com clareza que aceitar não concede GPS. O usuário pode experimentar sem GPS.

## 6. Critérios de qualidade e plano de teste futuro
- Tamanhos compactos: **320, 360, 375, 390, 412 e 430 px de largura** (alturas variadas), tablets 768/1024, desktop 1440; não otimizar exclusivamente para um frame de 880 px.
- Sem scroll horizontal, colunas espremidas, CTA inacessível ou elemento sobreposto ao teclado.
- Mapa funcional com barra superior compacta, legenda contextual, painel do ponto que não cubra todo o mapa; zoom e geocercas distinguíveis.
- Conteúdo crítico legível com contraste testado, mesmo sob brilho forte, e estados acompanhados de texto e ícone.
- 3–5 destinos claros por perfil; ação primária reconhecível e acessível sem procurar.
- Testes reais de transições: começar → chegar → 30 s → concluir → desvio → justificativa → retornar → supervisor → finalizar.
- Preparar testes automatizados de contraste por token, integridade CSS, smoke browser por viewport e comparação de screenshots.
- Fotos/simulações/cartografia reais vs dados fictícios com rotulagem honesta.
- GPS em segundo plano da versão nativa requer piloto; web não garante coleta após fechamento forçado.
- Medir desempenho: CLS, responsividade de mapas e fluxo, carregamento progressivo e mensagem offline.

## 7. Roadmap sequencial (executar UMA etapa por vez)
- **Etapa 01: Pesquisa, análise de evidências e hipóteses.** Esta entrega. Registrar estudo verificável e critérios. Não alterar tela final por impulso.
- **Etapa 02: Auditoria ampliada e arquitetura mobile.** Capturar onboarding, ronda, mapa, justificativa e supervisão em múltiplas larguras. Definir arquitetura de informação e wireflow por perfil.
- **Etapa 03: Sistema de design.** Tokens semânticos, contraste verificado, tipografia e componentes; escolher um conceito Horizon Operacional consistente.
- **Etapa 04: Execução mobile.** Refatorar telas e CSS para celular; corrigir modal, navegação, fluxo de ronda e mapa; validar interações.
- **Etapa 05: Supervisão mobile e mapa.** Garantir visão rápida de alertas, justificativas e geocercas; manter simulação realista e responsável.
- **Etapa 06: Desktop adaptativo.** Ajustar densidade, distribuição de painéis e qualidade visual mantendo paridade funcional.
- **Etapa 07: Qualidade e publicação.** Tests, auditoria WCAG, perfis, estados, screenshots, regressões, documentação e deploy. Não anunciar aprovação sem testar.

## 8. Status editorial
Esta pesquisa inclui orientação de fontes públicas e auditoria estática + capturas anteriores. **O código do produto não foi alterado nesta etapa**. O desenho final está sujeito a teste visual/funcional. A avaliação de "infantil" é feedback do usuário, não conclusão empírica independente.

**Autor documental:** Horizon · App Hondas Maxvel. Referências e critérios registrados para trabalho incremental.
