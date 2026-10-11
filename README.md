# App Hondas Maxvel · desenvolvido por Horizon

Aplicativo e demonstração profissional de **acompanhamento de rondas**. Interface mobile-first com identidade Horizon (branco, azul celeste e azul-prateado), supervisão e gestão; mapa cartográfico real do OpenStreetMap com rotas e instalações **fictícias** na simulação.

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