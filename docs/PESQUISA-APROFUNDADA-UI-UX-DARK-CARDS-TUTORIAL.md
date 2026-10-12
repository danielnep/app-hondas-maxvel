# HORIZON · BIBLIOTECA PERMANENTE DE UI/UX E ARQUITETURA VISUAL
## Pesquisa aplicada ao App Hondas Maxvel · 12 de outubro de 2026

**Status:** pesquisa/documentação realizada antes de alterar a interface. Referência versionada e recuperável na pasta `docs/` do projeto. Não equivale a atualizar automaticamente a memória pessoal do ChatGPT. Cada regra abaixo é uma orientação sujeita a testes reais.

## A. Fontes estudadas e descobertas

### 1. Heurísticas gerais e aplicações complexas (Nielsen Norman Group)
- [10 heurísticas de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/): visibilidade de estado, controle/liberdade, prevenção de erros, reconhecimento no lugar da memorização, consistência, desenho minimalista e ajuda útil.
- [Heurísticas em aplicações complexas](https://www.nngroup.com/articles/usability-heuristics-complex-applications/): em painéis corporativos, atualização clara de dados e feedback das ações reduz incerteza.
- [Onboarding e ajuda contextual](https://www.nngroup.com/articles/onboarding-tutorials/): não ensinar tudo antecipadamente; recorrer a informação progressiva perto da função, sempre recuperável.
**Aplicação Maxvel:** ao entrar vê-se o status da ronda; o botão principal descreve a ação que efetivamente ocorrerá; `?` explica no momento em que interessa. Evitar cartazes comerciais, textos longos e sobrecarga da primeira tela.

### 2. Aprendizagem dentro do app e navegação intuitiva (Apple HIG)
- [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding): o produto deve se ensinar no uso; fluxo breve e opcional, ajuda contextual e possibilidade de reabrir depois.
- [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode): não basta inverter tons; fundos base/elevado e contraste perceptivo dão profundidade e legibilidade.
- [Launching](https://developer.apple.com/design/human-interface-guidelines/launching): lançamento sem etapas que atrasem o acesso ao produto.
- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles): finalidade, autonomia, responsabilidade, familiaridade, recuperação de erro.
**Aplicação Maxvel:** entrar diretamente na interface operacional; após a primeira entrada, iniciar uma visita guiada leve dentro dela, sem criar uma tela separada; fechar/reabrir a qualquer hora. Segurança e transparência de localização não devem ser ocultadas pelo tutorial.

### 3. Layout mobile, desktop e cards (Android)
- [Estrutura de conteúdo e composição](https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure): base em grade consistente, margens compactas de referência de 16dp, agrupamento por afinidade e separação por espaço/tipografia.
- [Layouts comuns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/common-layouts): lista-detalhe para conteúdo consultável; painel de apoio ou dialog para informação complementar; feed/cards para itens equivalentes.
- [Layouts adaptativos](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout): pensar primeiro em largura, depois altura; reflow, revelar conteúdo e mudar forma de apresentação, não simplesmente apertar cartões até caber.
- [Layouts relativos e personalizados](https://developer.android.com/design/ui/mobile/guides/layout-and-content/custom-layouts): agrupamentos em painéis e áreas de trabalho, com imersão quando a tarefa exige.
**Aplicação Maxvel:** cards são contêineres de uma decisão/um objeto, **não cada frase**. Ronda = mapa + ação; Supervisão = lista de eventos + detalhe/mapa; Gestão = indicadores curtos + relatório; Administração = configuração e contexto. No mobile, o mapa e a ação são prioritários; no desktop, painéis lado a lado.

### 4. Cor, composição e acessibilidade
- [WCAG 2.2 tamanhos mínimos de alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): conformidade AA 24×24 ou espaçamento suficiente conforme exceções; o projeto mira alvo de 44–48px em ações críticas como recomendação ergonômica superior.
- [WCAG 2.2 foco não encoberto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum): foco teclado não pode ficar escondido por barra fixa/overlays.
- [Diálogo modal WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): fundo realmente inerte, foco retido no modal e devolvido ao elemento anterior; Escape fecha quando permitido. `<dialog>.showModal()` é preferível a pseudo-modal inseguro.
- [W3C H102 HTML dialog](https://www.w3.org/WAI/WCAG22/Techniques/html/H102): elemento nativo simplifica semântica, foco e operabilidade.
**Aplicação Maxvel:** cada `?` dispara um modal específico, com backdrop preto fosco translúcido e cartão dark. O tour usa camada de destaque visual para o alvo mais caixa de informação acessível; usuário pode sempre fechar e reabrir. Não bloquear consentimento obrigatório dentro de tour opcional.

## B. Direção cromática confirmada pelo cliente

**DARK PREDOMINANTE.** Cinza-grafite domina, azul Horizon é o acento e branco é minoritário. Visual limpo, organizado e profissional, sem preto puro e sem cores infantis. Deixar cartografia clara porque ruas precisam de leitura.

### Tokens de destino (proposta para validar no CSS real)
| Token | Cor | Aplicação |
|---|---|---|
| `--ui-bg` | `#111923` | fundo principal |
| `--ui-panel` | `#192431` | cards elevados |
| `--ui-panel-2` | `#213040` | modal/menu superior |
| `--ui-border` | `#35485B` | divisórias |
| `--ui-text` | `#F1F6FC` | texto principal, não fundos |
| `--ui-muted` | `#B7CBDC` | texto secundário |
| `--ui-action` | `#145BB0` | botão de ação (texto branco) |
| `--ui-accent` | `#55C9F5` | foco, posição e destaque limitado |
| `--ui-success` | `#42C7A3` | situação validada, também texto/ícone |
| `--ui-warning` | `#FFCB7A` | atenção |
| `--ui-danger` | `#FF7C88` | desvio |
| `--ui-map` | `#E7EFF7` | área cartográfica clara, quando necessária |

Pares verificados matematicamente na revisão (WCAG luminância sRGB): branco sobre `#145BB0` **6,66:1**; `#243141` em branco **13,20:1**; `#374151` sobre `#F5F7FA` **9,60:1**; `#4B5563` em branco **7,56:1**. **A aprovação de um par não assegura a acessibilidade da tela completa.** Todos os demais pares devem ser testados.

A cor não deve carregar sentido sozinha: adicionar estado e explicação textual. Gradientes só para distinções raras, sem chuva de brilhos. Uma sombra leve + contraste de superfícies deve bastar para separar um card.

## C. Arte do uso de cards
- Card só quando criar uma região de responsabilidade: `Ação atual`, `Mapa`, `Alerta específico`, `Resumo da operação`.
- Evitar card dentro de card. Alternativas: linha, separador, lista, espaçamento ou detail panel.
- Reduzir ornamentos: padding coerente (12/16/20), radius 12–16, borda 1px e eventual sombra discreta.
- Heading informa **o que**; rótulo de status informa **como está**; CTA informa **o que acontece ao tocar**.
- Permitir expandir somente onde melhora o foco (histórico e instruções); não ocultar próximo ponto e controle principal.
- Em 320×600 não induzir scroll longo: mapa e ação dentro da viewport e menu compacto.

## D. Tutorial solicitado pelo cliente

### Porta de entrada
Ao abrir, mostrar **o aplicativo verdadeiro**, com quatro perfis no topo: `Vigia/Ronda`, `Supervisão`, `Gestão`, `Administração`. Tudo no mesmo cenário local, com mensagens discretas de avaliação. Na primeira abertura, tutorial de boas-vindas por cima do app; **sem landing comercial ou assistente de cadastro prévio**.

### Cortina e etapas
- Tela abaixo fica escurecida com `rgba(0,0,0,.7)`, e alvo principal recebe destaque (spotlight) sem sacrificar foco semântico.
- Janela em cima, no estilo dark, com título, descrição curta, exemplo prático, `Entendi · continuar` e `Fechar tutorial`; avançar só quando o usuário confirma.
- Etapas sugeridas: 1) perfis no topo; 2) mapa e geocerca; 3) próxima ação; 4) desvio/ocorrência; 5) supervisão e alertas; 6) onde reabrir ajuda.
- O usuário pode fechar **a qualquer momento**. `Ajuda → Rever tutorial` no menu lateral e opção no menu do usuário e topo.
- `?` pequenos e discretos junto de header/perfis, mapa, ponto atual, timer, botão principal, ocorrências, avisos, KPIs, registros e opções de gestão.
- Cada `?` abre explicação aprofundada do **elemento selecionado** e escurece o restante. Nunca usar `?` sem comportamento nem tooltip exclusivo de hover.
- Tutorial é **opcional**, consentimento de localização é **independente**. Não coletar GPS sem permissão, nem deixar opção de tutorial gerar GPS.
- Concluir/perder o tour deve persistir localmente para não insistir a cada abertura; ainda pode ser reaberto.
- Sobrepor botão/modal deve evitar `z-index` incontrolável, rolagem inesperada e backdrop que intercepta o controle errado.
- Para leitores de tela, o diálogo modal tem o contexto em texto. Spotlight é complemento visual, não única forma de aprender.

## E. Fonte do projeto anexada
O documento **Projeto de Plataforma de Rondas Inteligentes** apresenta como requisitos/ideias futuras uma abordagem combinando NFC, localização como evidência complementar, fotos/checklists, funcionamento offline com sincronização e isolamento multiempresa. O próprio documento é um **planejamento inicial**, não prova de implementação. Essas funcionalidades **não** devem ser anunciadas como existentes no Maxvel até desenvolvimento/verificação. Ele também destaca um fluxo de ronda rápido, simples e utilizável com uma mão, que é diretamente relevante para o redesenho.

## F. Plano sequencial de implementação
1. Pesquisa, audit e documentação persistente no GitHub (este documento), mais tarefas detalhadas.
2. Entrada direta no aplicativo, seleção de papéis no topo e retenção do mesmo estado de ronda. Consentimento de localização independente.
3. Tour contextual com cortina escura, uma instrução por vez, skip/reopen/persistência e foco acessível.
4. Ajuda contextual `?` em áreas reais com conteúdo útil e teste de cada botão.
5. Tema dark consolidado, cards, tipografia, layout mobile/tablet/desktop, identidade Horizon e Maxvel por **logos reais**.
6. Testes abrangentes (320×600; 360×700; 390×780; 430×900; 768×1024; 1024×768; 1440×900), contraste, axe, regressões, Android build e documentação.

**Padrão de aceite:** app inicia diretamente no workspace; role bar sempre acessível; tour pode fechar e reabrir; foco do diálogo/ESC ok; controles ? funcionam; tela mobile sem overflow e CTA utilizável; regras de 25m/30s/desvio/justificativa permanecem intactas; sucesso de testes comprovado antes de comunicar aprovação.
