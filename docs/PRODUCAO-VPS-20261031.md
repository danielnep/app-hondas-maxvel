# Ronda Pro 2.2.0 — operação na VPS

A identidade e os dados operacionais vêm exclusivamente da VPS em https://maxvel.hzsys.tech. O servidor e o APK substituem o adaptador de testes por um módulo que não autentica perfis fictícios. Links publicados no GitHub encaminham ao mesmo servidor.

As quatro contas existentes são preservadas, sem redefinição de senha. Novos cadastros usam a senha individual informada pela Administração, inclusive quando o ambiente ainda contém a configuração histórica do piloto. Nenhuma credencial operacional é incluída no código ou no APK.

Base: 505b8df2, com a correção mobile de 40e62bdd. Preservados: interface Glass, banco SQLite/outbox, GPS e bússola Android, mapa/rota offline e distinção entre perda de conexão e encerramento de expediente no COI.

O pacote Android de operação é br.com.horizon.maxvel.production, versão 2.2.0, código 14. Instala separado dos APKs de teste assinados com chave descartável. A assinatura operacional é persistente na VPS, fora do Git.

Validação: sintaxe e CSS aprovados; 270 testes automatizados aprovados; 16 cenários de navegador com Master/Admin/COI/Ronda, nas duas entradas e nas larguras 390/1440, sem erros de execução de JavaScript. Compilação com SDK Android 35 e assinatura v2/v3 verificada. GPS físico, câmera e execução em segundo plano em aparelho Android não foram homologados nesta execução.

Scripts: scripts/build-production-apk.py e scripts/production-browser-smoke.mjs. Os testes de interface usam banco temporário e contas de teste isoladas.
