# Diretrizes Globais da Suíte de Agentes Horizon (AGENTS.md)

## 1. Autonomia Técnica vs. Intenção do Usuário
- **Autonomia não é autorização para presumir**: Resolva todas as questões técnicas sozinho com total autonomia e independência.
- **Pergunte SEMPRE que houver qualquer dúvida sobre a intenção do usuário**: Se a intenção do usuário for ambígua, incompleta ou suscetível a múltiplas interpretações, pergunte.

## 2. Consulta Prévia ao Histórico
- **Consulte o histórico antes de perguntar**: Consulte detalhadamente o histórico completo da conversa e registros prévios antes de fazer qualquer pergunta. Nunca repita dúvidas já sanadas.

## 3. Proibição de Suposições como Requisitos
- **Jamais transforme suposição em requisito**: É expressamente proibido adotar hipóteses ou inferências como regras ou código sem confirmação do usuário.

## 4. Protocolo Obrigatório de Pergunta
Ao levantar qualquer dúvida:
1. Explique a dúvida com clareza;
2. Apresente as opções existentes;
3. Recomende expressamente a melhor opção;
4. Aguarde a resposta do usuário.
- **Formato enxuto (proibido texto de fechamento ao perguntar)**: Quando for apresentar opções ao usuário, seja curto, direto e conversacional. **Nunca** escreva um texto longo ou com formato de relatório de finalização de tarefa ao fazer uma pergunta.

## 5. Execução Paralela Não-Bloqueante
- Enquanto espera pela decisão do usuário, **siga imediatamente com tudo o que não dependa da decisão dele**.

## 6. Portão de Qualidade e Proibição de Auto-Aprovação
- O executor nunca aprova seu próprio trabalho. Homologação requer testes executáveis e aval do `horizon-qa-guardian`.

## 7. Centralidade do Especialista Mobile e Base Persistente
- O `horizon-mobile-ui` é a autoridade técnica responsável pelo comportamento no smartphone, ergonomia de toque, safe areas e aceite de interface.
- Todos os agentes que implementam, revisam ou testam telas devem consultar a base persistente em `/opt/horizon-agent-core/knowledge/mobile-mastery/` e o utilitário `mobile-consult`.
- Homologação obrigatória na matriz visual mandatória de 6 viewports: 320x568 (Compacto), 360x800 (Android popular), 390x844 (iPhone padrão), 430x932 (Smartphones grandes / Galaxy A53 412x915), 768x1024 (Tablet) e 1440x900 (Desktop).

## 8. Ciclo de Aprendizado com Falhas (7 Etapas)
- Todo defeito apontado deve produzir: Reprodução com evidência anterior, Causa raiz confirmada, Correção cirúrgica, Verificação visual posterior, Regra preventiva, Teste de regressão proporcional e Registro consolidado em `evolution.jsonl`.

## 9. Entrega Obrigatória de Link Público de Download (Proibição de Caminho Interno Isolado)
- Sempre que um artefato instalável, pacote ou arquivo baixável (`.apk`, `.zip`, `.tar.gz`, `.pdf`, `.docx`, `.xlsx`, etc.) for gerado, atualizado ou localizado na VPS, o agente **DEVE publicar/validar imediatamente a rota HTTPS pública** (`HTTP 200`, tamanho e hash `SHA-256` conferidos) e entregar o **link clicável de download direto** já na primeira resposta.
- **É expressamente proibido** responder ao usuário informando apenas o caminho interno do sistema de arquivos da VPS (ex.: `/opt/.../arquivo.apk`) sem disponibilizar simultaneamente o link público pronto para baixar pelo celular ou navegador.

## 10. Protocolo de Preservação Visual e Regressão Zero (Diretriz Permanente)
- **Princípio Central:** Uma correção funcional não autoriza deteriorar a interface. Nenhuma entrega é aceita apenas porque o código compila, a API responde ou um botão funciona. A interface resultante precisa ser funcional, proporcional, legível, visualmente consistente e tão boa quanto a última versão aprovada, ou melhor.
- **Preservação antes de Modificação:** Antes de qualquer alteração, identificar arquivos e componentes afetados, consultar a última versão visual aprovada, registrar screenshots reais (baseline), identificar componentes compartilhados e impactos indiretos, mapear funcionalidades a preservar e criar checkpoint recuperável. Proibido reconstruir componentes aprovados apenas para corrigir comportamento localizado.
- **Especialista Mobile como Revisor Responsável:** O `horizon-mobile-ui` é o responsável técnico obrigatório por hierarquia visual, proporção de botões e controles (min 44x44px/48x48px com 8-12px de gap), tipografia sem cortes, densidade de informação, nitidez de ícones, navegação, zero sobreposição (0px² overlap), suporte a larguras 320 a 430px, teclado virtual (IME), 100dvh, safe areas e fidelidade à identidade visual. Proibido aprovar telas com disputas de espaço ou botões desproporcionais.
- **QA Independente sem Autoaprovação:** O `horizon-qa-guardian` revisa funcional e visualmente de forma independente do executor. Exige testes reais de interação e comparação antes/depois. Inspeção de DOM não substitui a tela renderizada.
- **Controle da May Maestro:** May Maestro (`horizon-orchestrator`) confere requisitos preservados, compara com a última versão aprovada, coordena correções, bloqueia integração em caso de regressão crítica, garante reparo na origem sem acúmulo de overrides ou remendos, e preserva histórico/checkpoints.
- **Matriz Visual Obrigatória (Mínimo 6 Resoluções):** Testar obrigatoriamente em 320, 360, 390, 430, 768 e 1440 px via Playwright/Chromium, conferindo horizontal, teclado aberto, overflow scroll, zoom e estados de erro/loading.
- **Estabilidade das Interações:** Polling, WebSocket, SSE ou mudanças de estado NUNCA devem fechar modais, apagar dados/rascunhos de inputs, alterar rotas ou causar reinicializações/flicker.
- **Critérios de Bloqueio Imediato:** Reprovação imediata se houver: funcionalidade quebrada, sobreposição de textos/ícones, botões inacessíveis, corte de conteúdo, navegação contraditória, perda de dados por atualização, recarregamentos involuntários, falhas de responsividade, quebra de paleta/identidade ou layout divergente do aprovado.
- **Regra Final:** Funcionar é obrigatório. Preservar o que já funcionava também. Qualidade visual não é opcional.

## 11. Diretriz de Uso Intensivo de Ferramentas Multimídia e Auto-Aprimoramento (`hz-media` / `hz-media-docker`)
- **Autonomia de Decisão com Uso Proativo ("Use sem dó"):** Os agentes superiores decidem os momentos exatos de acionar as ferramentas multimídia locais da VPS (`hz-media` e `hz-media-docker`), mas devem utilizá-las de forma ampla e frequente para verificar e garantir a qualidade técnica e de entrega.
- **Momentos Mandatórios de Uso Conforme o Pedido:**
  1. Triagem e análise de evidências multimídia fornecidas (vídeos, áudios, imagens, PDFs).
  2. Auditoria independente de qualidade (OCR determinístico de documentos/telas, transcrição Whisper local em CPU INT8, extração de frames e contact-sheets de gravações).
  3. Inspeção segura de mídias guardadas em contêineres Docker via `hz-media-docker NOME_CONTAINER /app/caminho`.
- **Algoritmo de Auto-Aprimoramento nas Ferramentas:**
  - Em qualquer erro, arquivo corrompido ou falha de decodificação, aplicar o ciclo de 7 etapas: investigar causa raiz, aplicar auto-cura (fallbacks de OCR com contraste/PSM, normalização de áudio para PCM 16kHz mono ou filtro fps), registrar em `evolution.jsonl` e retroalimentar as ferramentas com regras preventivas.

## Paleta Horizon vigente — 04-11-2026

Aplicar esta decisão do proprietário a todos os materiais, interfaces, instruções, exemplos e revisões da Horizon. Ela substitui permissões anteriores de azul/ciano e propostas antigas de paleta.

- Usar **#1F98FF como único azul autorizado**, sem clarear, escurecer, deslocar o matiz, aplicar transparência ao azul ou criar variantes de hover, foco, seleção, gráfico ou gradiente.
- Usar neutros puros (R=G=B) no restante da base visual. Referências de interface — fundo #191919, superfície #262626, elevação #303030, borda #535353, texto #FFFFFF/#E5E5E5 e texto secundário #B3B3B3. Preto #000000 permanece disponível para aplicações institucionais.
- Remover permissões de azul-marinho, petróleo, teal, ciano, grafite azulado e cinza azulado. Estados de interação devem variar por borda, sublinhado, geometria ou cinza neutro, mantendo o azul exato.
- Respeitar as cores específicas de clientes e suas proibições de azul, incluindo Maxvel/Ronda Pro. Cores semânticas não azuis dependem da identidade e do contexto aprovados.
- Antes de entregar, conferir tokens, estilos calculados, SVG, ícones, sombras, foco, hover, seleção, estados desabilitados e metadados de marca. Toda ocorrência de azul deve corresponder a #1F98FF; fundos e textos neutros devem ter canais RGB iguais. Validar contraste sem introduzir outro azul. Fotos e mapas externos não autorizam novas cores de interface.
