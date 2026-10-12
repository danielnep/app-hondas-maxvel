# Revisão R1–R2 · mapa do vigia e trajeto de demonstração
**12/10/2026 · Horizon / Hondas Maxvel · implementação em branch, ainda pendente de QA**

## Escopo executado
- A tela do vigia passa a usar o mapa como superfície de fundo que ocupa todo o workspace, nos layouts móvel e desktop. O controle contextual fica em painel sobreposto e recolhível por comando acessível. Os fluxos de agenda, ocorrências, desvio, justificativa, retorno e ajuda continuam no painel.
- A rota fictícia ganhou cinco pernas entre base, quatro pontos e retorno, com múltiplos vértices em cada perna. O mesmo traçado alimenta Leaflet/OpenStreetMap, mapa alternativo SVG e distância ao corredor de rota.
- O deslocamento demonstrativo percorre cada perna com interpolação baseada na distância acumulada. Saída intencional da rota continua podendo provocar alerta; viagem de retorno após um desvio usa geometria direta até o ponto, com justificativa exigida.
- A rota de teste GPS deslocada para perto do aparelho preserva os vértices adicionais; geocercas e duração de permanência não mudaram.

## Contrato operacional preservado
Quatro pontos obrigatórios, raio 25 m, permanência contínua 30 segundos, corredor de tolerância 30 m, retorno obrigatório, validação de precisão, bloqueio por desvio, justificativa e histórico, 12 vigias fictícios, agenda de 48 exemplos, quatro perfis e simulação local.

## Transparência comercial
O mapa usa cartografia OpenStreetMap (e alternativa CARTO) com Leaflet. Os vértices adicionais são **desenho ilustrativo fictício**, não navegação gerada por ruas, nem roteiro operacional validado. Serviço comunitário de tiles não constitui licença/SLA ilimitada para produção.

## O que continua pendente, sem falsificar entrega
1. Verificação por câmera (frente, trás, esquerda, direita), selfie, orientação/giroscópio e declaração individual por ponto, conforme PDF de proposta posterior.
2. Servidor, login real, permissões multiempresa, entrega remota de alertas, armazenamento seguro e sincronização offline/online.
3. Testes funcionais automatizados desta revisão, auditoria visual em aparelhos pequenos e grandes, testes físicos de sensores/GPS/Android.

## Critérios da revisão
- O mapa deve estar visível no primeiro viewport da ronda, preenchendo o espaço de operação.
- Botão de recolher/mostrar comandos não remove acesso às ações.
- O mesmo percurso deve aparecer no mapa online e offline, na simulação e no cálculo de corredor.
- Nenhum falso desvio é disparado apenas por seguir uma curva da rota.
- Testes Node, inspeção de navegador, acessibilidade e Android devem ser verificados na PR antes de merge.
