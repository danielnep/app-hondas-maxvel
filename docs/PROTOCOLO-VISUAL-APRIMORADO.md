# PROTOCOLO VISUAL APRIMORADO · HONDAS MAXVEL
**Padrão Horizon | Versão 2.1 | 11/10/2026**

## 1. Missão
Aplicar ao **aplicativo existente** uma experiência corporativa de alto nível, clara e memorável, com a marca Hondas Maxvel e assinatura Horizon. A demo **é o próprio aplicativo**: o usuário interage com a ronda, o mapa, os alertas, a supervisão, a gestão e a administração, sem página vertical gigante e sem telas cenográficas paralelas.

Reaproveitar o **método de análise, rigor de dados, minimalismo executivo, interações e didática** adotado em projetos anteriores da Horizon, mas respeitar a identidade e a finalidade operacional **específicas** da Maxvel. Não copiar a aparência particular de outro cliente.

**Regras não negociáveis**
1. Mobile-first: ronda no celular, gestão/supervisão adaptadas ao celular e desktop; priorizar a próxima ação, localização e estado operacional.
2. Identidade Horizon: branco/azul tecnológico, prata-azulado, navy estrutural para autoridade, ciano pontual; marca **Maxvel protagonista** e **Horizon como assinatura** legível. Não usar preto/dourado, pastel infantil ou efeitos espalhafatosos.
3. Lockup **real do repositório** `assets/horizon-maxvel-lockup.svg`, com variantes responsivas e testes; não usar imagem de banco ou marca inventada como substituto de logo.
4. Nada de gamificação, pontuação competitiva ou status fictício tratado como dado real.
5. Regras operacionais preservadas: geocerca ~25 m, permanência contínua de 30 s, sequência de pontos, desvio exige justificativa, bloqueio até retorno, base e ocorrências.
6. Localização monitorada apenas quando autorizada; permissão e finalidade explícitas. Web fechada não mantém rastreio; Android nativo requer piloto. Simulação local não equivale a envio de alerta remoto.
7. Uma tarefa por vez: **investigar → planejar → implementar → medir → validar → documentar → fechar**. A próxima só começa quando a anterior cumprir os critérios e evidências no GitHub.

## 2. Direção visual desejada
**Horizon Operacional Premium:** superfícies azul-marinho estruturais; painéis de leitura gelo/branco; azul elétrico para ação; ciano reservado ao mapa e aos estados de localização. Bordas discretas, tipografia legível, sombras cuidadosas, movimentos funcionais e espaçamento disciplinado.

**Papel da identidade:** Maxvel é o produto. Horizon aparece em lockup de cabeçalho, entrada e assinatura técnica institucional, com proporção correta em telas compactas. O ícone isolado é apropriado para favicon e launcher; o lockup horizontal é apropriado para interfaces largas, com variante compacta estreita. Criar versão claro/escuro/monocromática se necessário, sem tratar o lockup gerado anteriormente como logo corporativo oficialmente aprovado sem validação do cliente.

**Camadas de conteúdo**
- Nível 1: situação atual + próxima ação disponível; botão principal acessível.
- Nível 2: mapa/geocerca/tempo/percurso; visíveis ou acessíveis com um gesto.
- Nível 3: instruções detalhadas, checklist, registros e histórico em expansão contextual.
- Nível 4: explicação técnica/comercial no guia, não ocupando a tela operacional.

## 3. Matriz de UX (produto, não catálogo)
| Persona | Visão principal | Ação principal | Segunda informação |
|---|---|---|---|
| Ronda | Mapa + estado atual + ponto da sequência | Iniciar, deslocar, permanecer, concluir, justificar | Histórico, ajuda, ocorrência |
| Supervisão | Mapa/alertas + ronda ativa | Abrir evento e justificativa | Linha do tempo, pontos |
| Gestão | Indicadores com período e fonte explícita | Examinar exceção/resultado | Relatórios, filtros |
| Administração | Acesso, configuração e trilha | Gerenciar parâmetros com confirmação | Auditoria e ajuda |

A navegação deve sinalizar o papel atual sem confundir a demonstração de perfis com login/controle de acesso de produção.

## 4. Animação e interação
Animações não são decoração: só usar quando ajudam a compreender transições de estado, chegada a um ponto, trajetória, abertura de detalhes, mudança de perfil e alertas. Priorizar transform/opacity para suavidade; evitar travamentos do mapa, mudanças bruscas de scroll e botões que pulam de lugar. Preferência `prefers-reduced-motion` reduz ou remove transições. Gestos (arrastar, deslizar) somente quando intuitivos e acompanhados de alternativa por botão, sem esconder ações importantes.

## 5. Critérios de qualidade mensuráveis
- **Tela:** inspecionar 320×600, 360×700, 375×667, 390×780, 412×915, 430×900, 768×1024, 1024×768, 1440×900 e 1920×1080. Checar largura real via `innerWidth` e `documentElement.scrollWidth`, não só via screenshot. Proibir expansão global e barra inferior empilhada.
- **Viewport:** a demo roda no app real e em viewport funcional; scroll **interno contextual** é permitido para detalhes e histórico, não uma página infinita.
- **Visibilidade:** mapa, estado e ação primária acessíveis sem procurar abaixo de inúmeros cartões, especialmente em 320×600.
- **Toque:** controles críticos com alvo de 44–48 CSS px e espaçamento; navegação mobile com ícones e nomes visíveis.
- **Contraste:** WCAG 2.2 AA, 4,5:1 para texto comum, 3:1 para interfaces significativas; verificar cada par relevante com background efetivo, inclusive estados foco/desabilitado/hover. Valores medidos e teste axe-core, sem declarar conformidade global somente por teste automático.
- **Tipografia:** conteúdo principal 14–16 px, headings hierárquicos; microtipografia apenas para metadados não operacionais e sem comprometer leitura.
- **Interação:** testar ação real, mapa, deslocamento animado, 30 segundos, desvio, justificativa, retorno, alertas e troca entre os quatro perfis, persistindo o mesmo cenário.
- **Diferenciação de dados:** mostrar explícita e discretamente quando é simulação, quando o mapa é real e a linha de percurso é ilustrativa, quando o GPS não é confiável e quando não há backend.
- **Marca:** conferir legibilidade do lockup e da assinatura Horizon em fundo claro/escuro, 320–430 px, menu e login; nunca interceptar cliques da entrada.
- **QA:** lint/sintaxe/testes de domínio, Playwright nos fluxos, capturas comparáveis antes/depois, axe-core e auditoria manual mobile/desktop. APK compilado não substitui teste físico/TalkBack.

## 6. Anomalia constatada em auditoria GitHub mais recente
A execução **[Auditoria UI UX mobile #38184896604](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38184896604)** está **reprovada**:
- em 430 px físicos, o navegador relatou `innerWidth` de cerca de 527–532 px em estados iniciais, sinalizando expansão de layout/viewport;
- o novo `.brand.horizon-maxvel-brand` interceptou o clique em `[data-action="login"]`;
- o script antigo procura `.presentation-title h1`, removido ao fazer a simulação no próprio app. O teste deve ser atualizado para inspecionar o cabeçalho real e troca de papéis, sem remover verificações úteis;
- essa regressão é prioridade **P0**, mesmo que outras suites (como testes de domínio e eixo de acessibilidade) tenham passado.

**Importante:** sucesso de GitHub Pages ou build Android não significa que a experiência mobile foi aprovada. Não fechar o item P0 por alterar só o teste, nem por só corrigir o CSS.

## 7. Tarefas sequenciais e portas de aprovação
| Ordem | Tarefa | Evidência exigida para avançar |
|---|---|---|
| **V01 · P0** | Corrigir regressão do lockup/header em 430 px e auditoria obsoleta | Entrada clicável, viewport correto, suíte responsiva sem erros em todas as larguras |
| **V02** | Sistema de identidade Horizon + Maxvel e variantes de logo | Lockup claro/escuro/compacto revisado; visível sem recortes e sem interceptar CTA |
| **V03** | Consolidar tokens e componentes premium | Paleta, tipografia, escala, cartões, botões, ícones e contraste auditados |
| **V04** | Polir ergonomia da ronda mobile compacta | Mapa + próximo passo + ação principal em 320×600; modais seguros, sem página infinita |
| **V05** | Fluidez, animações, feedback e gestos adequados | Transições úteis, movimento reduzido, retorno de interação e FPS/reflow razoáveis |
| **V06** | Sequência de ronda e ajuda contextual | Fluxo real da simulação testado: início, 25 m, 30 s, desvio, justificativa e retorno |
| **V07** | Supervisão, Gestão, Administração e desktop | Quatro perfis, alertas sincronizados localmente, métricas reais do cenário, layout adaptativo |
| **V08** | Auditoria final, evidências visuais e documentação | Playwright, contraste/axe, capturas antes/depois, Android debug e limitações operacionais explícitas |

**Porta comum de aprovação:** cada issue deve conter (a) o problema, (b) arquivos e alterações concretas, (c) casos de teste e capturas, (d) resultados das ferramentas, (e) limitações e (f) link ao commit. Somente então marcar concluída e começar a próxima.

## 8. Fontes de referência do próprio projeto
- `docs/PESQUISA-UX-MOBILE-2026.md`
- `docs/AUDITORIA-UX-MOBILE-ETAPA-02.md`
- `docs/DESIGN-SYSTEM-HORIZON-OPERACIONAL.md`
- `docs/SIMULACAO-APP-ETAPA-08.md`
- `assets/horizon-maxvel-lockup.svg`
- `tests/mobile-experience.test.mjs`, `scripts/app-immersive-test.mjs`, `scripts/ux-mobile-audit.mjs`

**Status:** protocolo formalizado; itens do roadmap não são considerados implementados ou aprovados por este documento. O primeiro deve resolver a regressão P0 presente.
