# Ronda Pro 2.2.1 — UI Android e verificação central

A conexão usa uma linha Android de 22 dp acima da WebView, respeitando as barras do sistema. A altura útil do mapa e dos modais é reduzida pela estrutura nativa; o indicador não cobre os comandos. Áreas de toque principais ampliadas e fechamento de diálogo por seta.

## Regra da equipe
Administração → Configurações → Verificação dos pontos, disponível nas duas entradas web. GPS com permanência padrão de 30 segundos, QR Code por ponto ou GPS + QR. A regra fica no SQLite da VPS, é lida no login, sincronizada a cada 15 segundos e reconferida antes de iniciar. A ronda em andamento conserva sua regra inicial. Offline usa a última regra efetivamente recebida.

O QR é gerado para a rota e coordenadas do ponto cadastrado. Administração/COI autorizado geram as etiquetas. O leitor analisa frames da câmera no aparelho com jsQR incluído no pacote; a central valida a conta, a rota, o ponto e a ordem. A fila nativa mantém leituras offline para confirmação posterior. Digitação manual de QR de demonstração não é oferecida na operação. O modo Cenário e sua inicialização são bloqueados na publicação operacional.

Endereços selecionados e links de retorno usam as coordenadas reais da rota; removida a orientação fixa para uma base que podia não corresponder ao percurso cadastrado. O GPS continua vindo dos provedores do próprio Android; não foi incluído GPS sintético na publicação.

## Evidências desta revisão
- 272 testes Node aprovados; sintaxe e parser CSS aprovados.
- Teste de persistência da regra após reinício, controle de acesso, código errado, sequência, repetição e decodificação da imagem QR gerada.
- Navegador real: telas de configuração em 360×800 e 1440×900; regra recebida pela conta de ronda no login e por polling; conclusão QR sem cronômetro GPS fabricado.
- Arquivos extraídos do APK: navegação, endereços reais via Photon, três etapas, chat, despacho e paisagem; 360/412 px, altura reduzida 458 px e 915×390. Nenhum erro de JavaScript ou overflow horizontal nos cenários percorridos.
- Photon e OSRM reais responderam para dois locais públicos de Divinópolis; não foi criada uma ronda de teste no banco de produção.
- APK br.com.horizon.maxvel.production, versionName 2.2.1-production, versionCode 15; assinatura persistente v2/v3, compatível com a versão operacional anterior.
- SHA-256 do APK: 5dda36725f3f001e24e0db1328f848898792c22a3216ce1dc8a93cc9cd12b2b5.

## Limites
A compilação e a inspeção Chromium dos arquivos embarcados não equivalem à instalação no Galaxy A53. GPS físico, câmera Android, teclado do sistema e execução em segundo plano ainda exigem homologação no aparelho. Nenhuma posição de telefone foi inventada para afirmar esse teste.

Publicação concluída em 31/10/2026 às 18:03 UTC: servidor 2.2.1 na URL operacional, API de configuração autenticada respondendo 200 e acesso sem autenticação respondendo 401. Padrão preservado em GPS com 30 segundos. Contas e rotas preservadas, sem dados de teste em produção. Os arquivos de configuração, política, estilos e service worker servidos pela URL pública conferem byte a byte com a fonte. Backup consistente do banco e compose registrado no checkpoint; a troca respeita a inicialização saudável antes da checagem pública. Implementação publicada no PR #111, sem merge na principal.
