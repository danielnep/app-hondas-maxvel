# Decisões de UI/UX · Horizon × Maxvel

## Hierarquia

O aplicativo mostra primeiro **onde o usuário está**, **qual é a próxima ação** e **o que falta para concluir**. Regras extras ficam disponíveis por meio do guia. Componentes repetem cores e padrões, evitando depender da memória.

## Didatismo sem poluição

- No primeiro acesso: guia orientado por capítulos com autonomia de leitura.
- Antes da ronda: declaração de regras, explicitando sequência, raio, tempo, desvios e privacidade.
- Durante a execução: orientação contextual com próximo passo, cronômetro e raio.
- Nos eventos: instrução específica, motivo do bloqueio e caminho de recuperação.
- Na supervisão: contexto completo em cada notificação, rotulado como simulação.

## Mapa realista responsável

- Mapa-base real via OpenStreetMap e Leaflet; contém ruas, quarteirões e marcos quando disponíveis.
- Sobreposição operacional: pontos sequenciados, base, halos de 25 m, linha esquemática, posição do ronda e precisão.
- A rota e os locais da demonstração são FICTÍCIOS. O mapa real não implica patrulha real, nem rota legal/segura entre pontos.
- A linha reta entre coordenadas é apenas um elo gráfico. Para produção, implantar roteamento e rotas aprovadas com dados da instalação.
- Acesso offline: mapa alternativo explicitamente esquemático, sem substituir cartografia real.
- Cartografia OpenStreetMap tem atribuição visível e requer conexão. Tiles comunitários sem SLA: produção deve usar provedor dimensionado e licença compatível.

## Cores e tipografia

- Brancos e azul-claro na estrutura, azul celeste em ações primárias e progresso, azul-grafite em textos operacionais.
- Verde: etapas finalizadas; laranja: atenção; vermelho: desvios com bloqueio. Sempre explicar estados em texto.
- Fontes sistema com opção de DM Sans/Manrope online; fallback sem dependência de conexão.
- Priorizar áreas de toque a partir de aproximadamente 44 px e foco visível.

## Acompanhamento para venda ética

- Apresentar, na mesma tela, ronda e supervisão; mostrar cenários observáveis.
- Benefícios propostos: redução de conferência manual, rastreabilidade contextual, resposta a exceções.
- Evitar afirmar resultados sem piloto e não prometer impedir deslocamento físico do colaborador.
- Nunca atribuir culpa automaticamente por falhas/derivas de GPS.

## Avaliação futura

Testar presencialmente com vigilantes e supervisores: compreensão do próximo passo, visibilidade do cronômetro, resolução do desvio, tempos de tarefa, enganos e legibilidade em campo. Nenhuma entrevista empírica foi conduzida nesta reconstrução.

Referências: https://www.nngroup.com/articles/progressive-disclosure/ ; https://www.w3.org/WAI/WCAG22/ ; https://leafletjs.com/reference.html ; https://operations.osmfoundation.org/policies/tiles/

## Aviso de localização ao primeiro acesso

O aviso aparece antes da primeira interação, sem falar apenas em “permissão”. Traz a razão do acompanhamento, funcionamento em segundo plano na versão nativa, controle do usuário, privacidade e uma distinção explícita entre ciência e concessão de acesso ao GPS pelo sistema operacional. O botão **“Li e aceito · Continuar”** só habilita quando o leitor marca sua ciência; quem preferir pode explorar **apenas a simulação sem GPS**. Evitar dar a entender que o usuário perdeu controle sobre o aparelho ou que existe rastreamento eterno, inclusive após parada forçada.