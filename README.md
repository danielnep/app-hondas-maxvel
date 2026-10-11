# App Hondas Maxvel · desenvolvido por Horizon

Aplicativo e demonstração profissional de **acompanhamento de rondas**. Interface mobile-first com identidade Horizon (branco, azul celeste e azul-prateado), supervisão e gestão; mapa cartográfico real do OpenStreetMap com rotas e instalações **fictícias** na simulação.

## Experiência de produto · versão 2.0

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

**Etapa 02 em preparação:** [auditoria mobile por perfil e wireflow](https://github.com/danielnep/app-hondas-maxvel/issues/1). Implementações de UI/CSS serão feitas sequencialmente após a auditoria, sem prejudicar o fluxo funcional da ronda. Evitar design infantil, azul pastel em excesso e testes baseados em uma única altura de tela.

## Evolução UI/UX operacional

O aplicativo foi reformulado com foco **mobile-first** e identidade visual Horizon Operacional: navegação acessível por perfil, aviso de localização compacto, ação primária de iniciar ronda em destaque, contraste reforçado e mapa cartográfico detalhado. A supervisão agora inclui um destino **Mapa** com seleção de pontos e uma fila de alertas filtrável entre **Pendentes** e **Todos**.

O mapa usa cartografia OpenStreetMap quando disponível; a linha entre os pontos de demonstração é **ilustrativa**, não um trajeto validado pelas ruas. A apresentação comercial compartilha os componentes operacionais, mas os eventos continuam locais e simulados.

Documentos de execução:
- [Pesquisa e diagnóstico mobile](docs/PESQUISA-UX-MOBILE-2026.md)
- [Auditoria de UX (Etapa 02)](docs/AUDITORIA-UX-MOBILE-ETAPA-02.md)
- [Design System (Etapa 03)](docs/DESIGN-SYSTEM-ETAPA-03.md)
- [Implementação mobile (Etapa 04)](docs/IMPLEMENTACAO-MOBILE-ETAPA-04.md)
- [Mapa e supervisão (Etapa 05)](docs/MAPA-SUPERVISAO-ETAPA-05.md)

A demonstração não substitui validação em dispositivos reais, autenticação, infraestrutura de supervisão ou piloto de GPS nativo.

## O que este projeto entrega

- **Primeira abertura:** aviso claro de uso de localização durante a ronda, inclusive segundo plano no Android nativo. Botão **“Li e aceito · Continuar”** só ativa com marcação de ciência. Permissão do sistema é pedida separadamente.
- **Experiência de ronda:** 4 pontos em sequência, raio de **25 m**, **30 segundos contínuos** com sinal confiável, retorno obrigatório à base.
- **Desvios:** bloqueio de avanço, solicitação de justificativa, retorno ao ponto e repetição da permanência; ocorrência vinculada ao contexto.
- **Supervisão demonstrativa:** celular e painel em uma apresentação guiada, com alertas e recebimentos simulados **somente neste navegador**.
- **Cartografia:** mapa real OpenStreetMap/Leaflet com trajetos ilustrativos, pinos, áreas de 25 m e posição animada, com mapa esquemático alternativo offline. Os trechos desenhados são linhas ilustrativas, não uma rota de navegação nas vias.
- **Android nativo (fonte):** projeto Android Studio com serviço de localização tipo `location`, notificação persistente e ação de parar, armazenamento SQLite privado e recuperação de amostras ao reabrir. **Ainda requer compilação e teste real de dispositivos.**
- **UI/UX:** ajuda contextual a todo instante, etapas didáticas, área do ronda otimizada para uso móvel, painel para supervisão/gestão. Sem gamificação.

## Como executar a demonstração web

```bash
npm run check
npm test
npm start
```

Abra `http://localhost:8000`. Para localização real, use HTTPS ou localhost e conceda a permissão do aparelho. O OpenStreetMap depende de acesso à internet; caso contrário, o mapa alternativo esquemático aparece. Nenhum aplicativo Android compilado (APK) é fornecido nesta entrega.

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