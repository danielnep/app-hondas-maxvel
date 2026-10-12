# App Hondas Maxvel · desenvolvido por Horizon

Aplicativo e demonstração profissional de **acompanhamento de rondas**. Interface mobile-first com identidade Horizon (branco, azul celeste e azul-prateado), supervisão e gestão; mapa cartográfico real do OpenStreetMap com rotas e instalações **fictícias** na simulação.

## Plataforma Graphite Dark · outubro de 2026

**Entrada no próprio sistema:** o endereço abre uma tela compacta de acesso com o lockup **Hondas Maxvel × Horizon**. Clique em **Entrar**, escolha Vigia/Ronda, Supervisão, Gestão ou Administração e acesse as telas funcionais da avaliação sem senha.

- **Tutorial opcional por destaque:** cortina fosca translúcida, avanço por **Entendi · continuar**, fechamento livre e comando **Rever tutorial** no topo e menu lateral. Botões discretos `?` abrem ajuda por função.
- **Graphite Dark:** grafite e cinza-escuro predominantes, azul Horizon nas ações, branco reservado principalmente ao texto; o mapa conserva cartografia legível.
- **12 vigias fictícios e 48 programações iniciais:** agenda organizada por atribuição, data e unidade, com filtros e estados. Vigia vê suas rondas na página operacional.
- **Supervisão, Gestão e Administração:** em **Rondas → Programar ronda**, selecionar vigia, rota e horário, revisar conflitos, confirmar criação, recorrência semanal diária opcional e cancelamento.
- **Programação diferente da execução:** cada execução pode ter `programId` e `watcherId`; a conclusão depende do motor existente de localização e permanência, não de um simples agendamento.
- **Fluxos testáveis:** tela de entrada, navegação por quatro perfis, mapa, ponto, desvio, justificativa, alerta e ajuda contextual. Os resultados de auditoria são acompanhados no GitHub Actions.

[Estudos de UI/UX](docs/PESQUISA-APROFUNDADA-UI-UX-DARK-CARDS-TUTORIAL.md) · [Tarefa da implementação](https://github.com/danielnep/app-hondas-maxvel/issues/21) · [Rondas programadas](https://github.com/danielnep/app-hondas-maxvel/issues/20).

**Limites da versão de avaliação:** tudo é armazenado **localmente neste navegador**. Alternar perfis sem senha é recurso de apresentação, não autenticação de produção. Não há avisos sincronizados entre aparelhos, permissões reais de colaboradores nem monitoramento remoto. GPS real requer consentimento e piloto específico. As rotas dos exemplos são fictícias.

## Experiência de produto · versão atual

A interface desta versão foi **reestruturada no código**, não produzida apenas como imagem:

- Entrada de produto com identidade **Hondas Maxvel · Horizon**, iconografia própria e mapa de ruas reais.
- Painel de operações com quatro métricas calculadas, mapa ampliado, alertas, tabela de rondas e linha do tempo.
- Entrada direta para um **cenário interativo**, especialmente quando a supervisão ainda não tem dados no navegador.
- Tela de ronda móvel com estado, próximo ponto, progresso, mapa amplo, círculos de 25 m e orientação contextual.
- Central de supervisão com sequência visual dos quatro pontos, indicadores de permanência, mapa e alertas.
- Escolha de mapa OpenStreetMap / CARTO claro, trilha percorrida e alertas geolocalizados; alternativa esquemática quando a cartografia online falhar.
- Ícone vetorial `assets/maxvel-icon.svg`, utilizado também no HTML e embarcado na WebView Android; ícone Android redesenhado.
- Testes automáticos no GitHub Actions, incluindo sintaxe, domínio e verificação visual de abertura em navegador quando disponível.

Leia [critérios e estudo de produto/UI/UX 2.0](docs/PRODUTO-UX-V2.md).

**Escopo de funcionamento:** o sistema é interativo, mas os dados de simulação permanecem locais e identificados. Rondas reais centralizadas, alertas enviados para supervisores e implantação nativa validada em campo ainda exigem backend e piloto. A apresentação não deve ser confundida com operação de produção.

## Reformulação profissional mobile-first · outubro de 2026

**Etapa 01 concluída:** pesquisa atual de UI/UX, acessibilidade, experiência mobile e diagnóstico visual de cores e ergonomia. Os problemas levantados, critérios de contraste, proposta preliminar de paleta Horizon Operacional e roadmap de sete etapas estão documentados em [Pesquisa UX Mobile 2026](docs/PESQUISA-UX-MOBILE-2026.md).

**Etapas 02 a 08 implementadas:** auditoria mobile, sistema visual Horizon Operacional, reconstrução da interface, mapa/supervisão, refinamento desktop, testes de qualidade e [simulação dentro do próprio aplicativo](docs/SIMULACAO-APP-ETAPA-08.md). A homologação de produção continua separada.

## Evolução UI/UX operacional

O aplicativo foi reformulado com foco **mobile-first** e identidade visual Horizon Operacional: navegação acessível por perfil, aviso de localização compacto, ação primária de iniciar ronda em destaque, contraste reforçado e mapa cartográfico detalhado. A supervisão agora inclui um destino **Mapa** com seleção de pontos e uma fila de alertas filtrável entre **Pendentes** e **Todos**.

O mapa usa cartografia OpenStreetMap quando disponível; a linha entre os pontos de demonstração é **ilustrativa**, não um trajeto validado pelas ruas. A simulação é **o próprio aplicativo**, sem uma apresentação paralela: o comprador alterna entre Ronda, Supervisão, Gestão e Administração na mesma janela. Eventos permanecem **locais e ilustrativos**, não remotos.

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
- **Simulação no aplicativo:** o mesmo sistema exibe o perfil Ronda, Supervisão, Gestão e Administração, com alertas e recebimentos simulados **somente neste navegador**. Sem segundo mockup vertical.
- **Cartografia:** mapa real OpenStreetMap/Leaflet com trajetos ilustrativos, pinos, áreas de 25 m e posição animada, com mapa esquemático alternativo offline. Os trechos desenhados são linhas ilustrativas, não uma rota de navegação nas vias.
- **Android nativo (fonte + APK debug):** o projeto Android Studio com serviço de localização, notificação persistente e ação de parar compilou no GitHub Actions. **Ainda exige teste físico e validação das permissões/segundo plano**, e não substitui um sistema de produção.
- **UI/UX:** ajuda contextual a todo instante, etapas didáticas, área do ronda otimizada para uso móvel, painel para supervisão/gestão. Sem gamificação.

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

Os testes unitários podem ser executados por `npm test`. A verificação visual no navegador automático foi tentada, mas o navegador do ambiente bloqueou páginas locais; validar visualmente antes de apresentar. **O projeto Android ainda não foi compilado neste ambiente nem validado em aparelho.** Dados e permissões são locais e demonstrativos, sem servidor operacional e sem notificações reais para supervisores.

## Implantação operacional ainda não entregue

Autenticação segura, sincronização real com servidor, entrega de alertas à supervisão, políticas de auditoria e retenção, infraestrutura cartográfica licenciada e testes de GPS em ambientes reais. O aviso de localização não substitui consentimentos e definições jurídicas adequadas pela empresa. Falhas técnicas não devem ser interpretadas como prova automática de conduta.

**Desenvolvido por Horizon | Daniel N. Xavier**