# Hondas Maxvel · Produto e experiência 2.0
Data: 11/10/2026 · Identidade de produto Horizon

## Objetivo real
Representar, numa interface de produto **utilizável**, uma operação de rondas patrimoniais. O site, a interface do ronda e a supervisão devem ser reconhecíveis como partes do mesmo aplicativo. A apresentação comercial reproduz os fluxos do sistema; ela não é apenas uma galeria de imagens.

## Processo profissional aplicado
1. **Descoberta e delimitação:** validar objetivo, papel da pessoa no campo, papel de supervisão, regras de ponto, rastreabilidade, exceções e dados que ficam registrados.
2. **Fluxos:** início e regras → deslocamento → raio de 25 m → permanência contínua de 30 s → registro → próximo ponto → retorno à base. Desvio → bloqueio → justificativa → supervisão → retorno ao ponto → reinício da permanência. Ocorrências com contexto.
3. **Regras e modelo:** domínio isolado em `src/domain.js`; estados visíveis e transições testáveis. Interfaces não devem liberar etapa só pela aparência de progresso.
4. **Sistema visual:** ícone próprio em `assets/maxvel-icon.svg`; branco, céu tecnológico e azul-prateado Horizon; grafite apenas na lateral operacional. Tipografia clara, grupos visuais, áreas de toque e estados por texto + símbolo + cor.
5. **Aplicação real:** entrada de produto; área do ronda; central de gestão e supervisão; mapas; histórico; alertas; justificativa; apresentação integrada usando os mesmos componentes operacionais.
6. **Mapa:** OpenStreetMap com atribuição; estilo claro CARTO opcional; marcadores de base/pontos, círculos reais de 25 m sobre coordenadas, posição dinâmica, trajeto observado desenhado e local de desvio indicado. Quando falhar, declarar mapa **esquemático**. As linhas entre os locais são representações ilustrativas e não navegação validada em ruas.
7. **Educação sem poluição:** aviso inicial sobre localização, ajuda contextual que acompanha o estado, explicação na decisão, indicação do próximo passo e recuperação de erro. A interface não depende do usuário decorar regras.
8. **Validação:** verificações de sintaxe, domínio, simulador, ciência inicial e contratos de apresentação UI; CI no GitHub. Exigir revisão visual em aparelhos reais e navegação por teclado antes de entrega comercial definitiva.
9. **Evolução e implantação:** segurança de sessão, backend, autenticação, notificações externas, sincronização, privacidade, trilha auditável e piloto em aparelhos autorizados.

## Estratégia de navegação
- **Entrada:** posicionamento do produto e prévia de mapa real, sem blocos promocionais vazios; entrada direta no sistema e apresentação integrada.
- **Ronda / celular:** estado da operação, ponto atual, progresso, mapa ampliado, disponibilidade da próxima ação, alerta e registro. Não utilizar rankings, pontos de jogo ou gamificação.
- **Supervisão / computador:** KPIs calculados dos dados locais, mapa, fila de notificações, tabela de rondas e linha do tempo. No primeiro acesso sem registros, oferecer cenário explícito para que o comprador possa experimentar.
- **Apresentação integrada:** celular e supervisão exibem o mesmo evento; comandos de simulação deslocam o marcador e atualizam os dois lados.

## Aceite de localização e limites
No primeiro acesso, exibir finalidades e regras de acompanhamento e exigir ciência explícita para continuar. A permissão do GPS é outra ação do sistema operacional. O projeto Android prevê serviço com notificação visível enquanto uma ronda autorizada estiver ativa. Não prometer rastreamento contínuo depois de uma parada forçada, nem rastreamento web após fechar o navegador.

## Critérios de aceite da interface
- O usuário identifica próximo ponto e ação em menos de um olhar sem depender de legenda escondida.
- Estados de GPS impreciso, em deslocamento, no raio, aguardando 30 s, desvio, justificativa, retorno e conclusão têm significado textual.
- Quatro pontos só podem ser validados em ordem. O desvio não libera etapa apenas por justificativa.
- Ao acionar o cenário, o mapa, a tela móvel e a supervisão reagem ao mesmo estado.
- Mapas distinguem visualmente os dados de exemplo e a origem cartográfica real.
- Ícone e identidade aparecem tanto na web quanto no recurso Android, compartilhando o mesmo diretório `assets/`.
- Telas legíveis em 360, 390, 768 e 1440 px, navegação por teclado e redução de movimento respeitadas.
- Interpretação de GPS duvidoso nunca prova automaticamente comportamento irregular.

## Natureza da entrega
**Implementado no código:** redesenho de entrada, central, telemetria visual do ronda, estilo responsivo, iconografia, overlays e camadas do mapa, rastreio visual, opção de cenário integrado; regras operacionais existentes preservadas; projeto Android original atualizado para incluir o novo ícone.

**Ainda por validar em uso:** teste visual manual e assistivo nos aparelhos, build e piloto do Android, continuidade real em segundo plano com diferentes fabricantes, qualidade do GPS, infraestrutura e notificações reais. Não há prova empírica de melhora de conversão.

## Referências de UI/UX e cartografia
- https://www.nngroup.com/articles/visibility-system-status/
- https://www.nngroup.com/articles/progressive-disclosure/
- https://www.nngroup.com/articles/error-message-guidelines/
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://leafletjs.com/reference.html
- https://operations.osmfoundation.org/policies/tiles/
- https://developer.android.com/develop/background-work/services/fgs
