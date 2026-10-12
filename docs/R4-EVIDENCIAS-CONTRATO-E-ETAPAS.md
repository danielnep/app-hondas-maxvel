# R4 · Contrato funcional de evidências de ponto
Data: 12/10/2026 · Situação: **especificação e pesquisa técnica; implementação operacional pendente**

## Origem
Proposta de melhorias do projeto: geolocalização, fotografias das quatro direções (frente, trás, esquerda e direita), selfie e verificação de giro no ponto, sem exigir NFC. Não substituir nem enfraquecer as regras de 25 metros, 30 segundos, sequência, desvio, justificativa e retorno à base.

## Fluxo proposto
1. Vigia chega ao ponto e cumpre geocerca e permanência. A ação de conclusão abre uma verificação contextual em painel/folha sobre o mapa, sem ocultar o trajeto permanentemente.
2. O aplicativo solicita quatro imagens identificadas por direção. Cada imagem tem pré-visualização, opção de refazer e identificação do ponto e horário. Não aceitar fotos de exemplo como evidência real.
3. Solicita selfie associada ao mesmo registro. Autorização de câmera deve ser contextual; sem reconhecimento facial automático nem comparação biométrica sem definição específica de necessidade e base legal.
4. Aferição de giro: distinguir rotação de 360 graus efetivamente observada por sensor compatível de um simples clique de confirmação. Exigir consentimento/permissão de movimento quando a plataforma solicitar.
5. Antes de concluir, apresentar resumo de geocerca, permanência, fotos, selfie, giro e declaração. No modo de demonstração, rotular todas as evidências e sensores simulados.
6. Aparelho sem câmera/sensor, permissão negada, offline, falha de gravação ou GPS instável: gerar exceção auditável para revisão do supervisor, **não** inventar prova e não concluir automaticamente.
7. Só permitir conclusão real quando requisitos estiverem satisfeitos ou quando existir decisão de exceção formal e autorizada. Não guardar fotografias sensíveis em localStorage.

## Contratos propostos (não implementados)
- `PointEvidence`: id, sessionId, checkpointId, createdAt, capturedAt, deviceId, geolocationFixId, captureMode (real/demo), mediaRefs {front,back,left,right,selfie}, motionProof {supported,permission,startAt,endAt,coverageDeg,quality}, declarationVersion, status (draft/submitted/reviewed/rejected), review.
- Armazenamento privado: blobs cifrados com referências opacas e upload autenticado. Servidor aplica isolamento por cliente/unidade e registra trilha de auditoria.
- Sem rede: fila criptografada e sincronização idempotente, status explícito de envio; não anunciar supervisor notificado até confirmação remota.
- Controles: retenção e descarte, minimização de imagens, acesso por papel, revisão humana de exceções, política LGPD antes de ativação.

## Plano de entrega R4
- R4.1 Criar demonstrador visual guiado, com dados explicitamente fictícios, sem captura real nem alteração das regras existentes.
- R4.2 Validar APIs e permissões de câmera e orientação no Android, navegadores compatíveis e aparelhos sem sensor.
- R4.3 Implementar captura real e armazenamento seguro, com modelo de evidências, testes e revisão de segurança, condicionado à aprovação do contrato de dados/backend.
- R4.4 Integrar autorização de conclusão e revisão de exceções, mantendo trilha de auditoria.

## Critérios de QA
A conclusão jamais afirma foto/giro reais se não ocorreram. Evidência de outro ponto não pode ser reaproveitada. Falha de sensor não é tratada como infração automática. Fluxos simulados continuam funcionando; não perder desvio, justificativa, ocorrência, retorno, agenda ou relatórios. Testar no Android físico antes de declarar produção pronta.
