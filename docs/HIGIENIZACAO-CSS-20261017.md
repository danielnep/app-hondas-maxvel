# Higienização CSS — Ronda Pro — 17/10/2026

## Escopo e referência

Limpeza técnica anterior à reformulação visual do vigia e do vistoriador. Referência: commit `0cbb205` da `main`. As decisões desta tarefa se baseiam nos arquivos atuais e no pedido do proprietário; os manuais antigos não foram usados como norma visual.

## Resultado

- 40 arquivos CSS → 5 fontes canônicas, sem gerador intermediário.
- 1,397,558 → 683,522 bytes de CSS no repositório (redução de 51.1%). Isto mede arquivos do repositório; não significa a mesma redução no download de cada tela.
- 267 declarações redundantes removidas; 41 blocos ficaram vazios e foram retirados.
- Central: 17 links CSS locais → 3; aplicativo: 4 links locais explícitos, sem import local escondido.
- Cache offline v49 aponta somente para as cinco fontes existentes. Recarga continua protegendo ronda ativa.

| Fonte canônica | Responsabilidade | Acessos |
|---|---|---|
| `assets/ronda-pro.css` | Estrutura da demonstração, entrada, mapa, cortina do ponto e controles da ronda | App |
| `assets/central.css` | Estrutura autenticada, centro operacional, agenda e acabamento próprio | Central |
| `assets/operational.css` | Componentes operacionais compartilhados, eventos, histórico e comunicação | Ambos |
| `assets/mobile-critical.css` | Correções específicas dos fluxos móveis da demonstração | App |
| `assets/field.css` | Vigia, vistoriador, formulários de campo e ajustes atuais de supervisão | Ambos |

Ordem no aplicativo: `ronda-pro` → `operational` → `mobile-critical` → `field`. Na central: `central` → `operational` → `field`. A sequência relativa das regras foi preservada. O pequeno bloco `evidence-direct` continua nos dois shells para preservar sua posição anterior em cada acesso.

## Defeitos comprovados

1. **Chave de fechamento ausente no botão enviar.** A regra `.dashboard .field-chat-compose .button.primary` em `maxvel-field-refinement-20261016.css` não fechava antes do `:hover`. No consolidado, os blocos posteriores entravam no bloco incorreto. Parser PostCSS reproduziu `Unclosed block` tanto na fonte antiga quanto no consolidado. Fechamento corrigido em `field.css`; teste exige que o hover e os demais componentes sejam regras independentes.
2. **Gerador destrutivo para a versão atual.** `scripts/build-styles.py` só reconstruía a base histórica e omitia as 17 seções incorporadas posteriormente ao consolidado. Rodá-lo substituiria o arquivo atual por uma versão incompleta. O gerador foi retirado; as cinco fontes são editadas diretamente.
3. **Duas organizações divergentes.** A demonstração carregava um consolidado, a central carregava módulos antigos separadamente, e o service worker ainda precacheava originais. Agora ambos usam as mesmas camadas compartilhadas e o cache usa o inventário atual.
4. **Duplicação comprovada de declarações.** Remoção limitada ao mesmo seletor, propriedade, contexto e precedência, com valores idênticos ou literais suportados. Não foi usado apagamento por busca de texto ou por cobertura de uma única tela.
5. **Testes presos a snapshots obsoletos.** A base já tinha 14 falhas em 221 testes, sobretudo referências a folhas que tinham saído do HTML ou versões antigas. As verificações agora leem seções vivas das fontes canônicas e os caminhos reais das páginas.

## Inventário de arquivos retirados

Os blocos ativos foram incorporados às cinco fontes; excluir seu antigo arquivo não significa excluir a funcionalidade. Os arquivos históricos usados pelo gerador antigo e as folhas isoladas também foram retirados. O Git mantém os originais no commit de referência.

- `assets/central-glass-20261014.css`
- `assets/checkpoint-curtain.css`
- `assets/coi-operations-v3.css`
- `assets/conclusion-history.css`
- `assets/demo-roles.css`
- `assets/events-chat-history.css`
- `assets/evidence-direct.css`
- `assets/field-compact.css`
- `assets/field-entry-v2.css`
- `assets/field-unified-20261016.css`
- `assets/horizon-graphite.css`
- `assets/horizon-operacional.css`
- `assets/inspector-cockpit-20261016.css`
- `assets/inspector-patrol-parity-20261016.css`
- `assets/maxvel-04.css`
- `assets/maxvel-05.css`
- `assets/maxvel-06.css`
- `assets/maxvel-atelier-20261016.css`
- `assets/maxvel-field-refinement-20261016.css`
- `assets/maxvel-mobile-02.css`
- `assets/maxvel-obsidian-06.css`
- `assets/maxvel-premium-system-20261014.css`
- `assets/maxvel-print-qa-20261016.css`
- `assets/maxvel-refinement-07.css`
- `assets/maxvel-rev3.css`
- `assets/maxvel-visual-2026.css`
- `assets/mobile-critical-20261016.css`
- `assets/ops-center.css`
- `assets/ronda-pro-06a.css`
- `assets/ronda-pro-layout.css`
- `assets/ronda-pro-motion.css`
- `assets/ronda-pro-theme.css`
- `assets/ronda-pro-upgrade.css`
- `assets/rondas-pro-flow-20261014.css`
- `assets/route-board.css`
- `assets/soft-polish.css`
- `assets/uiux-refinement.css`
- `styles.css`

## Validação

- `npm run check`: sintaxe dos módulos JavaScript aprovada.
- `npm run check:styles`: parser das cinco fontes, ordem dos links, cache e prevenção de novas redundâncias.
- `npm test`: 224 testes aprovados, incluindo três regressões novas de CSS.
- Chromium: alerta rápido, ocorrência, histórico e chat em 320, 390, 768 e 1366 px.
- Vistoriador: mapa com um e três destinos, numeração e geometria do percurso aprovadas.
- Central autenticada: contas e SQLite temporários, COI, administração e vigia; tratativas, sincronização, categorias, persistência do rascunho, recarga e ausência de overflow em 390 e 1366 px. Houve uma falha inicial de preservação do rascunho; a execução original passou e a repetição com a limpeza também passou. Intermitência registrada, sem atribuição causal ao CSS e sem alteração de JavaScript funcional nesta tarefa.
- Comparação das propriedades computadas: cinco cenários por largura — vigia, vistoriador, COI, administração e login da central — em 320, 390, 768 e 1366 px. Para isolar a higienização, a referência recebe apenas o fechamento de chave conhecido. A comparação não pretende preservar o efeito do erro sintático.

Evidências: `artifacts/css-hygiene/`. A comparação pode ser repetida com um checkout separado do commit base:

```sh
CSS_BASELINE_DIR=/caminho/checkout-base CHROME_BIN=/caminho/chromium node scripts/css-regression.mjs
```

O script usa `playwright-core`, como os demais smoke tests do projeto. Os testes de tela usam dados fictícios e bloqueiam serviços externos na comparação CSS. Não equivalem a teste de APK em aparelho, câmera física ou GPS em campo.

## Sobreposições e próxima reformulação

Ainda existem 314 ocorrências de valores diferentes para a mesma propriedade/seletor/contexto nas camadas preservadas, além de seletores sobrepostos com especificidades diferentes. O inventário de exemplos está em `cleanup-metrics.json`. Nem toda sobreposição é um defeito; as que não tinham prova de redundância foram preservadas para evitar apagar fallbacks e estados operacionais. Por isso, esta limpeza não é uma afirmação de que toda combinação possível de regras e telas foi reescrita ou validada.

A reformulação visual deve substituir os blocos responsáveis dentro destas fontes, em vez de adicionar outra folha de correção ou remontar o consolidado histórico. Cores, hierarquia, tamanhos e composição ainda serão redesenhados conforme aprovação do proprietário.
