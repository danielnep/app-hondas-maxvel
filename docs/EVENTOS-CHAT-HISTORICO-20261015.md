# Eventos, chat interno e histórico — 15/10/2026

## Comportamento implementado

A demonstração conserva os dados locais identificados como demonstração. A central autenticada (`/central.html`) usa o banco SQLite existente. As migrações são aditivas, sem substituir registros operacionais anteriores.

- Eventos e mensagens têm botões azuis separados no cabeçalho. As prévias mostram até cinco itens e indicam não lidos que ficaram além desses cinco. Abrir a prévia não marca leitura.
- Eventos substitui o nome Notificações na navegação. Colunas separam tipos, com cronologia de recebimento dentro de cada uma; no celular há rolagem horizontal das colunas.
- Leitura de evento e conclusão da tratativa permanecem independentes. O modal de pânico consulta o telefone cadastrado do profissional. O telefone pode ser preenchido no cadastro ou em Chat interno → Meu telefone; não há número fictício quando ele estiver ausente.
- A inicial da central mostra a última ronda com mapa e uma lista separada de cinco rondas/vistorias recentes. Histórico na navegação inclui paginação, período, situação, tipo e busca por profissional, posto ou registro.
- O detalhe de ronda tem mapa, percurso GPS, pontos previstos, ocorrências e linha do tempo com coordenadas. A geometria usa amostras aceitas pelo filtro GPS existente; lacunas e amostras rejeitadas não viram caminhos inventados. A linha do tempo conserva os registros brutos.
- O chat suporta conversas individuais e grupos, pesquisa, texto/emojis, anexos de imagem/vídeo/áudio/documentos, gravação de voz, localização, respostas, encaminhamento, reações e recibos por destinatário.
- Entrega em segundo plano é confirmada pelo dispositivo após receber a mensagem. Visualização exige conversa aberta, página visível/focada e mensagem visível na área de leitura. Falha ao enviar mantém o texto e oferece tentativa pelo botão Enviar; a chave da mensagem evita duplicação em reenvios.
- Exclusão para mim é individual. Exclusão para todos exige autoria e ausência de visualização por qualquer outro participante, validada em transação no servidor. O conteúdo e anexos são removidos; permanece a indicação de mensagem excluída. Mensagens antigas já carregadas também atualizam seu estado.
- As mensagens não entram no botão/página de eventos. O endpoint legado `/api/notifications` é mantido para compatibilidade e auditoria; a interface operacional consulta `channel=events`.

## Persistência e acesso

Conversas, participantes, mensagens, anexos, recibos, reações e exclusões usam tabelas próprias no mesmo banco. Rotas e eventos continuam nas tabelas existentes. Consultas exigem autenticação e participação na conversa; o histórico respeita o escopo do usuário e os módulos autorizados. Clientes só podem iniciar conversas com a equipe de gestão/COI do mesmo posto.

A implantação deve manter `RONDA_PRO_DB_PATH` em armazenamento persistente, como já exigido pela API existente, com as credenciais Master configuradas. Um arquivo em disco efêmero não atende à persistência entre substituições da instância. Esta alteração não provisiona infraestrutura nem modifica a instância publicada.

Não se oferece criptografia de ponta a ponta: as mensagens são processadas pelo servidor da instalação. O chat não deve ser anunciado como reprodução integral do WhatsApp. A sincronização das mensagens usa consulta autenticada a cada quatro segundos com a página aberta; os eventos continuam usando o fluxo existente de atualização.

## Chamadas

Há implementação de chamadas individuais de áudio/vídeo por WebRTC e sinalização autenticada. `RONDA_PRO_ICE_SERVERS` aceita o JSON de configuração `iceServers` da instalação. Sem STUN/TURN adequados, chamadas entre redes distintas podem não conectar. Não houve teste audiovisual entre aparelhos neste ambiente; apenas o isolamento da sinalização foi validado. Grupos não exibem botão de chamada.

## Verificação

- `npm run check`: sintaxe de todos os módulos existentes e novos.
- `npm test`: 156 testes aprovados, incluindo os testes novos de entrega, leitura, exclusão, grupos, autorização, anexos, paginação, estado de mensagens antigas, vistorias e reinício do banco.
- QA funcional por DOM da central: login, dois botões, cinco eventos na prévia, selo além dos cinco, colunas, modal de pânico e telefone, conversa/envio/leitura e acesso ao histórico.
- QA funcional por DOM da demonstração: botões no cabeçalho, navegação de histórico, última ronda e abertura de registro com mapa.
- Capturas de tela e avaliação geométrica em navegador não foram realizadas: a instalação do Chromium falhou neste ambiente. As verificações DOM não substituem essa validação visual nem testes físicos de câmera, microfone e WebRTC.
