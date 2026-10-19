# Ronda Pro | Entrada única e revisão premium
19/10/2026 | Grupo Maxvel

## Entradas e funcionamento
O aplicativo utiliza index.html e src/bootstrap.js como entrada única. Quando a API Node/SQLite está configurada, o mesmo endereço carrega a operação com login, funções por perfil e persistência, antes distribuída em uma Central autenticada separada. A antiga central.html é apenas um redirecionamento para o aplicativo. Autenticação, controle de permissões e auditoria do backend existente foram preservados.

Sem API (GitHub Pages), carrega uma prévia local claramente demonstrativa. Hospedagem estática não compartilha registros entre dispositivos. Operação real exige hospedar o Node com RONDA_PRO_DB_PATH apontando para volume durável, RONDA_PRO_MASTER_EMAIL e RONDA_PRO_MASTER_PASSWORD. Não publicar senhas no repositório.

O Android agora recebe RONDA_PRO_BASE_URL HTTPS em tempo de build; sem a URL usa os recursos locais como contingência, sem inventar servidor Railway. A compilação do APK e testes físicos não ocorreram nesta revisão.

## Correções
- Preservado tema Maxvel (mapa claro, vidro grafite, azul funcional, vermelho para risco).
- Removidos os links quebrados e a página de Central autenticada independente.
- Chat acessível diretamente e também a partir do bloqueio de GPS, sem redirecionamento para URL inexistente.
- Botão de instalação não se sobrepõe ao logotipo no celular.
- Removido movimento contínuo que impedia estabilidade do clique em mensagens.
- Corrigidos nome duplicado no COI, alinhamento da confirmação de vistoria, foco visível e movimento reduzido.
- Revalidado gerador/cascata: seis fontes canônicas.

## Capturas reais e fluxos
artifacts/mobile-360-map.png: tela operacional após GPS; mobile-360-chat.png: mensagens abertas por clique normal; mobile-360-patrol.png: Maps/Waze e início da ronda; desktop-1366-coi.png: painel COI desktop; mobile-393-inspector.png: rota recebida da vistoria; mobile-393-evidence.png: etapa cinco e checkbox alinhado; desktop-1366-login.png e mobile-360-login.png: entrada operacional Node/SQLite.

Testes: npm run check, npm run check:styles e npm test; fluxos Chromium em 360x800, 393x852, 1366x900 sem overflow horizontal nas telas verificadas.

Limites: GPS de campo, CameraX, lanterna real, notificações em aparelhos distintos, APK, instalação remota e deploy público do Node não foram homologados aqui. As capturas usam coordenadas e cadastros fictícios para QA, jamais dados de operação real.

## Publicação da prévia
No GitHub Pages, selecionar branch feat/ronda-pro-fullstack-premium-20261019 e pasta /(root). Isto mostra a prévia estática para validação visual. Para sincronização efetiva entre aparelhos, publicar o backend Node da mesma branch em um servidor com SQLite durável e autenticação configurada. Não integrar em main automaticamente.
