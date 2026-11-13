# Entrega Ronda Pro Beta — 01/11/2026

## Escopo e estado

Trabalho na worktree `/opt/ronda-pro-beta-20261101`, branch existente `feat/ronda-beta-michelle-setores-20261101`. O nome da branch foi preservado; o código alterado é exclusivamente Ronda Pro. Não houve push, merge, deploy, alteração de credenciais ou acesso ao banco real. Emulador não iniciado. Esta é uma entrega de implementação com APK assinado; **a validação completa permanece pendente pelas restrições abaixo**.

As alterações não comitadas encontradas em Gradle, empacotador, server.js, operational-api, ops-center e sector-management foram preservadas e concluídas. O arquivo preexistente `.patch-server.py` foi preservado sem execução ou alteração.

## Checkpoints de implementação

1. Leitura de AGENTS.md, revisões Android 2.2.4 e 2.2.3 e skill android-cli. Preservada a moldura nativa aprovada de insets/status bar/navbar/IME, mapa claro, identidade Maxvel, rascunho de chat e regras operacionais. Não houve redesenho da geometria nativa sem teste físico.
2. Painel de Gestão no menu de Master/Admin nas duas entradas (`index.html`/APK e `central.html`/web), com componente compartilhado `src/sector-management-ui.js`: criar, renomear, editar, desativar/reativar, configurar capacidades e vincular/desvincular colaboradores ativos. Layout adaptável, labels, foco visível, alvos de toque e estados de carregamento/erro/vazio.
3. SQLite: tabelas de setores, capacidades e vínculos, sem exclusão de setores. Escritas de setor/vínculos e auditoria são transacionais. Nomes únicos sem distinção de caixa, validação dos tipos, limites de entrada e 403 para perfis sem gestão. Endereço Rua Rio Grande do Sul 1541, Divinópolis/MG permanece explicitamente provisório; não foi cadastrado nem confirmado automaticamente.
4. Capacidades restringem permissões existentes; nunca elevam o perfil. Master/Admin mantêm gestão. Colaboradores sem vínculo mantêm o comportamento legado. Havendo vínculo, pelo menos um setor ativo deve permitir a capacidade; setor inativo ou sem linhas de capacidades não libera acesso. Rondas, despachos, mapa da supervisão, relatórios, equipe e vistoria têm verificações reais no servidor. Permissões COI de ocorrências/alertas também intersectam setores. A consulta de permissões retorna o estado efetivo por setor para COI/Operador; a indisponibilidade da lista de equipe não impede o login. Emergência, evidências, histórico próprio, telemetria e comunicação interna foram preservados. A política não implementa isolamento de registros por setor: regras existentes de perfil/local/proprietário continuam responsáveis pela visibilidade.
5. Login com orientação por perfil nas duas entradas. Tutorial overlay com spotlight, anterior/próximo, pular/fechar, Escape, foco contido/restaurado, resize/scroll/visualViewport, redução de movimento e reabertura em Ajuda/menu. Compartilha `src/tutorial.js` entre web e APK. SQLite registra por usuário e versão `2.2.5-beta`, com cache local também separado por conta/versão. Pânico disponível no tutorial quando existe na tela; o tutorial fecha antes de encaminhar à confirmação de emergência. Primeiro acesso no APK aguarda o gate de GPS e diálogos iniciais.
6. Auditoria de uploads: não foi encontrado seletor direto de arquivos na home canônica. Preservados anexos do chat, ocorrência, vistoria e evidências obrigatórias de checkpoint. Removida a oferta de upload na tela web de detalhes de eventos de GPS, alerta, bateria e ciclo de ronda; o formulário de evidência fica restrito a ocorrência/vistoria. Não foi adicionado upload à home. Atalhos de comunicação existentes foram preservados.
7. CSS Beta compartilhado em ambas as entradas, incluído na auditoria PostCSS e cache PWA. Cache e marcador de atualização avançados juntos para v78. Testes de contrato de CSS/cache atualizados para a camada Beta.
8. Gradle e empacotador preservam applicationId e chave persistente, com versionName `2.2.5-beta`, versionCode `19`, nome `Ronda-Pro-2.2.5-Beta.apk`. O empacotador não gerou chave nova nem expôs senha.

## Verificação executada

- `npm run check` / `node --check`: passou, incluindo os novos módulos e `sw.js`.
- `npm run check:styles`: passou nas sete fontes, sem declarações redundantes.
- `node --test tests/sector-api.test.mjs tests/sector-management.test.mjs`: passou. Também executados diretamente. Exercita API real com Readable/response em memória, autenticação dos sete perfis, 401/403, CRUD, duplicidade, validação, vínculos, desativação/reativação, auditoria, capacidades, emergência e persistência ao reabrir o SQLite isolado. Não equivale a teste HTTP nem teste visual.
- `npm test`: executado; 63 arquivos de teste passaram e 11 falharam por restrições de execução/servidor local; resultado final e falhas registrados em `artifacts/beta-validation/npm-test.log`. Os testes que abrem servidor local não passam neste sandbox. Reprodução direta em `ronda-beta-api-direct.log`: `listen EPERM: operation not permitted 127.0.0.1`.
- `scripts/android-development-check.py --lint` e Gradle `lintRelease assembleRelease`: executados e bloqueados. Primeiro, cache padrão sem permissão; repetidos com cópia do cache em `/tmp/ronda-beta-gradle-home`. O daemon não inicia: `java.net.SocketException: Operation not permitted`. Não há aprovação de Lint/assembleRelease nesta sessão.
- `scripts/build-production-apk.py`: passou usando SDK local, javac, d8, aapt2, zipalign e apksigner, sem daemon Gradle. Assinatura persistente conferida pelo script de auditoria Android.
- `scripts/android-parity-check.py` e `scripts/window-theme-check.py`: executados com Python Playwright da VPS e `RP_QA_APK` explícito. Bloqueados em `socket.socket()`/bind por `PermissionError: Operation not permitted`. O segundo script agora aceita `RP_QA_APK`, evitando validar inadvertidamente o APK 2.2.4.
- `scripts/mobile-search-chat-check.mjs`: executado com runtime explícito `/opt/ronda-pro-real-20261031/node_modules/playwright-core/index.mjs`, Chromium da VPS e APK Beta explícito; bloqueado antes da UI por `spawnSync python3 EPERM`. Não há aprovação visual de login/mapa/histórico/chat, responsividade, navegação, onboarding, gestos ou camadas clicáveis nesta sessão.
- Comparação binária dos 79 arquivos `src`/`assets` do APK contra fonte: passou, respeitando a substituição prevista de `pages-test-api.js` pelo modo produção. Relatório `artifacts/beta-source-parity.json`. Isso não substitui a comparação renderizada HTML/APK.
- Não houve telefone conectado nem teste físico. Continuam pendentes barras/insets/IME reais, teclado, GPS/câmera, gestos e segundo plano em Android.

## Limitações técnicas da entrega

O perfil de ferramentas permite escrita somente nesta worktree e em `/tmp`. Por isso o APK foi entregue em `artifacts/beta-build`, sem criar `/opt/ronda-pro-build-2.2.5` fora das raízes autorizadas. Assinatura está disponível e foi usada; a limitação é o diretório de destino, não a chave.

A tentativa de `git add` foi recusada: `Unable to create '/opt/ronda-pro/.git/worktrees/ronda-pro-beta-20261101/index.lock': Read-only file system`. O diretório Git real está fora da área gravável. **Nenhum commit foi criado**; código e trabalho anterior permanecem na worktree atual. É necessário executar os comandos de commit em uma sessão com acesso de escrita ao Git real. Não foi feita cópia alternativa do repositório para contornar essa restrição.

As dependências npm estavam ausentes; instalação offline não encontrou cache e a tentativa pela rede foi interrompida. Foram usadas cópias das dependências locais existentes na VPS, sem alterar seus diretórios de origem. Logs disponíveis em `artifacts/beta-validation/` (arquivos .log são ignorados pelo Git).

## Reprodução em sessão com permissões adequadas

```sh
. /opt/horizon-mobile-app/android-env.sh
npm ci
npm run check
npm run check:styles
npm test
node --test tests/sector-api.test.mjs tests/sector-management.test.mjs
python3 scripts/android-development-check.py --lint
gradle -p android --no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx1536m lintRelease assembleRelease
python3 scripts/build-production-apk.py
python3 scripts/android-development-check.py --apk /opt/ronda-pro-build-2.2.5/Ronda-Pro-2.2.5-Beta.apk --package br.com.horizon.maxvel.production
RP_QA_APK=/opt/ronda-pro-build-2.2.5/Ronda-Pro-2.2.5-Beta.apk /opt/horizon-work-runtime/venv/bin/python scripts/android-parity-check.py
RP_QA_APK=/opt/ronda-pro-build-2.2.5/Ronda-Pro-2.2.5-Beta.apk /opt/horizon-work-runtime/venv/bin/python scripts/window-theme-check.py
RP_PLAYWRIGHT_MODULE=/opt/ronda-pro-real-20261031/node_modules/playwright-core/index.mjs RP_CHROME_BIN=/opt/horizon-work-runtime/browsers/chromium-1248/chrome-linux64/chrome RP_QA_APK=/opt/ronda-pro-build-2.2.5/Ronda-Pro-2.2.5-Beta.apk node scripts/mobile-search-chat-check.mjs
```

Os três cenários antigos de UI foram adaptados para fechar o tutorial de primeiro acesso antes das interações de regressão. Foi criado `scripts/beta-management-check.mjs` para percorrer onboarding (próximo/anterior/fechar/Escape/persistência entre entradas), criar/renomear/desativar/reativar setor e verificar larguras 360/412/873 px. A tentativa de execução foi bloqueada em `listen EPERM`, registrada em `artifacts/beta-validation/management-ui.log`; sintaxe conferida. Esses cenários continuam sem aprovação visual. Não iniciar emulador sem nova instrução do proprietário.

Para executar o cenário novo em sessão com sockets liberados:

```sh
RP_PLAYWRIGHT_MODULE=/opt/ronda-pro-real-20261031/node_modules/playwright-core/index.mjs RP_CHROME_BIN=/opt/horizon-work-runtime/browsers/chromium-1248/chrome-linux64/chrome node scripts/beta-management-check.mjs
```

## Artefato final conferido

- Caminho: `/opt/ronda-pro-beta-20261101/artifacts/beta-build/Ronda-Pro-2.2.5-Beta.apk`
- Pacote: `br.com.horizon.maxvel.production`
- Versão: `2.2.5-beta`, versionCode `19`
- Tamanho: 621398 bytes
- SHA-256: `9e66389dfdb259eea9ffb7341d563049ccfc3f0256de05dd74a823dccf15bb88`
- Assinatura verificada; certificado comparado com o APK 2.2.4 e idêntico. Relatório: `artifacts/beta-artifact-audit.json`.
- Fonte embarcada novamente comparada após o último build: 79 arquivos, zero diferenças.

As novas APIs de gestão/onboarding exigem o backend desta branch em um ambiente de teste autorizado. O APK mantém a configuração de conexão existente; nenhuma API de produção foi atualizada nesta entrega. A presença do APK assinado não implica que essas APIs estejam disponíveis no servidor atualmente publicado.
