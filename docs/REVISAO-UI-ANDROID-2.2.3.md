# Ronda Pro 2.2.3 · revisão operacional

A busca consultava Photon sem foco geográfico e preservava a ordem do provedor. Agora os fluxos de rotas, despacho e central compartilham busca com GPS efetivamente recebido ou referência explícita do mapa, preferência por Brasil, distância e deduplicação. Rua/Avenida são consultadas sem renomear o resultado real. Sem GPS não há posição inventada. Uma resposta antiga não substitui a consulta atual.

A lista de contatos colocava nomes na coluna de avatar da grade. A captura anterior reproduziu sobreposição em Administrador Maxvel e Operador COI; o conteúdo agora usa avatar e coluna de nome/função. A navegação de etapas saiu de sticky para o fluxo normal após o mapa. Foi removida a inversão aplicada aos próprios tiles, mantendo cartografia clara.

## Verificações

- 276 testes Node, sintaxe e parser CSS; testes adicionais por cenário conforme logs da entrega.
- Chromium com assets extraídos do APK e banco isolado: antes/depois de contatos; 360/412 px, altura 458 px, desktop 1440 px, cadastro/agendamento/gravação de rota real e login de Administração/COI/Ronda. Nenhum GPS sintético; nenhuma rota de teste no banco de produção.
- Consulta real “Avenida Pernambuco” a partir de um ponto cartográfico público em Divinópolis encontrou Rua Pernambuco próxima (482 m em linha reta), preservando seu nome e exigindo seleção. O percurso OSRM por ruas foi exibido separadamente.
- Android Lint detectou dois erros nativos: chamada de startForeground exclusiva de API 29 sem proteção para minSdk 26 e ausência de declaração opcional da câmera. Corrigidos com condição por SDK e uses-feature. Lint agora tem zero erros e quatro avisos; lintRelease e assembleRelease passaram. Não houve supressão de erros ou aumento artificial de minSdk.
- SDKs 35/36, Build Tools 35/36, Platform Tools, Command-line Tools, JDK 17 e Gradle 8.9 disponíveis na VPS. O projeto conserva AGP 8.7.3/compileSdk 35. scripts/android-development-check.py confere ferramentas, Lint e assinatura/manifesto/SHA do artefato, sem iniciar emulador.
- APK br.com.horizon.maxvel.production, versionCode 17, versionName 2.2.3-production. Assinatura persistente v2/v3. SHA-256: 9682f8c61a34a1c57dee93353d8334522bdc06f977a943f2cadfcbc898f8ee9b.

## Autenticação e limites

Contas e senhas repassadas foram preservadas. Os quatro logins passaram no endpoint de produção e no formulário do bundle; o relato de falha nos perfis fora Master no telefone continua distinto desses testes e não foi considerado refutado. Recusas na VPS agora têm referência e identificação do cliente em log, sem senha ou token. Nenhum reset de credenciais foi usado para contornar diagnóstico.

A tentativa de emulador foi interrompida por instrução do proprietário. Não há homologação de GPS/câmera físicos, teclado Android ou segundo plano nesta entrega. Build, Lint e Chromium não equivalem a esses testes. A configuração central GPS/30 s, QR e GPS+QR permanece funcional.
