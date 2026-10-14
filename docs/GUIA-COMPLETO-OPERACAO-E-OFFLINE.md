# Rondas Pro · Guia completo de operação, gestão e monitoramento

**Grupo Maxvel | Revisão de 14-10-2026**
**Abrangência:** experiência de avaliação (/) + Central Operacional autenticada (/central.html) + Android quando disponível.

> **Leia primeiro:** a avaliação no navegador usa pessoas, percursos e registros simulados ou locais. A **Central autenticada** consulta registros reais recebidos pelo servidor. Não confundir tela demonstrativa, funcionalidade codificada, serviço configurado e recurso homologado em campo.

## 1. Primeira entrada: demonstração sem login e autenticação operacional

**Na apresentação:** toque em **Explorar demonstração** para abrir diretamente o painel do vigia, sem formulário de acesso, login ou senha. A opção **Áreas** permite alternar entre Vigia, Monitoramento, COI, Cliente, Vistoriador e Administração com registros ilustrativos, sem fingir autenticação.

**Na operação real:** o administrador cadastra cada colaborador ou vigia com perfil, unidade, login individual e senha. O usuário entra pela **Central operacional autenticada** e vê apenas o painel e os recursos permitidos à sua conta.

**Ao entrar como Vigia:** uma cortina escura e translúcida solicita ativação da localização. Se a permissão for recusada ou o GPS falhar, as instruções continuam visíveis e há opção de tentar novamente; não é possível ignorar o bloqueio para executar uma ronda com GPS. O navegador pode exigir reativar o acesso nas configurações. Depois da autorização, o mapa aproxima o ponto recebido e enquadra o percurso. Na apresentação, o percurso permanece simulado. A opção **Iniciar ronda** já fica disponível na própria tela.

**Nos pontos:** ao chegar ao ponto previsto, começa a contagem de permanência de 30 segundos, com cortina de verificação. Após o tempo, selecione **Tudo dentro do esperado** (observação opcional) ou **Situação que exige atenção** (descrição obrigatória). Finalize a verificação antes de avançar. Foto, Vídeo e Áudio aparecem como ações diretas de captura. O vermelho do botão de pânico não é modificado.

**Ações rápidas:** Alerta em amarelo, Ocorrência em azul e Mensagem em branco. As três ações ficam separadas da prioridade Pânico, que permanece vermelha.

- **Vigia / Operação de Ronda:** executa a sequência autorizada, registra eventos, consulta suas rondas e pode comunicar à central.
- **Monitoramento (Operador):** acompanha vigias, rondas em execução, últimas posições recebidas, ocorrências e comunicações.
- **COI:** dispõe de visão gerencial das operações, com monitoramento, relatórios, tratamento e rotas por colaborador, de acordo com as permissões configuradas.
- **Administrador:** gerencia equipes, locais, indicadores, alertas e rotas, além dos registros e relatórios.
- **Master:** acesso administrativo principal, incluindo criação de outras contas conforme a política do servidor.
- **Cliente:** consulta somente serviços e rondas da unidade vinculada à própria conta; não acessa controle interno, anotações restritas nem configurações.
- **Vistoriador:** registra verificações do local e consulta seu histórico e o indicador de qualidade.

No primeiro acesso à Central autenticada aparece um **resumo guiado específico do perfil**. Use **Guia completo** no menu para reler as instruções. Na demonstração, use **Guia da plataforma**, os sinais de ajuda e **Rever tutorial**.

## 2. Painel inicial: local, situação e próximos passos

O nome do local/posto precisa ser informado no cadastro de vigias, clientes e vistoriadores. A vinculação é usada no servidor para limitar o escopo do cliente. Cadastrar corretamente o posto é tão importante quanto cadastrar corretamente a pessoa.

- Para o **Cliente**, o topo mostra a unidade autorizada; logo abaixo aparecem rondas ativas, últimas rondas, horário de cada execução e posição disponível.
- Para o **Vistoriador**, o topo identifica o posto e exibe as avaliações registradas.
- Para **Gestão / COI**, o painel apresenta uma visão de operação com indicadores e acesso direto ao monitoramento e às rotas de cada vigia.
- Para o **Vigia**, a interface enfatiza ronda atual, status do GPS, próximo ponto e ações de comunicação.

**Sem registro recebido não significa que o serviço ocorreu.** Quando não houver atividade ou sincronização, a tela deve informar claramente essa condição.

## 3. Administração: rotas por colaborador e mapas

1. Entre na **Central Operacional**, com perfil **Administrador**, **Master** ou **COI** autorizado.
2. Abra **Rotas por vigia** e selecione o colaborador.
3. Confira a sequência de linhas de rotas e execuções. As rondas em andamento aparecem primeiro; registros antigos seguem em ordem cronológica.
4. Em cada linha, o **mapa** acompanha detalhes relevantes: nome do percurso, posto, situação, início, quantidade de pontos, bateria, GPS e ocorrências.
5. O traçado contínuo representa os **pontos da rota planejada**. O traçado diferente representa as **coordenadas GPS efetivamente sincronizadas e consideradas confiáveis**. A última posição é informada com seu horário.
6. Use **Ver cronologia** para consultar os eventos da execução, com data e hora.
7. No topo, **Criar nova rota para colaborador** abre o editor. Selecione previamente o vigia; informe o nome; toque no mapa para adicionar os pontos na ordem. É possível informar coordenadas manualmente, renomear e remover pontos.
8. Salve após cadastrar **pelo menos dois pontos**. O servidor vincula a rota ao vigia e ao posto de cadastro. Alterações de uma rota planejada são salvas no servidor e auditadas.

**Importante:** cadastrar ou editar um planejamento não comprova que ele foi executado. Uma execução só pode ser associada inequivocamente à rota quando o início sincronizado inclui seu identificador de rota. O aplicativo web de demonstração não substitui essa integração.

### Atualização em andamento

Com a Central aberta, os painéis de monitoramento são atualizados aproximadamente a cada **30 segundos**. A atualização informa a posição **mais recente recebida**, e não acesso irrestrito ao GPS do telefone. Sem GPS recente, a visualização indica leitura antiga ou ausente; isso não é prova de desvio.

## 4. Monitoramento: prioridades sem poluição visual

- No topo: rondas ativas, pânicos e pendências.
- Em **Prioridade da operação**: alertas e ocorrências que merecem tratamento antes da consulta rotineira.
- Na lista de rondas: vigia, última leitura, GPS/bateria, trajetória disponível e status da execução.
- Em **Ocorrências**, abra o registro para ver cronologia, localização, anexos e conversa.
- A equipe pode salvar tratamento, resposta geral e anotação interna, com data e hora. Nem toda resposta é visível a todos os perfis.

**Precisão do GPS:** distância medida com sinal ruim pode ser enganosa. Verifique a precisão, a sequência e o intervalo entre amostras antes de atribuir desvio.

## 5. Vigia: executar uma ronda

1. Confira nome do posto, vigia, rota atribuída e instruções de segurança.
2. Em uma ronda **real**, autorize o GPS com precisão suficiente. Na demonstração o percurso é simulado e identificado como tal.
3. Siga os pontos na ordem; não é permitido avançar pulando verificações obrigatórias.
4. Para validação por GPS, chegue ao raio de **25 metros** e permaneça pelo período exigido. O padrão atual é **30 segundos contínuos**, ajustável em configurações.
5. Conforme o modo escolhido pela gestão, a verificação pode usar GPS, QR ou GPS + QR. A leitura manual de código na demonstração não comprova um QR físico.
6. Se houver desvio sinalizado, escreva uma justificativa e retorne ao trajeto/ponto conforme a regra. Justificar não equivale a concluir a etapa.
7. Registre **Ocorrência** (fato), **Alerta** (situação relevante) ou **Mensagem** (comunicação rotineira) no canal correspondente.
8. Finalize somente quando as condições da execução forem cumpridas. Consulte o histórico para confirmar o registro.

O **botão PÂNICO** permanece de fácil acesso. Confirme o acionamento para registrar a ocorrência e, caso necessite de emergência policial, utilize o botão de discagem **190**. O sistema não garante chamada completada ou recebimento de alerta pela central sem conectividade e confirmação.

## 6. Visão Cliente

O Cliente acompanha exclusivamente **seu local autorizado**. O painel mostra execução atual (quando recebida), última posição conhecida com data/hora, etapas confirmadas e histórico. A conta não pode cadastrar vigias, alterar rotas, gerenciar ocorrências nem acessar conversas internas.

Quando o GPS não estiver atual, o texto deve dizer **última posição recebida**, e não apresentar a pessoa como localizada ao vivo. Os dados disponíveis dependem de sincronização.

## 7. Vistoriador e qualidade

O formulário de vistoria verifica quatro critérios do **local**: **acessos, estrutura, equipamentos e sinalização**. Para cada item, escolha explicitamente **Conforme** ou **Não conforme** e registre observação objetiva antes de salvar.

O indicador porcentual representa a proporção de critérios conformes entre as quatro respostas validadas. A média exibida é calculada a partir das vistorias registradas; sem vistoria não existe nota. **GPS impreciso, ausência de sinal e falta de relatório não são automaticamente falhas de qualidade.** O índice avalia condições observadas no posto, não a pessoa do vigia.

## 8. Ocorrências, conversas, arquivos e relatórios

A Central registra eventos, tratamentos e mensagens com horários. Um evento pode ter anotações **gerais** e **internas**. Fotos e vídeos recebidos por canal permitido podem ser consultados com data, hora, posição quando disponível e bateria quando registrada.

A área **Relatórios** pode exportar **XLSX** por abas com painel de indicadores, eventos e mensagens; há também exportação **JSON** e **CSV** e impressão das conversas para salvar **PDF**. Relatórios representam o conjunto de dados efetivamente persistido e acessível ao usuário autorizado.

Registros enviados enquanto offline podem ficar pendentes. Não considere o envio concluído sem confirmação do servidor.

## 9. Offline, Android e limites técnicos

- A **PWA/Web** pode guardar componentes e registros em CacheStorage/IndexedDB do dispositivo; o navegador pode restringir ou apagar esses dados. A tela web não garante rastreamento em segundo plano após fechamento.
- O **Android** possui serviço de localização e SQLite privado para coordenadas coletadas quando permissões e funcionamento do sistema permitem. Restrições de bateria, aparelho e versão do Android podem afetar a coleta.
- Mapa de ruas do OpenStreetMap depende de acesso aos tiles, salvo outra estratégia offline licenciada. Pontos e esquemas podem ficar salvos sem oferecer mapa viário completo.
- A Central autenticada usa API e armazenamento persistente quando o Railway dispõe das configurações e volumes necessários. A simples presença do código não comprova implantação ou segurança homologada.
- Armazenamento e acesso a imagens, GPS e histórico devem observar finalidades, permissões, retenção, acesso e demais obrigações de privacidade definidas pela organização.

## 10. Validação antes de uso operacional definitivo

Verificar com aparelhos reais: GPS em trajetos e áreas fechadas, precisão variável, interrupção/retomada, sincronização offline, identificação de vigia e posto, permissões de cliente, rotas criadas na central, associação da execução à rota, mapa com posições reais, arquivos, notificações, pânico e recuperação após falhas. Verificar também navegação com uma mão, telas pequenas, leitores de tela, teclado e estabilidade do mapa.

**Princípio de operação:** uma tela organizada facilita decidir; somente dados persistidos e testes de ponta a ponta permitem afirmar que a operação foi executada com segurança e rastreabilidade.
