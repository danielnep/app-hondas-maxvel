# Rondas Pro · Grupo Maxvel

## Ampliação demonstrativa · GPS, QR, pânico, offline e relatórios (13/10/2026)

**Acessos da demonstração web:** **Vigia / Operação de Ronda** (execução e histórico próprio), **Operadores / Central de Monitoramento** (rondas, alertas, ocorrências e equipe) e **Administrativo** (indicadores, gestão, relatórios e configurações). O ambiente é de avaliação; a central autenticada com dados compartilhados requer infraestrutura operacional configurada.

Uma ramificação de trabalho acrescenta ao Rondas Pro: botão de pânico sempre acessível ao vigia, alerta local com vigia e horário, acesso ao discador 190 mediante confirmação, escolha administrativa **GPS / QR / GPS + QR**, registro de ocorrências com foto, áudio e vídeo, armazenamento offline em **IndexedDB** e rotas/esquemas disponíveis localmente, **relatório inteligente** e exportação configurável **HTML, CSV, JSON**, exclusivamente na página **Relatórios** da Administração.

A identidade Maxvel e as regras antigas de GPS (raio 25 m, permanência 30 s, sequência) são preservadas quando o modo configurado é GPS. O Android já tinha SQLite/serviço de localização nativo; a Web usa cache das páginas após primeira conexão. **A demonstração não envia notificações ou dados entre aparelhos, não possui servidor multiusuário e não faz sincronização remota real.** Os registros offline ficam em fila local aguardando integração. Salvar o mapa significa salvar geometria/esquema SVG, não cartografia de ruas offline. O GPS em segundo plano e os recursos multimídia variam conforme permissões e dispositivo.

[Guia operacional completo e limites verificáveis](docs/GUIA-COMPLETO-OPERACAO-E-OFFLINE.md).


Aplicativo e demonstração profissional de **acompanhamento de rondas**. Interface mobile-first com logo original do Grupo Maxvel, fundo preto, superfícies cinza muito escuro e detalhes celeste/violeta, supervisão e gestão; mapa cartográfico real do OpenStreetMap com rotas e instalações **fictícias** na simulação.

## Hospedagem vigente: Render (OnRender)

- **App público:** https://rondas-pro-maxvel.onrender.com/ (serviço Render `rondas-pro-maxvel`).
- **Repositório:** `danielnep/app-hondas-maxvel`, branch `main`, com código-fonte dos três perfis. A `main` pode avançar antes de um novo deploy, portanto não presuma que o commit mais novo já está no servidor.
- **Snapshot histórico de um deploy LIVE anterior:** branch [`render-live-3-perfis-20261014`](../../tree/render-live-3-perfis-20261014), commit `e7b0d402`.
- **Snapshot do deploy LIVE verificado mais recentemente em 14/10/2026:** branch [`render-live-19176c3b-20261014`](../../tree/render-live-19176c3b-20261014), commit `19176c3b69a559d32495feaea52a81e93f36bc39`. São referências históricas do código por commit; a publicação pode avançar automaticamente sem alterar essas branches.
- **Serviço:** Node.js, comando de compilação `npm install && npm run check && npm test`, inicialização `npm start`, porta definida pela variável `PORT` e endpoint `/health` disponibilizado pelo servidor. O serviço Render não possui healthcheck configurado neste momento.

A **demonstração** usa registros locais do navegador; interface publicada não implica autenticação real, banco persistente ou sincronização entre dispositivos. O diretório do GitHub contém o projeto e suas branches, não uma segunda hospedagem automaticamente sincronizada. Dados locais de domínios diferentes não são transferidos entre eles.

## Refinamento visual · 13/10/2026

A identidade pública é exclusivamente **Grupo Maxvel**. A versão 07 suaviza o preto absoluto em grafite intermediário e torna topo, rodapé móvel, listas e indicadores mais compactos sem alterar o domínio, GPS, permanência e simulações. O repositório mantém camadas técnicas antigas por compatibilidade, mas o aplicativo apresenta somente Maxvel. **Ainda não há chatbot integrado neste aplicativo**: nenhum recurso de Copiloto ou de planilhas foi migrado de outro projeto.

## Revisão 10 · referência Horizon e movimento

Referência visual: [Horizon — Como trabalhamos](https://horizonsolucoes.com/#metodo), inspecionada em 13/10/2026. Exo 2 no corpo e Rajdhani nos títulos e na marca; base preto/branco, azul mais nítido, violeta profundo e vermelho Maxvel nos avisos. As superfícies substituem as bordas repetidas.

O topo distribui **Rondas Pro | Grupo + logo original Maxvel** em duas regiões alinhadas ao centro. Entradas usam fade e deslocamento, painéis têm elasticidade, botões respondem ao toque, e os indicadores pulsam suavemente. No celular, arrastar o título de uma janela para baixo acompanha o dedo; o painel volta elasticamente ou fecha após um arrasto maior. Todos os botões de fechar continuam disponíveis. A preferência de movimento reduzido desativa as animações. O módulo `src/ui-motion.js` não altera GPS, tempo de permanência, dados ou regras da ronda.

## Revisão 09 · preto, celeste e cantos suaves

A revisão visual de 13/10/2026 substitui os controles totalmente retos e os detalhes vermelhos da interface por cantos discretos (6 px nos controles, 8 px nos painéis e 10 px nos diálogos). O fundo é preto; cabeçalho, campos e superfícies usam cinzas muito escuros. Azul celeste luminoso identifica ações, foco e seleção; o roxo aparece de forma sutil no degradê das ações principais e no nome Pro. A imagem original da Maxvel permanece intacta. Mapas, menus, perfis e regras da ronda mantêm seu comportamento.

## Revisão 08 · marca real e consistência visual

A interface utiliza a imagem original fornecida da Maxvel ao lado do nome **Rondas Pro**. A navegação móvel foi transferida para o menu no cabeçalho, sem barra inferior. Painéis, botões, campos e janelas têm cantos retos; apenas as geocercas e os marcadores geográficos mantêm círculos. Um único CSS compilado (`assets/ronda-pro.css`) preserva a estrutura dos componentes e aplica uma paleta grafite/vermelho. Execute `python3 scripts/build-styles.py` ao alterar a estrutura, o tema ou o layout.

O mapa começa com OpenStreetMap e aplica a aparência escura aos tiles. A fonte anterior podia devolver uma imagem HTTP 200 contendo “API KEY REQUIRED”, sem disparar `tileerror`. Falhas reais de carregamento mantêm a rota esquemática identificada.

Referências de fluxo e telas consultadas: [TrackTik](https://play.google.com/store/apps/details?id=com.staffr.app), [GuardTek — mapa de rondas](https://support.trackforce.com/hc/en-us/articles/12832847712151-Viewing-Tour-Maps-Real-Time), [QR-Patrol — tela operacional](https://learning.qrpatrol.com/docs/perform-a-patrol-as-a-guard-through-the-mobile-app/) e [Mobitraxx — controle GEO](https://suporte.mobitraxx.com.br/informacao-controle). A identidade Maxvel e as regras aprovadas do projeto prevalecem sobre essas referências.

## Revisão de clareza operacional · 12/10/2026

A experiência do vigia foi simplificada para **mapa em tela inteira + estado e próxima ação**. Agenda, ferramentas de simulação, instruções e registros permanecem em **Mais opções**, com navegação persistente para Ocorrências e Histórico. Em demonstração, o antigo seletor horizontal com quatro perfis foi substituído por **Áreas** no cabeçalho; a escolha continua disponível sem sacrificar o mapa.

A Administração concentra supervisão, gestão e acesso ao mapa. O painel móvel de Alertas inclui acesso à lista de ocorrências. A Administração pode demonstrar atribuição, revisão, resolução e histórico de providências **apenas neste navegador**.

A função R4 de verificação de ponto apresenta **cinco etapas simuladas** (frente, direita, trás, esquerda e selfie) e **giro simulado**, sem acessar câmera ou sensor nem criar imagens. É uma apresentação do fluxo, não comprovação real. O ponto continua usando as regras existentes de GPS/25 m/30 s; conclusão não passa a exigir falsas evidências. Câmera e sensor reais, upload privado, validação servidor e notificação entre aparelhos continuam na implantação pendente.

[Plano R4 de evidências](docs/R4-EVIDENCIAS-CONTRATO-E-ETAPAS.md) · [Contratos de backend R6, não implantados](docs/R6-BACKEND-CONTRATOS-E-DEPENDENCIAS.md) · [Tarefa R0–R7](https://github.com/danielnep/app-hondas-maxvel/issues/24).

## Plataforma Graphite Dark · outubro de 2026

**Entrada no próprio sistema:** o endereço abre uma tela compacta de acesso com o marca exclusiva **Grupo Maxvel**. Clique em **Entrar**, escolha **Operação de Ronda** ou **Administração** e acesse as telas funcionais da avaliação sem senha.

- **Tutorial opcional por destaque:** cortina fosca translúcida, avanço por **Entendi · continuar**, fechamento livre e comando **Rever tutorial** no topo e menu lateral. Botões discretos `?` abrem ajuda por função.
- **Graphite Dark:** grafite e cinza-escuro predominantes, vermelho Maxvel nas ações, branco reservado principalmente ao texto; o mapa conserva cartografia legível.
- **12 vigias fictícios e 48 programações iniciais:** agenda organizada por atribuição, data e unidade, com busca, filtros combinados, paginação e estados. Vigia vê suas rondas na página operacional.
- **Administração:** em **Rondas → Programar ronda**, selecionar vigia, rota e horário, validar conflitos, confirmar criação, recorrência diária por até 7 dias, cancelamento e **reprogramação com histórico local de mudanças**.
- **Programação diferente da execução:** cada execução pode ter `programId` e `watcherId`; a conclusão depende do motor existente de localização e permanência, não de um simples agendamento.
- **Fluxos testáveis:** tela de entrada, navegação por quatro perfis, mapa, ponto, desvio, justificativa, alerta e ajuda contextual. Os resultados de auditoria são acompanhados no GitHub Actions.

[Estudos de UI/UX](docs/PESQUISA-APROFUNDADA-UI-UX-DARK-CARDS-TUTORIAL.md) · [Execução Graphite Dark E1–E6](docs/EXECUCAO-GRAPHITE-DARK-E1-E6.md) · [Reformulação pelos manuais E0–E10](docs/REFORMULACAO-MANUAIS-E0-E10.md) · [Tarefa atual](https://github.com/danielnep/app-hondas-maxvel/issues/22).

**Limites da versão de avaliação:** tudo é armazenado **localmente neste navegador**. Alternar perfis sem senha é recurso de apresentação, não autenticação de produção. Não há avisos sincronizados entre aparelhos, permissões reais de colaboradores nem monitoramento remoto. GPS real requer consentimento e piloto específico. As rotas dos exemplos são fictícias.

## Experiência de produto · versão atual

A interface desta versão foi **reestruturada no código**, não produzida apenas como imagem:

- Entrada de produto com identidade **Grupo Maxvel**, iconografia própria e mapa de ruas reais.
- Painel de operações com quatro métricas calculadas, mapa ampliado, alertas, tabela de rondas e linha do tempo.
- Entrada no **próprio aplicativo**, com escolha de perfil e dados ilustrativos identificados, sem apresentação comercial paralela.
- Tela de ronda móvel com estado, próximo ponto, progresso, mapa amplo, círculos de 25 m e orientação contextual.
- Central de supervisão com sequência visual dos quatro pontos, indicadores de permanência, mapa e alertas.
- Escolha de mapa OpenStreetMap / CARTO claro, trilha percorrida e alertas geolocalizados; alternativa esquemática quando a cartografia online falhar.
- Ícone vetorial `assets/maxvel-icon.svg`, utilizado também no HTML e embarcado na WebView Android; ícone Android redesenhado.
- Testes automáticos no GitHub Actions, incluindo sintaxe, domínio e verificação visual de abertura em navegador quando disponível.

Leia [critérios e estudo de produto/UI/UX 2.0](docs/PRODUTO-UX-V2.md).

**Escopo de funcionamento:** o sistema é interativo, mas os dados de simulação permanecem locais e identificados. Rondas reais centralizadas, alertas enviados para supervisores e implantação nativa validada em campo ainda exigem backend e piloto. A apresentação não deve ser confundida com operação de produção.

## Reformulação profissional mobile-first · outubro de 2026

**Etapa 01 concluída:** pesquisa atual de UI/UX, acessibilidade, experiência mobile e diagnóstico visual de cores e ergonomia. Os problemas levantados, critérios de contraste, proposta preliminar de paleta anterior (substituída pela identidade Maxvel) e roadmap de sete etapas estão documentados em [Pesquisa UX Mobile 2026](docs/PESQUISA-UX-MOBILE-2026.md).

**Etapas 02 a 08 implementadas:** auditoria mobile, sistema visual anterior, posteriormente substituído pelo padrão Maxvel, reconstrução da interface, mapa/supervisão, refinamento desktop, testes de qualidade e [simulação dentro do próprio aplicativo](docs/SIMULACAO-APP-ETAPA-08.md). A homologação de produção continua separada.

## Evolução UI/UX operacional

O aplicativo foi reformulado com foco **mobile-first** e identidade operacional Maxvel: navegação acessível por perfil, aviso de localização compacto, ação primária de iniciar ronda em destaque, contraste reforçado e mapa cartográfico detalhado. A supervisão agora inclui um destino **Mapa** com seleção de pontos e uma fila de alertas filtrável entre **Pendentes** e **Todos**.

O mapa usa cartografia OpenStreetMap quando disponível; a linha entre os pontos de demonstração é **ilustrativa**, não um trajeto validado pelas ruas. A simulação é **o próprio aplicativo**, sem uma apresentação paralela: o comprador alterna apenas entre Operação de Ronda e Administração na mesma janela. Eventos permanecem **locais e ilustrativos**, não remotos.

Documentos de execução:
- [Pesquisa e diagnóstico mobile](docs/PESQUISA-UX-MOBILE-2026.md)
- [Auditoria de UX (Etapa 02)](docs/AUDITORIA-UX-MOBILE-ETAPA-02.md)
- [Design System (Etapa 03)](docs/DESIGN-SYSTEM-ETAPA-03.md)
- [Implementação mobile (Etapa 04)](docs/IMPLEMENTACAO-MOBILE-ETAPA-04.md)
- [Mapa e supervisão (Etapa 05)](docs/MAPA-SUPERVISAO-ETAPA-05.md)
- [Simulação dentro do próprio app (Etapa 08)](docs/SIMULACAO-APP-ETAPA-08.md)

A demonstração não substitui validação em dispositivos reais, autenticação, infraestrutura de supervisão ou piloto de GPS nativo.

## O que este projeto entrega

- **Primeira abertura:** aviso claro de uso de localização durante a ronda, inclusive segundo plano no Android nativo. Botão **“Li e aceito · Continuar”** só ativa com marcação de ciência. Permissão do sistema é pedida separadamente.
- **Experiência de ronda:** 4 pontos em sequência, raio de **25 m**, **30 segundos contínuos** com sinal confiável, retorno obrigatório à base.
- **Desvios:** bloqueio de avanço, solicitação de justificativa, retorno ao ponto e repetição da permanência; ocorrência vinculada ao contexto.
- **Simulação no aplicativo:** a mesma interface oferece três acessos: **Vigia (Operação de Ronda)**, **Operadores (Central de Monitoramento)** e **Administrativo**, com alertas e recebimentos simulados **somente neste navegador**. As permissões reais da central operacional autenticada dependem do backend e da configuração de produção.
- **Cartografia:** mapa real OpenStreetMap/Leaflet com trajetos ilustrativos, pinos, áreas de 25 m e posição animada, com mapa esquemático alternativo offline. Os trechos desenhados são linhas ilustrativas, não uma rota de navegação nas vias.
- **Android nativo (fonte + APK debug):** o projeto Android Studio com serviço de localização, notificação persistente e ação de parar compilou no GitHub Actions. **Ainda exige teste físico e validação das permissões/segundo plano**, e não substitui um sistema de produção.
- **UI/UX:** ajuda contextual a todo instante, etapas didáticas, área do ronda otimizada para uso móvel, painel de supervisão e gestão dentro da Administração. Sem gamificação.

## Como executar a demonstração web

```bash
npm run check
npm test
npm start
```

Abra `http://localhost:8000`. Para localização real, use HTTPS ou localhost e conceda a permissão do aparelho. O OpenStreetMap depende de acesso à internet; caso contrário, o mapa alternativo esquemático aparece. Um APK **debug** é gerado no [workflow Android de teste](https://github.com/danielnep/app-hondas-maxvel/actions/workflows/android-build.yml). É uma compilação de avaliação, não uma versão publicada em loja ou homologada em campo.

## Aplicativo Android

Abra a pasta `android/` no **Android Studio**. O build incorpora os mesmos arquivos web (sem duplicação). É necessário JDK 17, SDK 35 e sincronização Gradle. Leia [localização nativa e limitações](docs/LOCALIZACAO-NATIVA.md). Não prometer continuidade após **parada forçada** ou bloqueios impostos pelo sistema operacional. Na web, a coleta não continua após fechar o navegador.

## Arquitetura e decisões

- `src/domain.js`: regras de rota, localização, permanência e desvios.
- `src/app.js`: telas, fluxos, consentimento e apresentação.
- `src/consent.js`: versão do aviso e ciência local.
- `src/map.js`: Leaflet/OpenStreetMap com fallback.
- `src/simulation.js`: movimento progressivo animado.
- `src/storage.js`: persistência local e histórico de demonstração.
- `android/`: Activity WebView segura em origem local HTTPS, serviço de localização, banco de amostras.
- `docs/`: etapas de desenvolvimento, estudo UI/UX, roteiro de apresentação e requisitos Android.
- `tests/`: testes automatizados do domínio, simulação, mapa e ciência inicial.

## Estado de qualidade

Os testes unitários podem ser executados por `npm test`. Os fluxos de navegador automatizado, auditorias de acessibilidade e responsividade e compilação Android debug são executados nos [workflows do GitHub Actions](https://github.com/danielnep/app-hondas-maxvel/actions). **O APK debug não equivale a teste físico do GPS, TalkBack nem homologação para produção.** Dados e permissões são locais e demonstrativos, sem servidor operacional e sem notificações reais para supervisores.

## Implantação operacional ainda não entregue

Autenticação segura, sincronização real com servidor, entrega de alertas à supervisão, políticas de auditoria e retenção, infraestrutura cartográfica licenciada e testes de GPS em ambientes reais. O aviso de localização não substitui consentimentos e definições jurídicas adequadas pela empresa. Falhas técnicas não devem ser interpretadas como prova automática de conduta.

**Protótipo técnico de demonstração para o Grupo Maxvel.**
