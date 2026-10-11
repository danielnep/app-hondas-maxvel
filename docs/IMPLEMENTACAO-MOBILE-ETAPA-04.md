# Etapa 04 · Implementação mobile-first Horizon Operacional
**Hondas Maxvel · 11/10/2026**

## Objetivo entregue
A partir da [auditoria mensurada de UI/UX](AUDITORIA-UX-MOBILE-ETAPA-02.md) e do [sistema de design contrastado](DESIGN-SYSTEM-ETAPA-03.md), ajustar o aplicativo **real**, não apenas um mockup: navegação, abertura, ação da ronda, hierarquia do mapa, menu de perfil e leitura no celular. Manter identidade visual Horizon, regras operacionais e cartografia.

## Mudanças no código
1. **Sistema visual empresarial:** azul profundo/azul-grafite como estrutura; superfícies de leitura em gelo; CTA azul Horizon com texto contrastante; sinais cianos de localização. Aplicado em `styles/horizon-operacional.css` (componentes/responsividade) e `assets/horizon-operacional.css` (acabamento da paleta e interfaces dark). O CSS antigo continua como camada de compatibilidade; evitar criar uma terceira camada sem consolidação posterior.
2. **Navegação mobile por papel:** barra inferior horizontal de **3 destinos para Ronda** (Minha ronda, Ocorrências, Histórico) e **4 para Supervisão/Gestão** (Operação, Mapa, Alertas, Registros). Rótulos sempre visíveis, altura medida de 67 CSS px e respeito à safe-area.
3. **Perfil e saída:** menu real acessado pelo botão do usuário no header, disponibilizando informações de perfil, ajuda, privacidade e sair. O botão não depende da sidebar do desktop.
4. **Ação principal:** `Iniciar ronda` passou a aparecer **antes do mapa**, com seleção clara entre cenário ilustrativo e teste de GPS. O conteúdo obrigatório (ponto, raio, 30 s, sequência) permanece explicado no local adequado.
5. **Primeira abertura:** aviso compacto de localização com conteúdo progressivo em `<details>`; checkbox e dois botões visíveis (aceitar e explorar sem GPS). A ciência não concede permissão do sistema operacional. A versão nativa Android pode continuar com serviço visível durante a ronda, mas não após parada forçada pelo usuário. O navegador não rastreia após encerramento.
6. **Ronda e supervisor:** dados permanecem sincronizados **dentro do mesmo cenário local**; mapa usa cartografia real OpenStreetMap quando online, áreas de 25 m, quatro pontos e marcador de deslocamento. Os dados de simulação permanecem explicitamente fictícios.
7. **Transições e alertas:** início/desvio deslocam a atenção visual ao topo; mensagens transitórias são posicionadas acima da barra móvel, para não bloquear destinos. Cabeçalho da apresentação integrada agora se comprime em larguras até 420 px sem estender a tela além do viewport.
8. **Android:** Gradle passou a empacotar tanto `styles/**` quanto `assets/**`, preservando arquivos compartilhados na WebView. A aplicação nativa **não foi compilada ou validada em dispositivos reais nesta etapa**.

## Testes automatizados efetuados
- `npm run check` e `npm test` no GitHub Actions.
- `tests/mobile-experience.test.mjs` protege invariantes: navegação por perfil, acesso ao menu, aviso compacto, presença do tema e ordem da ação de início antes do mapa.
- `scripts/ux-mobile-audit.mjs` percorre fluxo real no Chromium nas larguras 320, 360, 390, 430, 768 e 1440 CSS px, registrando telas e métricas de layout.
- Evidência: [Auditoria visual completa com **60 estados** e sem falhas](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38178227637), incluindo consentimento, entrada, início, ronda ativa, desvio, justificativa, supervisão e apresentação integrada.
- Medidas da execução: menu Ronda e Supervisão **67 px** nas telas móveis; botão de início e aceite inicial visíveis sem percorrer longa rolagem; nenhuma expansão de viewport e nenhum overflow horizontal nos estados inspecionados. **O antigo defeito de 320→327 px da apresentação integrada foi eliminado.**
- Estas verificações provam os fluxos exercitados **no Chromium do runner**, não toda a matriz de aparelhos, acessibilidade assistiva ou GPS em segundo plano.

## Limites importantes
- Existe histórico local, mas não sistema de autenticação empresarial nem sincronização entre aparelhos. Alertas mostrados ao supervisor no cenário são simulações locais, não notificações reais.
- Rastreamento de localização precisa de autorização efetiva do sistema, precisão GPS e teste de campo para validade da permanência contínua.
- Mapa OpenStreetMap contém ruas reais, mas a rota e os pontos demonstrativos são fictícios; trajetos desenhados no protótipo **não são rotas homologadas por vias públicas**.
- A apresentação integrada e o painel de supervisão melhoraram, mas podem ser aprofundados em tarefas específicas de cartografia/supervisão.
- O aplicativo Android nativo não foi compilado/instalado neste ambiente; futuro piloto deve medir serviço em segundo plano por fabricante/versão.
- A coexistência de `styles.css`, `styles/horizon-operacional.css` e `assets/horizon-operacional.css` gera dívida de manutenção. Consolidar tokens e camadas após garantir que todos os estados críticos estão visualmente aprovados.

## Próximas etapas, sem pular a sequência
- **Etapa 05:** aprimorar mapa operacional e experiências específicas da supervisão (cartografia, camadas, filtros, alertas e justificativas).
- **Etapa 06:** refinar desktop, painel gerencial e consolidar estilos, mantendo o celular como prioridade.
- **Etapa 07:** auditoria final de acessibilidade com tecnologia assistiva, contrastes reais, foco/teclado, testes de dispositivos, entrega e implantação responsável.

## Critérios operacionais preservados
**25 m de raio, 30 s de permanência contínua, sequência obrigatória, desvio bloqueia progresso, justificativa não dispensa retorno ao ponto, retorno à base e registro contextual.** Ausência/falha de GPS não implica culpa automática.

**Publicação:** `https://danielnep.github.io/app-hondas-maxvel/` com o build do GitHub Pages após conclusão do workflow. Conferir o SHA deployado antes de afirmar atualização de uma revisão posterior.

**Desenvolvido por Horizon | Daniel N. Xavier**
