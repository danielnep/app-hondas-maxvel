# Rondas Pro · Guia operacional completo
**Versão de demonstração · Grupo Maxvel · 13-10-2026**

## 1. Primeiro acesso e objetivo
Este é o aplicativo de demonstração do produto que será implantado posteriormente. A navegação permite conhecer as perspectivas Vigia/Ronda, Supervisão, Gestão, Administração e Cliente. Os nomes, as rotas e os dados de exemplo são fictícios e exibidos no próprio aplicativo.

**GPS antes da ronda:** ao acessar como vigia na demonstração, o aplicativo solicita permissão de localização quando o aparelho e o navegador suportam a solicitação. Na ronda de GPS real, é obrigatório obter uma posição precisa para iniciar. Se a autorização for negada, não é possível iniciar a ronda real; o modo de simulação continua disponível, com localização declaradamente fictícia.

**Acompanhamento:** a posição acompanha o vigia durante a ronda. Na aplicação web a coleta requer que a página continue ativa; fechar o navegador não deixa o GPS rodando. No aplicativo Android existe serviço nativo de localização com notificação persistente e banco SQLite no armazenamento privado. O acompanhamento em segundo plano depende de permissões, configuração de bateria, hardware e comportamento do Android. Não há garantia técnica de funcionamento em absolutamente todos os celulares.

## 2. Vigia e execução
1. Acesse Vigia/Ronda, confira suas rondas programadas, selecione a rota e leia as regras.
2. Inicie a execução. No modo real o GPS precisa ser autorizado e possuir precisão suficiente. No modo de demonstração o deslocamento é simulado.
3. Percorra cada ponto **obrigatoriamente em ordem**. Não é possível concluir um ponto posterior antes do atual.
4. Em rondas por GPS, entre no **raio de 25 metros**, mantenha posição confiável e permaneça **30 segundos seguidos**, ou o prazo configurado. Quedas do sinal reiniciam a contagem; não são atribuídas automaticamente a má conduta.
5. O administrador pode configurar três validações para as novas rondas: **GPS**, **QR Code**, ou **GPS + QR Code**. Mesmo com validação QR exclusiva, o rastreamento GPS continua disponível para documentação durante a execução, mas não é condição para concluir aquele ponto.
6. Para QR, use **Ler QR Code** na ronda. A câmera lê quando BarcodeDetector e acesso à câmera estão disponíveis. A entrada manual de código é **apenas um recurso de simulação**, nunca prova de leitura física. Os códigos reais precisam ser vinculados e verificados no servidor de produção.
7. Registre irregularidades por **Ocorrência**, com descrição, prioridade e anexos opcionais: **foto, gravação de áudio ou vídeo**. Não há exigência de selfie.
8. Caso saia da rota, o avanço é bloqueado e a justificativa passa a integrar o histórico conforme a regra configurada. A ronda se encerra após os pontos e o retorno à base.

## 3. Botão de pânico
O vigia tem um botão **PÂNICO** permanentemente visível durante o acesso operacional. Na demonstração, o acionamento é confirmado para evitar disparos acidentais. O sistema registra o responsável, o horário e a posição disponível. O evento aparece no histórico de notificações do mesmo navegador e na fila local do dispositivo, com prioridade. Em seguida há um botão para **abrir o discador com o número 190**, sem realizar automaticamente a ligação.

**Limite da demo:** o alerta não é enviado para gestores em outros aparelhos. Entrega remota com confirmação de recebimento, fila do servidor, canais de fallback e autenticação só poderão ser demonstradas como reais após implantação do backend. Na ausência de internet, a ocorrência de pânico é salva localmente, mas não entregue remotamente até haver conexão e integração operacional.

## 4. Funcionamento sem internet
- Na Web/PWA, os componentes estáticos do aplicativo são armazenados em CacheStorage após a primeira visita, pelo service worker. Os registros e os arquivos ficam em **IndexedDB no dispositivo**; é armazenamento privado sob controle do navegador, sujeito a cotas e limpeza de dados.
- No Android nativo, as **coordenadas são armazenadas em SQLite privado** pelo serviço de rastreamento. O componente web usa IndexedDB para a fila de eventos, evidências e relatórios locais.
- **Salvar mapa offline** guarda a geometria e os pontos da rota no dispositivo e exporta um esquema vetorial SVG. Isso não representa um mapa de ruas detalhado offline: tiles de ruas dependem de cartografia com licença e armazenamento apropriados.
- Os registros locais ficam marcados **pendentes de sincronização**. O serviço de hospedagem atual não possui API de envio, autenticação nem banco multiusuário. Por isso, reconectar à internet **não significa** que dados já foram transmitidos para a gestão: a sincronização remota é parte da implantação futura.
- A captura de mídia depende das possibilidades do navegador/Android. Não prometer que todos os celulares fornecerão exatamente o mesmo gravador nativo.

## 5. Supervisão
A Supervisão consulta o colaborador selecionado, a rota vinculada, o último registro, o mapa, os alertas, ocorrências e histórico cronológico. Em uma ronda real com servidor, o GPS seria acompanhado em tempo real de outros dispositivos. No protótipo, o histórico é local; a posição simulada e as notificações aparecem ao alternar perfis **no mesmo navegador**.
O gestor deve avaliar individualmente qualquer GPS impreciso, queda de energia ou falta de sinal; não confundir erro técnico com fraude.

## 6. Gestão e Administração
- O painel inicial mostra indicadores, rondas e colaboradores. Selecione um vigia para consultar sua última rota e registros.
- Em **Configurações**, escolha a regra de validação dos pontos: GPS, QR ou GPS + QR, aplicada às próximas execuções.
- **Exportar relatório completo** fica no início da Administração e em Relatórios. Ao clicar, é possível marcar o que entra: resumo, rondas, pontos e QR, ocorrências e metadados de evidência, alertas/pânico, coordenadas e programações.
- Formatos disponíveis: **HTML para abrir/imprimir em PDF, CSV ou JSON**.
- **Relatório inteligente**: análise automática calculada sobre rondas concluídas, duração média, ocorrências abertas e alertas pendentes. Os dados são demonstrativos, sem julgamento de desempenho do indivíduo.
- O sistema mantém um snapshot local do relatório de forma automática quando ocorrem atualizações, salvo em IndexedDB. Não existe envio automático por e-mail na demo.

## 7. Cliente acompanha serviço
A área **Cliente** permite conhecer o progresso da ronda ativa, o responsável, o horário, a etapa atual e o histórico local com status e número de ocorrências. É uma visão demonstrativa; em produção os clientes só poderão consultar dados da empresa/unidade autorizada, após autenticação com isolamento por organização e registros de acesso.

## 8. Evidências e privacidade
Fotos, áudios e vídeos opcionais ficam em armazenamento local IndexedDB, com metadados referenciados pela ocorrência. Em exportações, o relatório inclui os **metadados**, não incorpora automaticamente o arquivo binário. Pessoas reais não devem ser filmadas sem base legal e critérios apropriados. A finalidade, período de coleta, retenção e acesso precisam ser definidos pela empresa antes de produzir.

## 9. Critérios de aceitação antes da implantação operacional
- Permissão GPS, configuração de localização, comportamento Android em segundo plano e perda de precisão testados em aparelhos físicos.
- Teste offline com celular reiniciado, queda e retorno de internet, limites de armazenamento, sincronização idempotente e prova de recebimento pelo servidor.
- QR real com identidade do código, assinatura/validação segura por servidor e rejeição de ponto errado.
- Filas prioritárias de pânico, confirmação do gestor, tolerância a falhas e abertura segura do discador.
- Mídias no Android, consentimento adequado, formatos, compressão, criptografia e política de retenção.
- Autenticação, autorização servidor, segregação de cliente e controle por posto.
- Relatórios consistentes com dados reais e infraestrutura de exportação.
- Testes em Android e navegadores com e sem conexão.

**Estado atual:** extensão implementada em ramificação de demonstração. Só é correto apresentar como *implantado em produção* após a integração servidor, ensaios e homologação técnica.
