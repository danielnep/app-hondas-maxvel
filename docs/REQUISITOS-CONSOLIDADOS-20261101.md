# Ronda Pro | requisitos consolidados e matriz de aceite | 01/11/2026

## Regra de comparação
Baseline efetivamente oferecida para download: Ronda Pro 2.2.3 (SHA-256 9682f8c61a34a1c57dee93353d8334522bdc06f977a943f2cadfcbc898f8ee9b). 2.2.4 foi compilado, mas o link público permaneceu na 2.2.3. O código 2.2.5 Beta estava na worktree sem commit e com backend não implantado. Esta branch de consolidação inclui essa worktree em uma fonte isolada; não altera main nem a produção. Itens classificados conforme código/testes, não como aprovados fisicamente no Galaxy A53.

## Requisitos oriundos dos feedbacks e decisões
1. [Em código; falta Android físico] APK Android de verdade, com GPS, localização de segundo plano, notificações, câmera e lanterna nativas. Não vender APK como interface totalmente nativa se a UI é HTML/WebView embarcada.
2. [Em código; falta Android físico] Reservar status bar, barra de navegação, recorte e teclado na moldura nativa exatamente uma vez, sem tarja extra "Conectado", sem ocupar espaço duplo.
3. [Consolidado; falta Android físico] Manter layout navegador aprovado, com cabeçalho na mesma altura; rolagem mobile e fundo de login contínuo mesmo com teclado, nas resoluções 320/360/393/412 e paisagem.
4. [Em código] Identidade Grupo Maxvel, nome singular "Ronda Pro"; sem exibir marca Horizon na interface pública. Paleta grafite/glass, mapa claro, ícones brancos sem discos e vermelho reservado a pânico/alerta.
5. [Em código; demanda inspeção] Padronizar modais, histórico, alertas, chat, navegação, perfil, ajuda e ocorrências; sem janelas gigantes, áreas vazias falsas, títulos escondidos, CTA cortado nem janela morta ao reabrir.
6. [Em código; falta Android físico] Barra flutuante no lugar correto, sem deslocamentos durante rolagem; área superior de notificações preservada; layout mobile-first e funcionamento em rotação/teclado.
7. [Em código; requer integração com rede real] Login real na VPS, com contas e senhas existentes sem substituição; master separado, demais perfis vigia/ronda, COI, Michelle, administração; sem simulação de login.
8. [Em código; demanda teste ponta a ponta] Operação real sem Railway/Render, autenticação e dados em banco persistente na VPS, sem telas ou ações falsas; logs de falha de login para diagnóstico.
9. [Em código; demanda GPS real] Localização verdadeira, sem posições fabricadas na produção; monitorar disponibilidade e deslocamento e distinguir agente offline de agente fora do expediente.
10. [Em código; requer rede externa] Busca geográfica real, resultados pertinentes, preferir mais próximos disponíveis conforme localização/foco, marcador no mapa, filtros e mensagem de indisponibilidade.
11. [Em código] Solicitar ronda por overlay compacto; selecionar profissional e vários destinos reais; até 12 pontos com mini-mapa, reordenação, remoção, confirmação, mapa e percurso por ruas, nunca reta fictícia.
12. [Em código; falta validação operacional] Programação pontual ou diária, horários e designação a quem estiver disponível, sincronização de solicitações, rastreio e notificações ao campo/COI.
13. [Em código] Agente de Ronda: Iniciar -> Deslocar -> Estou aqui -> cronômetro/checkpoint -> evidências -> próximo ponto; obrigatoriedade GPS, regras de aproximação, justificativa de desvio.
14. [Em código; requer hardware] Central escolhe verificação por permanência GPS (30s configuráveis), QR Code, ou alternativa prevista, com sincronização real das evidências.
15. [Em código; falta hardware] Fotos dianteira/selfie e traseira capturadas no ato, metadados de horário/local/bateria, sem substituir captura obrigatória por anexo de galeria.
16. [Em código; demanda teste] Vistoria guiada em etapas, checklist por destino na ordem correta, voltar/avançar, foto e conclusão enviada ao COI; preservar fluxos legados necessários sem reaparecer nomenclatura rejeitada na área de ronda.
17. [Em código; demanda teste] Pânico, lanterna, alertas e comunicação interna sempre acessíveis, confirmação compacta e sem pânico acidental.
18. [Em código; demanda teste] Chat inferior/overlay compacto; recolher após inatividade, sem ícone decorativo redundante; manter conversa, foco e texto rascunho após atualização.
19. [Em código; demanda teste] Rotas e rascunhos offline, retomada após perder conexão e fila de sincronização local, sem inventar percurso onde não houve medição viária.
20. [Em código; demanda teste] Histórico real de rondas, mapas, ocorrências e evidências; exportações Excel por abas, relatórios COI, auditoria e supervisão.
21. [Em código 2.2.5 Beta; backend precisa coincidir] Painel de Gestão com setores: criar/editar/renomear/desativar/reativar, vincular pessoal, capacidades por módulo com controle de acesso no servidor; nunca apagar setores existentes.
22. [Em código 2.2.5 Beta; backend precisa coincidir] Tutorial de primeiro uso com spotlight, próximo/voltar/pular, tutorial reaberto na Ajuda e estado por conta/versão; pânico não bloqueado pelo guia.
23. [Em código 2.2.5 Beta; demanda teste] Anexar arquivo apenas em ocorrência, vistoria, chat e evidência pertinente, sem upload genérico na tela principal ou eventos simples.
24. [Parcialmente integrado] Recuperados src/geo-tools.js e src/saved-points-admin.js com cadastro administrativo, mapa geográfico Photon/OSM e pontos reutilizáveis no despacho que continua aceitando ATÉ 12 destinos ordenáveis. API SQLite aditiva, arquivamento sem excluir histórico e autenticação por perfil; teste de API passou. A gestão de permissões por função de src/settings-manager.js não foi transplantada porque sua política antiga concorreria com as capacidades por setor da base atual; exige tradução de regras e teste de autorização para não ampliar acessos.
25. [Pendente] Testar GPS, câmera, lanterna, notificações, insets, teclado, rotação, segundo plano e todos os perfis diretamente no Galaxy A53 5G. Capturas do Chromium/SDK não equivalem a esse aceite.
26. [Pendente] Homologar busca de pontos com localização real, login de cada conta com sua credencial existente e sincronização contra o backend de MESMA versão; não divulgar beta como produção testada.
27. [Implementado no processo] Compilar com SDK Android instalado na VPS e assinatura persistente, sem executar emulador; disponibilizar artefato APK binário, não apenas HTML.

## Linhas Git de referência
- main: piloto 1.1.3 desatualizado.
- 2.2.3: último APK que efetivamente estava no link público.
- 2.2.4: correção de moldura nativa, insets Android e uniformização das janelas; não publicada no download.
- 2.2.5 Beta: login, busca/rota, setores, tutorial e uploads contextuais integrados em fonte, alterações da worktree ainda não commitadas no repositório de origem.
- 2.2.6 Beta (esta consolidação): preserva 2.2.5 + correções de login/scroll da linha independente + regressões de CSS e cache/versão com QA.
- Outras 103 branches remotas: ver INVENTARIO-BRANCHES-20261101.md e MODULOS-ISOLADOS-20261101.md.

## Aceite de release
Confirmar a versão do APK que está de fato sendo oferecida; preservar UID, applicationId e certificado; testes de código, testes de fluxos no navegador, assinatura do APK, comparação fonte-APK e TESTE EM APARELHO separados. Não alterar main/produção nem contas sem autorização.
