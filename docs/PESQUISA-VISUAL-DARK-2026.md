# PESQUISA APROFUNDADA · PROTOCOLO VISUAL HORIZON DARK
**Hondas Maxvel | 11 de outubro de 2026 | Etapa P00 (Pesquisa e preparação) | CONCLUÍDA**

## 0. Briefing corrigido e irrevogável para as etapas subsequentes
- **Estilo predominantemente DARK**: grafite/cinza-escuro é a base, azul Horizon como cor de marca e ação, branco/gelo só em textos e pequenas superfícies pontuais. **Branco é minoria da composição visual.**
- Visual limpo, profissional e organizado. Não é preto chapado, neon exagerado, vidro por toda parte ou azul bebê.
- Maxvel é a marca principal do sistema. Horizon assina o desenvolvimento e a tecnologia com lockup legível nos tamanhos corretos.
- Simulação **é o próprio app**, em uma viewport bem resolvida. Não reintroduzir página comprida, mockups duplos ou demos falsas.
- Mobile prioridade absoluta; desktop/tablet seguem a mesma linguagem e adaptam densidade.
- Regra de trabalho: **pesquisar profundamente cada etapa antes de executar, medir, testar e aprovar, e só então avançar**.
- Não trocar as regras de domínio (25 m/30 s contínuos, pontos em sequência, desvio/justificativa/retorno), e não prometer backend/notificação remota ou GPS além das limitações reais.

## 1. Pesquisa de UX/UI: fontes primárias e conclusões práticas

### 1.1 Apple Human Interface Guidelines, Dark Mode
https://developer.apple.com/design/human-interface-guidelines/dark-mode
- O dark não se limita à inversão do claro.
- Fundos **base** mais escuros e superfícies **elevadas** ligeiramente mais claras geram hierarquia.
- Verificar contraste e legibilidade em todos os estados; em textos pequenos, buscar 7:1 quando viável.
- Imagens/ícones e áreas brancas devem ser tratados para não iluminar excessivamente a interface.
**Aplicação:** usar 3–4 níveis de cinza-grafite e títulos mais claros; evitar cartões brancos grandes e brilho constante.

### 1.2 Material Design 3, papéis de superfícies tonais
https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md
https://github.com/material-components/material-components-android/blob/master/docs/theming/Dark.md
- O Material usa superfícies tonais com papéis como `surfaceContainerLow`, `surfaceContainer` e `surfaceContainerHigh`; tonalidade comunica elevação.
- Cinza escuro em vez de preto puro facilita diferenciação de níveis e legibilidade.
**Aplicação:** tokens semânticos por função, não valores hardcoded em centenas de seletores. Reservar azul para ações e identificação de estado.

### 1.3 Android, design adaptativo real
https://developer.android.com/develop/ui/views/layout/build-responsive-navigation
https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes?hl=pt-br
https://developer.android.com/codelabs/adaptive-material-guidance
- Classes compacta, média e expandida exigem **mudanças de composição**, não somente redução proporcional.
- Barra inferior compacta no celular; barra lateral/rail em telas maiores; tela grande ganha composição em painéis.
- Layout não deve ter altura fixa de 880px nem depender de uma captura única.
**Aplicação:** manter o workspace Ronda em altura dinâmica, mapa/ação contextual, nav fixa, painéis roláveis apenas quando necessário. Em desktop, mapa+alertas/relatório lado a lado.

### 1.4 Nielsen Norman Group, clareza e carga cognitiva
https://www.nngroup.com/articles/progressive-disclosure/
https://www.nngroup.com/articles/icon-usability/
https://www.nngroup.com/articles/content-chrome-ratio/
https://www.nngroup.com/articles/onboarding-tutorials/
- Divulgação progressiva: tarefa importante sempre visível; opções secundárias sob demanda.
- Ícones de navegação precisam de rótulo, especialmente no celular, sem depender de hover.
- O excesso de navegação e cabeçalhos reduz a área útil da atividade em telas compactas.
- Onboarding ajuda no contexto da ação, sem exigir memorização de blocos longos.
**Aplicação:** status, mapa, próxima ação e timer têm prioridade; FAQ, justificativa detalhada, histórico e configurações são contextuais.

### 1.5 WCAG 2.2 e Android Accessibility
https://www.w3.org/Translations/WCAG22-pt-BR/
https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
https://developer.android.com/guide/topics/ui/accessibility/apps
- 4,5:1 para texto normal e 3:1 para controles significativos (conforme critérios correspondentes da WCAG).
- Alvos touch do Android recomendados em 48dp; na web adotar preferência 44–48 CSS px, distinguindo dp/CSS px.
- Foco visível, indicador de estado acompanhado por texto, suporte a redução de movimento e uso por teclado.
**Aplicação:** auditar pares no background efetivo e não declarar certificação com base em apenas testes estáticos.

## 2. Inspeção do repositório em 11/10/2026

Repositório: `danielnep/app-hondas-maxvel`, branch `main`.

| Observação | Evidência |
|---|---|
| CSS ativo Horizon muito grande | `assets/horizon-operacional.css`: **73.569 caracteres** antes da nova reformulação |
| CSS legado igualmente extenso | `styles.css`: **50.094 caracteres** |
| Muitas definições sobrepostas | CSS Horizon: **173 declarações `background`/`background-color`**, **118 `!important`** e **34 blocos `@media`** |
| Lockup já integrado | `assets/horizon-maxvel-lockup.svg` e `src/app.js`; `index.html` inclui boot com as duas marcas |
| QA contraditório | Testes principais, acessibilidade, app imersivo, compilação Android e deploy da revisão mais recente passaram; **auditoria UI UX mobile falhou** |
| Falha com bloqueio de clique | [Run 38184896604](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38184896604): `.brand.horizon-maxvel-brand` intercepta o clique de `[data-action=login]` em 430px |
| Regra de viewport quebrada | Mesmo run: viewport configurado 430px e `innerWidth` medido em cerca de 527–532px em estados iniciais |
| Teste obsoleto | Auditoria procura `.presentation-title h1`, componente removido quando a simulação passou a ser o próprio app |

**Diagnóstico:** não basta adotar novas cores. O design atual é um patchwork de estilos de várias iterações. É necessário primeiro corrigir a regressão responsiva e atualizar a auditoria; depois criar tokens dark semânticos e reconstruir superfícies por componente com testes. O antigo P00 não deve ser confundido com produção alterada.

## 3. Paleta investigada: Horizon Graphite Dark (HIPÓTESE, NÃO APLICADA)

Objetivo da composição visual: **base 80–90% superfícies escuras** em elementos da interface, como referência editorial, **não** métrica normativa de contraste. Branco/gelo quase exclusivamente no texto, controles específicos e sinalização excepcional; o mapa cartográfico pode permanecer claro por razões de leitura e deve ser avaliado como elemento funcional, não fundo decorativo.

| Papel semântico | Cor proposta | Finalidade |
|---|---|---|
| `--hx-bg` | `#111820` | fundo global grafite |
| `--hx-surface-1` | `#161F2B` | sidebar, header, rodapé/navegação |
| `--hx-surface-2` | `#1E2937` | cartões/painéis operacionais |
| `--hx-surface-3` | `#243141` | painéis elevados e seleção |
| `--hx-surface-hover` | `#303E4F` | hover e seleção secundária |
| `--hx-brand-cta` | `#145BB0` | ação principal com texto branco |
| `--hx-brand-bright` | `#2875C4` | ação alternativa com texto branco |
| `--hx-cyan` | `#79D5FA` | linha, GPS, ponto ativo sobre base escura |
| `--hx-foreground` | `#F2F5F8` | texto principal claro sem branco puro |
| `--hx-foreground-muted` | `#BAC7D5` | texto secundário |
| `--hx-foreground-soft` | `#9DAEBE` | metadados, quando aprovado no par |
| `--hx-success` | `#45BEA0` | confirmado, acompanhado de ícone/texto |
| `--hx-warning` | `#FFCF80` | atenção, acompanhado de ícone/texto |
| `--hx-danger` | `#FF818C` | ocorrência/desvio, acompanhado de ícone/texto |

### Contraste medido com luminância relativa WCAG
| Foreground / background | Razão | Avaliação para texto comum |
|---|---:|---|
| `#F2F5F8` sobre `#111820` | **16,33:1** | AA ✓ |
| `#F2F5F8` sobre `#1E2937` | **13,44:1** | AA ✓ |
| `#BAC7D5` sobre `#1E2937` | **8,56:1** | AA ✓ |
| `#9DAEBE` sobre `#161F2B` | **7,30:1** | AA ✓ |
| `#FFFFFF` sobre `#145BB0` | **6,66:1** | AA ✓ |
| `#FFFFFF` sobre `#2875C4` | **4,74:1** | AA ✓ |
| `#79D5FA` sobre `#111820` | **10,81:1** | AA ✓ |
| `#45BEA0` sobre `#1E2937` | **6,39:1** | AA ✓ |
| `#FFCF80` sobre `#1E2937` | **10,15:1** | AA ✓ |
| `#FF818C` sobre `#1E2937` | **6,14:1** | AA ✓ |

Os valores são aproximados para esses pares sólidos e **não** homologam transparências, mapa, bordas, ícones, estados de interação ou a UI como um todo.

## 4. Hipóteses de layout e hierarquia a validar antes de desenhar
1. **Ronda mobile:** canvas único escuro. Header pequeno com lockup Horizon×Maxvel compactado e menu de perfil; status GPS contextual; mapa em painel que não pode virar um bloco em branco, ação atual imediatamente abaixo ou lado a lado conforme classe de altura; barra inferior curta.
2. **Ação/ponto:** painel `surface-2`, título 17–20px, instrução essencial 13–16px, botão CTA azul. Tempo, raio e desvio em informação pontual.
3. **Mapa:** pode conservar tiles claros, mas frame escuro, overlay funcional e controles sem glow exagerado. Testar mapa mais neutro se a cartografia ficar brilhante demais sem sacrificar leitura de ruas.
4. **Supervisão:** filas de eventos em `surface-2`, destaque de severidade sem colorir blocos inteiros; mapa e eventos alternáveis em mobile, coexistentes em desktop.
5. **Gestão/Admin:** densidade operacional e relatórios visíveis; dados locais e status simulado expostos.
6. **Landing/entrada:** assinatura Horizon forte porém proporcional; primeira ação clicável, sem logo interceptar CTA. Introdução curta, não um catálogo de features em vários scrolls.

## 5. Processo obrigatório antes de qualquer implementação visual
```text
Pesquisa de fontes/boas práticas e do código existente
 → Medições e diagnóstico com screenshots reais
 → Proposta de tokens + decisões de UX documentadas
 → Teste de contraste, responsividade e efeitos previstos
 → Implementação em componentes existentes
 → CI: testes de domínio + navegador + acessibilidade
 → Capturas antes/depois e revisão manual
 → Fechamento da issue com evidências
 → Próxima etapa
```

**Portas de aprovação**:
- Pesquisa P00 concluída com fontes e inspeção estática. Não equivale a aprovação de nenhum layout novo.
- V01 primeiro resolve regressão P0 de 430px e do script. Não aplicar redesign completo durante correção emergencial.
- V02 só pode iniciar após V01 validada; aqui se aprofunda conceito dark e lockup no contexto das telas.
- V03 implementa tokens dark e os componentes em fatias; proibir “mais uma cascata enorme de !important” como solução.
- V04–V08 seguem roteiro de UX e QA já aprovado, sem pular etapas.
