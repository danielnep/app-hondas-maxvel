# Rondas Pro | Revisão COI, eventos e vistoriador
**Revisão de 16/10/2026 · PR #60 · Sistema Maxvel**

## Decisão de arquitetura operacional
- **Eventos** é a fila de trabalho: apenas registros sem status finalizado, separados em colunas verticais por tipo. Novos tipos ganham suas próprias colunas; a coluna exibe cada registro por ordem mais recente.
- **Histórico de eventos concluídos** é uma consulta de registros encerrados; o mesmo registro não pode ser concluído duas vezes. Abrir o detalhe conserva dados e o histórico da providência, sem campos de edição.
- A visualização/leitura de uma notificação **não** equivale a concluir o evento.
- **Chat interno** usa ícone de conversa, nunca o sino de eventos; mensagens permanecem separadas dos alertas operacionais.

## Solicitação COI → execução pelo vistoriador
O backend autenticado mantém um único modelo de despacho. O COI seleciona um vistoriador disponível, um dos destinos cadastrados **ou** digita endereço completo e registra o motivo (mínimo dez caracteres). Também identifica explicitamente se a vistoria é **de rotina** ou **sob demanda**. O servidor preserva controles de função, profissional ativo/disponível, campos válidos, idempotência/estado da atribuição, notificação e auditoria. A coluna `inspection_type` é criada por migração aditiva com padrão `requested`.

O vistoriador vê a missão recebida já na tela inicial, abre navegação externa por endereço e toca **Iniciar vistoria e confirmar chegada**. A confirmação solicita localização por gesto explícito, inicia o despacho e libera o formulário. A conclusão na interface exige captura de **foto do local e selfie**, declaração de conformidade ou avaliação dos quatro critérios quando existir irregularidade, e observações quando necessário. O laudo é enviado a `/api/events`, as evidências a `/api/media`, e o despacho só é encerrado por `/api/dispatches/:id/complete` depois do envio. Erro de upload não deve indicar conclusão. Após finalizado, a tela retorna ao estado **Sem vistoria pendente**.

A versão de demonstração usa registros e estados *locais*, não envia notificações para outros celulares; isso é informado na interface. O mapa do estado sem tarefa é decorativo, ofuscado. A versão autenticada inclui um link para abrir o endereço no aplicativo de mapas, mas **não** inventa coordenadas para endereços digitados.

## Identidade e composição
- Preservar o vermelho e o símbolo Maxvel; fundo e cartões neutros grafite/zinc, sem substituir a marca pelo azul Horizon.
- Cabeçalho e popovers independentes da altura da página; dropdown absoluto e proporcional ao conteúdo, com no máximo cinco prévias quando aplicável.
- Desktop: colunas e divisórias verticais, navegação lateral; mobile: colunas percorríveis horizontalmente, sem esmagamento de texto e controles.
- Campos, diálogos e a operação de campo dimensionados ao conteúdo, sem fullscreen artificial.
- Captura de câmera pede permissão contextual; não abre a câmera para renderizar a tela.

## Limitações a homologar
- As duas fotografias são obrigatórias **no frontend**, mas a API de laudo aceita registros de integração pré-existentes sem essa política de mídia; validação estrita da foto e selfie no servidor requer um contrato de anexos tipados e confirmação transacional separado.
- “Chegada” registra início do despacho e GPS capturado, mas não compara automaticamente posição com um endereço geocodificado. Para endereços digitados sem latitude e longitude, a conferência geográfica não é afirmada.
- O sistema não substitui o uso de dispositivos físicos e verificação de permissões Android para câmera e GPS.
- Não foi criado sistema de geocodificação, notificação push permanente, nem mudança de hospedagem/infraestrutura.
- Uma vistoria de rotina é um despacho classificado, e não um motor de agendamento recorrente. Agenda recorrente pode ser acrescentada em evolução específica.

## Validação
- `npm run check`, `npm test`, integrações de despachos e permissões.
- Simulação COI: registrar e encerrar evento pela coluna; verificar apenas consulta no histórico; despacho por endereço; espera e execução do vistoriador.
- Auditoria mobile em oito tamanhos e imersiva em sete, acessibilidade, compilação APK.
- Homologação de foto, selfie e GPS em aparelho real permanece dependente de teste físico.

**Importante:** esta documentação descreve a PR #60. A publicação em `main` depende de todas as verificações passarem e de mesclagem explícita.
