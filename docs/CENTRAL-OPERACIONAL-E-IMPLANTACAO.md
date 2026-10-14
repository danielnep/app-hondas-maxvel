# Rondas Pro | Central operacional e versão instalável

## Status

Implementação em **branch de revisão**. Não declarar entregue remotamente quando ainda está no dispositivo. Não usar dados de simulação como ocorrências reais. API operacional fica desativada sem configuração de banco persistente e credenciais Master.

## URLs

- `/`: aplicativo web / PWA instalável quando navegador permite. Demonstração sem autenticação central, dados locais.
- `/central.html`: acesso **autenticado** à operação real. Perfis `ronda`, `operador`, `admin`, `master`. É independente da seleção de perfis da demonstração.

## Configurações Railway

Obrigatórias para operação autenticada:
- `RONDA_PRO_DB_PATH=/data/rondas-pro.sqlite`
- `RONDA_PRO_MASTER_EMAIL=<email do responsável>`
- `RONDA_PRO_MASTER_PASSWORD=<senha forte de pelo menos 12 caracteres>`

Criar e montar **volume persistente em /data** antes da operação. A mesma pasta mantém `media/` e o SQLite. A alteração das variáveis acima não substitui um backup da base existente. Não publicar chaves ou senhas em repositório, HTML ou JS. Criar as contas de equipe a partir do Master.

Opcionais para e-mails independentes do pânico:
- `RESEND_API_KEY=<segredo da conta do provedor>`
- `RONDA_PRO_EMAIL_FROM=<remetente autorizado/verificado>`

Na central, configurar os destinatários por grupo e modelos. O aplicativo não envia mensagem de e-mail sem provider ou destinatário: gera estado `unconfigured`; falhas ficam como `failed`, envio aceito pelo provider como `accepted`. Nenhum significa leitura confirmada. Somente o evento de **alerta por email** ou outros disparos configurados autorizados enviam mensagens. O botão de pânico em si fica independente.

## Registro e sincronização

Ronda real registra eventos locais: GPS, nível de bateria, início/fim, incidentes, checkpoints com observação, mídias e pânico. A sincronização remota é **opcional e autenticada**: o usuário deve ter realizado login na Central na mesma aba/origem para que o token temporário esteja disponível, o serviço deve estar online e o banco operacional configurado. O envio usa IDs consistentes e evita duplicar eventos. Na falta de login, mantém eventos locais. Não sincroniza cenários simulados.

No Android, o serviço nativo de localização em foreground pode coletar com a tela fechada **enquanto o Android permitir**. O usuário e o próprio sistema operacional sempre podem suspender/perder permissões ou encerrar o serviço; não existe garantia técnica de execução indefinida nem mecanismo de contornar essa autonomia. A sincronização do histórico nativo ocorre ao retomar o aplicativo. A versão PWA no navegador não oferece monitoramento GPS contínuo confiável com a aba fechada.

## Fluxos e limites

- Chegada real a ponto: geocerca e GPS confiáveis -> cortina de confirmação -> tempo de permanência -> observação obrigatória + mídia opcional -> registro.
- Precisão ruim pausa validação e **não é tratada automaticamente como desvio**. Desvio exige múltiplas amostras espaçadas, margem de erro e análise humana.
- Operadores analisam eventos e registram respostas gerais ou mensagens internas. Vigia enxerga somente resposta geral. As mensagens ficam no banco sem endpoint de apagar; permanência física depende do volume, backups, gestão de acesso e política LGPD.
- XLSX inclui primeira aba Dashboard, e abas de dados, sem depender de API externa. PDF de conversa usa opção de impressão/salvar PDF do navegador.
- Relatórios de quilômetros são estimativas derivadas de amostras GPS válidas, ignorando grandes lacunas e saltos impossíveis; ausência de GPS não prova falha do colaborador.
- Evidências são arquivos privados: limite de 25 MB, tipos JPEG/PNG/WebP/MP4/WebM, acesso autenticado ao servidor.

## Checklist antes de promoção à main

1. `npm run check && npm test`.
2. GitHub Actions: validação, app simulado em navegador, acessibilidade e APK Android.
3. Provisionar volume do Railway e conta Master, testar backup/restore.
4. Testar em celulares físicos rede instável, GPS ruim, desligamento de bateria e permissões, fotos, câmera e lanterna.
5. Conferir regras de segurança e retenção LGPD com o controlador de dados; não assumir retenção infinita somente por não haver botão de apagar.
6. Testar Resend com domínio autorizado, falhas e e-mails recebidos. Revisar proteção contra força bruta, sessão e quotas antes de produção.
7. Só então mesclar/publicar explicitamente.
