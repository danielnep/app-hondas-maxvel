# Ronda Pro 2.2.4 — Android e tema das janelas

## Resultado
O cabeçalho aprovado mantém sua composição. A moldura Android reserva as barras do sistema, o recorte e o teclado uma única vez, sem faixa nativa “Conectado”. A WebView usa o viewport do HTML. Em Android 11+, o contêiner consome os insets tratados; Android 8–10 mantém o decor padrão.

Histórico, alertas, ocorrências, mensagens, perfil, ajuda e navegação compartilham o material grafite, tipografia, bordas, ações e espaçamentos canônicos. Janelas simples têm altura de conteúdo; listas e conversas usam a área rolável necessária. O tema conserva a marca e o cabeçalho Maxvel, o mapa claro, azul informativo e vermelho de risco.

## Causas corrigidas na origem
- A moldura anterior criava um TextView de 22 dp e repassava os insets já aplicados à WebView. Removida a faixa; propriedade dos insets definida no contêiner.
- O pânico das páginas secundárias era inserido diretamente no dashboard. Agora pertence ao mapa de fundo, isolado e inerte sob a página.
- O estado sem ocorrências não gerava conteúdo, e uma regra escondia todos os títulos de campo. Estados vazios e títulos passaram a ser explícitos.
- O chat reconstruía o campo durante a atualização periódica. Rascunho, foco e seleção são restaurados por conversa; respostas antigas não substituem a conversa atual.
- A animação de fechamento deixava um efeito com fill forwards na janela reutilizada. O término cancela o efeito após fechar, com proteção contra callback duplicado.
- A release do empacotador passa a derivar de applicationId/versionCode/versionName do Gradle.

## Verificações desta entrega
- Base: 276 testes Node aprovados. Após as alterações: 276 aprovados; sintaxe JavaScript e parser das seis fontes CSS aprovados, sem novas declarações redundantes.
- Android Lint e assembleRelease aprovados para o código nativo. APK final compilado pelo SDK local, assinatura persistente v2/v3 conferida e pacote br.com.horizon.maxvel.production, versionCode 18, versionName 2.2.4-production.
- Comparação real em Chromium de HTML e assets extraídos do APK, com banco e contas isolados: nove cenários, larguras 360/393/412/873 px, retrato/paisagem, estados vazios, histórico e compositor com altura reduzida. Geometria equivalente entre HTML/APK; nenhuma exceção JavaScript.
- As falhas de sobreposição e página vazia foram reproduzidas no APK 2.2.3 e deixaram de ocorrer na nova versão.
- No APK final, o teste aguardou uma atualização real de mensagens e confirmou rascunho, foco e seleção preservados.
- Doze janelas abertas e fechadas por interação real, nos quatro perfis de QA: material, fonte, dimensões e limites do viewport conferidos. As ações de alerta/ocorrência usam coordenadas reais do alvo para evitar a espera de estabilidade durante a animação do cockpit.
- Não houve uso de emulador, alteração de contas, rotas, credenciais ou dados de produção. GPS de QA foi explicitamente simulado apenas para acessar as telas.

## Artefato
Ronda-Pro-2.2.4-Operacional.apk — 617143 bytes.
SHA-256: 4ee554096cb46540a1f08a4d45684985b9a0569fc9a1f7a32eb7e4c5e56a1bd2.
A chave de assinatura e o applicationId foram preservados, com versionCode maior que 2.2.3.

## Reproduzir na VPS
~~~sh
. /opt/horizon-mobile-app/android-env.sh
npm run check
npm run check:styles
npm test
gradle -p android --no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx1536m lintRelease assembleRelease
python3 scripts/build-production-apk.py
/opt/horizon-work-runtime/venv/bin/python scripts/android-parity-check.py
/opt/horizon-work-runtime/venv/bin/python scripts/window-theme-check.py
~~~
Relatórios: artifacts/android-parity/parity-results.json, windows/results.json e android-final-artifact.json; capturas correspondentes no mesmo diretório.

## Limite da verificação
Chromium comprova a renderização dos assets embarcados, não a execução da moldura no telefone. Permanecem sem homologação física: barras/insets no Galaxy A53, teclado Android real, GPS, câmera, lanterna e segundo plano. Não refutar um novo relato do aparelho com os testes web.
