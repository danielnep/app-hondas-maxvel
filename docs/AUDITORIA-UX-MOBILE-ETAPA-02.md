# Etapa 02 · Auditoria real de UX mobile e arquitetura de navegação
**Projeto:** Hondas Maxvel · Horizon
**Data:** 11 de outubro de 2026
**Origem:** [Pesquisa anterior](PESQUISA-UX-MOBILE-2026.md), código vigente e duas auditorias de navegador no GitHub Actions.
**Estado:** auditoria funcional e primeira arquitetura concluídas; redesign visual não executado nesta etapa.

## 1. Objetivo e método
A encomenda é transformar a aplicação existente em um produto **mobile-first, corporativo e operacional**, abandonando o aspecto muito pálido/infantil sem perder a assinatura Horizon. Antes de editar telas, reproduzimos estados efetivos da aplicação com Chromium, abrindo o aviso inicial, entrando no perfil de ronda, iniciando a ronda de exemplo, simulando saída da rota, abrindo o formulário de justificativa e verificando a supervisão.

Evidências:
- [Auditoria interativa em seis larguras e desktop](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38176691397), artefato `maxvel-ux-audit-stage02`. Larguras 320, 360, 375, 390, 412 e 430 px; desktop 1440 px.
- [Auditoria complementar de fluxos, mapas e medidas](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38176597274), artefato `maxvel-ux-mobile-stage2`. Testou 320, 360, 390, 430, 768 e 1440 px; produziu fotografias de estados de ronda, desvio e justificativa.
- Capturas estão disponíveis como artefatos associados aos runs, não como imagens criadas artisticamente. Os dois testes iniciais falharam ao tentar clicar no logout oculto em telas compactas. Essa falha é um **achado confirmado de UX**; não se deve interpretá-la como funcionamento validado da troca de perfis.
- Os testes existentes de domínio e sintaxe seguiram aprovados nos workflows `Validação Hondas Maxvel`. Isso não significa que o layout passou no teste de usabilidade.

## 2. Defeitos constatados e priorização

### P0 · Criticidade operacional
1. **Barra inferior quebrada:** em todos os seis tamanhos compactos testados, a navegação de três destinos ocupa aproximadamente **178 px de altura** e os itens ficam empilhados em vez de horizontais. Capturas de ronda em 320–430 px. A barra cobre grande parte da área útil da tela. Revisar combinação de `.mobile-only{display:block}`, `.mobile-nav` e estilos específicos; garantir `display:flex` explícito no componente e `height` compacto, com `safe-area-inset-bottom`.
2. **Saída de perfil inacessível no celular:** `Sair do perfil` existe apenas em sidebar oculta, ou botão `desktop-only`. Em 320, 360, 375, 390, 412, 430 e 768 px, a automação não encontrou controle visível de logout. Para alcançar supervisão após ronda, a auditoria precisou contornar o controle via script, o que não é um caminho oferecido a usuários reais. Criar acesso de perfil/menu seguro e visível.
3. **Ação de iniciar fica enterrada na tela do ronda:** na captura de 390×740, `Iniciar ronda` aparece abaixo da altura do viewport, aproximadamente em y≈1257 px; 320×740, em y≈1354 px. O operador precisa atravessar cartões introdutórios, instruções e o mapa antes do primeiro comando. Redesenhar o estado `sem ronda` para mostrar objetivo + ação primária antes do mapa secundário.

### P1 · Alta prioridade UX
4. **Aviso inicial excessivamente longo:** em 320×740, conteúdo interno do modal cerca de 1302 px contra 664 px visíveis; 390×740, 1032 px contra 664 px. A caixa de aceite e o botão estão fora do trecho visível inicialmente. O modal é obrigatório, mas exibe `X` que não executa o fechamento enquanto o aviso estiver ativo. O botão de decisão deve ser acessível sem rolar pelo conteúdo inteiro; os detalhes continuam disponíveis, expansíveis e auditáveis. A opção `sem GPS` não pode desaparecer.
5. **Microtipografia excessiva:** o app utiliza diversos `font-size:10px/11px` em instruções operacionais, legendas, ações e estados. Em 390 px, a auditoria identifica cerca de 16 amostras com menos de 12 px antes de iniciar a ronda e ~13 no estado ativo. Não usar 10–11 px para instrução ou comando essencial. Reservar tamanhos menores para metadados não críticos (ainda garantindo contraste).
6. **Elementos de toque pequenos:** várias ações `small` têm ~37 px de altura; bolhas de pontos ~41 px; controles de mapa Leaflet ~30 px. As métricas contam inclusive atribuições e marcadores do mapa, que não são todos controles operacionais. O critério deve distinguir ações relevantes de conteúdo de atribuição. Meta de 44–48 px para toque operacional, separação suficiente entre alvos, sem interferir na atribuição OSM.
7. **Após as ações há posição de rolagem confusa:** depois de abrir o modal de regras/iniciar ronda, a captura do estado ativo na largura 390 mostra o final do mapa e o timer no meio da tela, sem o status/cabeçalho visíveis. O mapa/regras podem permanecer na rolagem anterior. Os marcos de navegação e mudanças de estado precisam restaurar foco e âncora apropriados, preservando o contexto do colaborador.
8. **Camadas demais na ronda:** saudação, explicação, botão de instruções, status, cartão de progresso, coach, dados da rota, mapa, timer e controles sucessivos. Hierarquia precisa reduzir informações redundantes: status ativo, próximo ponto, mapa/timer e comando principal, com detalhes secundários recolhíveis.

### P2 · Estrutura e estética
9. **Identidade visual demasiado clara:** múltiplos planos em `#fff`, azul muito pálido e gradientes de fundo tornam informações, cards e mapa visualmente equivalentes. Nova proposta separará estrutura escura, superfícies claras de leitura e azul/ciano só em elementos importantes. Não aplicar apenas `filter:invert` ou escurecer tudo.
10. **Navegação herdada do desktop:** `entries.slice(0,5)` alimenta menu móvel sem priorização explícita por perfil. Um supervisor precisa ver alertas e mapa primeiro; um colaborador precisa ver rota, ocorrências e histórico, não uma lista truncada de menu desktop.
11. **Protótipo versus operação:** termos demonstrativos se repetem em muitos cartões; preservar aviso contextual discreto para dados fictícios e acesso sem GPS, mas não transformar a interface operacional em uma exposição comercial permanente.
12. **Breakpoint acumulado:** CSS tem faixas em 600, 640, 650, 690, 900, 950, 1150 e 1200 px com sobreposição. Recomenda-se refatorar por componentes e comportamentos, não mais uma camada global de overrides.
13. **Ronda em desktop ocupa largura integral:** a interface do operador foi pensada para celular e, na captura desktop, seus cartões e botões expandem para ~1000 px sem benefício. Dar limite de leitura e reservar espaço lateral para resumo/mapa quando houver largura.

## 3. O que funcionou na auditoria
- Sem transbordamento horizontal da página nas larguras avaliadas, conforme métricas do navegador em estados capturados. **Isso não elimina cortes/ocultações internas.**
- Regras de raio 25 m, 30 s, sequência obrigatória, bloqueio por desvio e justificativa continuaram acessíveis, mesmo com a interface problemática.
- O formulário de justificativa foi renderizado no celular com campos, CTA e contexto suficientes; requer refino de legibilidade e foco, mas sua estrutura não precisa ser reinventada.
- As telas utilizam cartografia OpenStreetMap quando há conexão e fallback esquemático. O traçado de exemplo **não é uma rota de navegação homologada por ruas**.
- O modo de avaliação separa registro local/simulado de monitoramento real; continuar preservando essa honestidade.

## 4. Arquitetura de informação proposta (wireflow textual)

### 4.1 Ronda no celular: 3 destinos prioritários
**Barra inferior fixa, horizontal e compacta:** `Minha ronda` (ícone localização), `Ocorrências` (alerta), `Histórico` (registros). Cada destino com rótulo **sempre visível**. O perfil (nome, unidade, privacidade, ajuda e sair) fica no cabeçalho acessível.

#### Estado A · primeiro acesso
```text
Marca Maxvel / Horizon
Aviso curto: finalidade e contexto de GPS
Resumo claro: localização durante ronda, segundo plano nativo, não após parada forçada
[Ver condições completas]  ← conteúdo expandível
[ ] Li e compreendi
[Li e aceito · Continuar] ← perto do rodapé visível
[Explorar sem GPS]
```
O aceite não autoriza automaticamente GPS. Solicitação do sistema só no contexto de iniciar ronda real.

#### Estado B · aguardando início
```text
Cabeçalho [marca]              [Meu perfil]
Ronda do dia · unidade/rota
[Iniciar ronda] ← ação principal logo após o status
[Modo GPS real] [Cenário de avaliação]
Prévia do mapa + número de pontos
Barra: Minha ronda | Ocorrências | Histórico
```

#### Estado C · ronda em execução
```text
Cabeçalho compacto + estado GPS + acompanhamento visível
[Próximo ponto obrigatório] [2/4]
Mapa real + ponto + geocerca de 25 m + posição + precisão
Painel contextual com timer de 30 s e instrução objetiva
[Concluir ponto] (bloqueado até verificação)
Detalhes: ocorrências, histórico, ajuda, não repetidos em banners
Barra inferior horizontal
```

#### Estado D · desvio
```text
Faixa de atenção sem mascarar localização/mapa
[Desvio identificado: retorno ao ponto obrigatório]
[Escrever justificativa]
Formulário: motivo claro, texto, estado de envio simulado/real
Ao enviar: justificativa recebida ≠ etapa validada
[Retornar ao ponto] + reinício dos 30 s contínuos
```

#### Estado E · conclusão
```text
Todos os pontos concluídos
[Voltar à base] -> confirmação física/autorizada
Resumo da ronda + eventos + marcação de horário
[Finalizar ronda] -> histórico
```

### 4.2 Supervisão mobile: 4 destinos
`Operação`, `Mapa`, `Alertas`, `Registros`. Barra inferior com texto sempre visível, não `slice` do menu desktop.

- **Operação:** resumo real dos dados disponíveis + rondas ativas/pendentes + uma ação prioritária. Sem métricas fictícias exibidas como produção.
- **Mapa:** cartografia quase em tela cheia, alternância de camadas e pontos, com painel inferior recolhível para detalhes do colaborador e geocerca.
- **Alertas:** fila ordenada por necessidade de avaliação, status e justificativa, com contexto; ação de marcar recebido/avaliado somente quando suportada.
- **Registros:** filtros, histórico, relatório e exportação, com tabelas adaptadas a lista/linhas responsivas.

Perfil/logout e ajuda em menu dedicado acessível em toda a aplicação. **Tablet:** adaptar para duas colunas mapa+fila; **desktop:** sidebar lateral + grade de mapa, alertas, métricas e histórico.

### 4.3 Modelo visual de baixo nível (antes do redesenho)
- Cor estrutural profunda `#091E34/#10283F`; ação azul forte `#0755B5`; destaque `#147CE5`; ciano `#54C8F5` sobre áreas escuras, branco/gelo apenas para superfícies de leitura. Todos os pares precisam de verificação formal de contraste.
- Hierarquia: título da ação 20–24 px; texto operacional 14–16 px; labels essenciais >=12–13 px com contraste; botões de 44–48 px; nav fixo compacto, respeitando `env(safe-area-inset-bottom)`.
- Cores sem gamificação: verde status concluído, âmbar atenção, vermelho desvio, acompanhados por ícone/texto; nenhuma contagem competitiva.
- Evitar efeitos brilhantes ou grandes áreas azul bebê; iconografia sem ruído e raios de borda consistentes.

## 5. Estratégia de correção, ordem estrita
1. **Fundação e navegação:** normalizar estrutura responsiva; primeiro resolver nav de 178 px, acesso ao perfil/logout, alvo de toque e respiro de layout.
2. **Primeiro uso:** consentimento legível com CTA visível e opção de explorar sem GPS.
3. **Ronda mobile:** remover camadas redundantes, colocar CTA de início próximo do topo, destacar mapa/timer/próximo ponto, corrigir foco/scroll após ações.
4. **Supervisão mobile:** arquitetura dos quatro destinos, mapa e alertas sem depender de desktop.
5. **Sistema visual (Etapa 03):** tokens verificáveis e paleta adulta Horizon, em vez de ajustes cromáticos dispersos; compatibilidade do Android WebView.
6. **Desktop e revisão:** sidebar/grades, componentes densos, indicadores; testes de contraste e responsividade.

A ordem de execução no roadmap original coloca sistema de design como Etapa 03 antes do redesenho mobile. Os itens 1–4 acima são a **ordem de risco de UX** a aplicar ao implementar essa etapa, não autorização para pular o sistema de design.

## 6. Critérios objetivos de pronto das próximas etapas
- Nenhum menu inferior vertical: **3 destinos ronda ou 4 supervisão** distribuídos horizontalmente; altura planejada ~60–72 CSS px + margem segura. Sem cobertura do CTA.
- Ronda aguardando início: botão `Iniciar ronda` visível em uma tela compacta 360×740, sem rolar por cinco cartões.
- Aviso de localização: aceite e alternativa sem GPS alcançáveis sem percorrer 1000+ px; conteúdo legal completo disponível sob interação.
- Perfil/logout visíveis no celular e acessíveis em no máximo duas interações.
- Texto operacional principal 14–16 px; contraste WCAG 2.2 AA (4,5:1 texto comum, 3:1 UI não textual relevante), foco visível e sem depender só de cor.
- Alvos críticos >=44 px CSS em botões e touch surfaces, preferir ~48 dp em Android.
- Fluxos corretos e testados: começar → mover → entrar no raio → esperar 30 s → confirmar → tentar desvio → justificar → voltar → finalizar → avaliar supervisão.
- Testar larguras **320, 360, 375, 390, 412, 430**, alturas variáveis, tablet **768/1024**, desktop **1440**; não otimizar exclusivamente para altura 880.
- Sem promessa de rastreamento web após fechar; Android nativo exige piloto de aparelhos.
- Regressão automatizada + screenshots em estados reais; não aprovar só por screenshot bonito.

## 7. Estado e delimitação
Esta etapa produziu pesquisa aplicada à interface existente, mensuração real do navegador, priorização e wireflows por perfil. As **falhas de logout e navegação confirmam que o design atual ainda não está aprovado para uso móvel**. A implementação de tema escuro/azul forte, redesenho do modal e correção da nav serão tarefas posteriores, com testes independentes.

**Próximo trabalho:** Etapa 03: definir/validar design tokens com contraste e componentes responsivos, seguida da Etapa 04: corrigir mobile em código. Não descrever este documento como entrega do redesign.
