# Autorizações do proprietário

Autorização permanente registrada em 18/10/2026: o proprietário permite publicar
(push) branches de trabalho no GitHub para revisão e testes, sem pedir nova
confirmação a cada publicação. Pedido original: “Sempre pode publicar branch”.

- Trabalhar em branches separadas e conferir o conteúdo antes do push.
- Não mesclar nem enviar alterações diretamente à principal (`main`/`master`)
  sem autorização específica do proprietário.
- Publicar uma branch não autoriza alterar produção, configurar deploy nem
  excluir branches ou dados.
- Verificar a referência remota antes de informar que a branch está disponível.

Esta autorização não dispensa as permissões técnicas das ferramentas.

## Regressões Android e mobile

Ao alterar Android, mapas, autenticação ou UI, consultar docs/REVISAO-UI-ANDROID-2.2.4.md e a revisão 2.2.3 para busca/autenticação. Executar o SDK/Lint/auditoria por scripts/android-development-check.py e o cenário de UI scripts/mobile-search-chat-check.mjs com runtime Playwright explícito. Preservar credenciais; não refutar erro em telefone com teste de API ou Chromium. Emulador cancelado: não iniciar sem nova instrução.

Na revisão de tema/Android, executar também scripts/android-parity-check.py e scripts/window-theme-check.py no Python Playwright da VPS. Comparar assets do APK, fonte canônica, camadas clicáveis, estados vazios e rascunho do chat. Não inventar homologação física.
