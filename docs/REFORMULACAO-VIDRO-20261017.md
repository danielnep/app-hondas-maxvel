# Ronda Pro · Reformulação do tema e da navegação

## Escopo e referência

Esta branch adapta ao sistema existente o tema validado pelo proprietário na prévia HTML: mapa claro em tela inteira para campo, painéis de vidro escuro fosco, vermelho com neon discreto e azul funcional. COI e Administração recebem uma composição de desktop contínua, com linhas, listas e indicadores integrados, sem cards como decoração.

Base: `e16eb43`, branch `chore/css-hygiene-20261017`, que deriva da principal `0cbb205`. A higienização estava publicada em branch e ainda não integrada à principal. Esta entrega conserva essa dependência. Nenhuma alteração foi aplicada em main nem em produção.

Referência de composição: `docs/references/Ronda_Pro_Referencia_Aprovada.html`. Os desenhos simplificados da prévia não substituem os componentes e os dados reais do sistema.

## Implementação

- `assets/theme.css`: fonte canônica do tema compartilhado, com camada de precedência explícita `rp-layout` sobre `rp-structure`. As cinco fontes estruturais anteriores são preservadas dentro de sua camada. Não há gerador que apague o tema e não foram concatenadas novas correções históricas ao consolidado.
- `src/theme-shell.js`: reutiliza os controles e a delegação de eventos existentes. Agrupa controles de campo, cria pegas internas e recolhe painéis; não chama nem simula endpoints de negócio.
- Campo: mapa sem filtro escuro, painel flutuante, atalhos integrados, menu e eventos laterais, chat com altura inteira e 5% de margem lateral. Pegas começam para dentro da borda; fechar chat por gesto vertical exige a pega superior/inferior, mantendo a rolagem do histórico.
- Históricos e páginas secundárias de campo são sobrepostos ao mapa. Informações anteriores da página inicial permanecem em disclosure, sem bloquear os comandos do mapa.
- Mensagens: lista antes da conversa; a composição só existe com uma conversa ativa. No ambiente autenticado, contatos e envio continuam sujeitos às permissões e à persistência originais. A demonstração oferece COI e o outro perfil e mantém histórico separado por destinatário, sem alegar comunicação remota.
- Cor: vermelho `#ff1722`, com componente azul reduzida para evitar aparência de cereja. O ganho de 15% foi aplicado à intensidade do halo: alfa 0,46 → 0,529 e 0,20 → 0,23; não é uma promessa de aumento perceptual exato de brilho em qualquer tela.
- Cache v50 inclui o tema e seu módulo. O empacotamento Android já copia `assets/**` e `src/**`, sem exigir duplicação manual.

## Preservação funcional

O backend, as tabelas, os contratos de autorização, os dados de produção e a implementação nativa não foram alterados. As regras de GPS, sequência, permanência, fotos e tratativas permanecem nas funções existentes.

Foi reproduzida uma intermitência já registrada na base: uma atualização entre sessões podia substituir o formulário durante a digitação da resposta do COI. A interface agora preserva o rascunho por ocorrência e evita reconstrução durante o foco no campo; elimina o rascunho após envio confirmado e na saída da conta. O teste entre sessões passou após o reparo.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Principal antes das alterações | 207/221, 14 falhas preexistentes de contratos CSS/cache |
| Base higienizada antes do tema | 224/224 |
| `npm run check` | passou |
| `npm run check:styles` | passou; seis folhas canônicas válidas, referências/cache consistentes |
| `npm test` na reformulação | 224/224 |
| `scripts/glass-ui-review.mjs` | 26 capturas/cenários; sem erro JavaScript ou overflow horizontal |
| COI/Admin autenticados, 390 e 1366 px | tratativa, exclusão de pendências concluídas, reserva entre sessões, preservação de rascunho, recarga e acesso administrativo subsidiário passaram |
| Vigia autenticado | mapa, cinco comandos, início persistido, chegada e temporizador com GPS sintético passaram |
| Vistoriador, um e três destinos | numeração e percurso B → N passaram |
| Chat autenticado de campo | criação de conversa, texto, anexo TXT e recebimento pelo COI passaram |
| Gestos em Chromium | abrir laterais pelas pegas internas; recolher chat para cima; lista sem compositor passaram |
| Histórico de campo | mapa continua montado atrás da sobreposição |

Capturas em `artifacts/glass-ui/`; relatório da revisão em `review.json`. Contas, mídias e banco exclusivamente temporários e fictícios. O script de revisão também está no workflow de qualidade da PR.

## Limites e revisão

As capturas usam o mapa alternativo offline porque as requisições externas foram bloqueadas no ensaio; a cartografia online foi preservada e teve seu filtro escuro removido pelo tema. Os testes de GPS usam coordenadas sintéticas. Não foi feita homologação de gesto de sistema, câmera, flash ou GPS em segundo plano em aparelho Android físico, nem compilação de APK nesta tarefa. Chamadas de áudio/vídeo e entrega de e-mail não foram homologadas nesta reformulação.

A revisão visual do proprietário e a autorização de integração continuam pendentes. Nenhum conjunto finito de testes prova funcionamento de 100% dos estados possíveis; as coberturas verificadas estão listadas acima.

## Correção da revisão visual · 18/10

Corrigidos o botão de iniciar conversa esticado na vertical, a duplicação do fundo do chat que removia a transparência, o compositor autenticado com seletor de arquivo nativo exposto e o painel de notificações preso ao contexto de empilhamento do cabeçalho. O painel usa a camada superior nativa do navegador, mantendo os controles e eventos existentes; agora cobre a lanterna e conserva o desfoque. Ferramentas de composição usam SVG com rótulos acessíveis.

A revisão automatizada agora exige botão horizontal de até 60 px de altura, painel alinhado à borda direita, desfoque presente, lanterna coberta, seletor de arquivo integrado e compositor com menos de 200 px. Os 26 cenários passaram, assim como os 224 testes, sintaxe e validação das seis folhas CSS. Publicação remota permanece bloqueada pela revisão automática de aprovação; branch ainda local, sem merge ou deploy.
