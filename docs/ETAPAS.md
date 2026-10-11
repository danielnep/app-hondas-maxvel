# Método profissional de criação · App Hondas Maxvel

## Etapa 1 · Descoberta e objetivos

- Público: colaborador em ronda, supervisão, gestão e administração.
- Objetivo imediato: protótipo comercial funcional que demonstre controles, registro e observabilidade.
- Objetivo futuro: implantação segura após piloto e especificação operacional com o cliente.
- Não confundir protótipo com operação conectada, aplicativo certificado ou relatórios reais.

## Etapa 2 · Escopo e critérios de aceite

- Rota obrigatória de quatro pontos, em ordem, com raio de 25 m e permanência contínua de 30 s.
- Desvio detectado ao sair do corredor esquemático bloqueia conclusão e exige justificativa e retorno.
- Ocorrência vinculada à ronda, ponto, colaborador, horário e contexto.
- Supervisão recebe notificações **apenas na simulação deste navegador**.
- O uso de GPS no aparelho depende da permissão e de precisão suficiente e gera rota fictícia próxima ao dispositivo.
- A aplicação funciona sem autenticação remota, destinada exclusivamente à demonstração.

## Etapa 3 · Modelagem e arquitetura

- `src/domain.js`: regras puras de domínio, estrutura de sessão e registros, separadas da UI.
- `src/simulation.js`: interpolação temporal do marcador, sem violar a permanência mínima.
- `src/map.js`: interface cartográfica Leaflet, tiles OpenStreetMap e fallback esquemático.
- `src/storage.js`: armazenamento local versionado.
- `src/app.js`: navegação, estados, ajuda contextual e tratamentos de interface.
- `styles.css`: tokens, componentes e responsividade.
- `tests/`: validações determinísticas de domínio e mapas.

## Etapa 4 · UX, UI e identidade

- Preservar assinatura Horizon, interface branca, azul tecnológico e detalhes azul-prateados.
- Maxvel como contexto funcional do trabalho, linguagem objetiva e estados operacionais explícitos.
- Instruções antes de iniciar, ajuda a qualquer momento e orientações em cada etapa.
- Um comando principal por tarefa, com opções secundárias claramente separadas.
- Tela do ronda mobile-first, supervisão com organização para desktop e celular.
- Sem gamificação, pontos competitivos, rankings, prêmios ou animações sem função operacional.

## Etapa 5 · Implementação vertical

1. Criação da sessão e identificação demonstrativa.
2. Visualização da rota e mapa.
3. Deslocamento e validação de permanência.
4. Desvio, bloqueio, justificativa e retorno.
5. Ocorrências, alertas e leitura na supervisão.
6. Histórico, relatórios e transparência de dados.

## Etapa 6 · Qualidade e testes

- `npm run check` e `npm test`.
- Revisar estados vazio, aguardando, em deslocamento, dentro do raio, bloqueado, concluído e offline.
- Inspeção visual em 390, 768 e 1440 pixels.
- Checar teclado, mensagens, contrastes, área de toque, leitura e foco.
- Validar mapa online e fallback offline em navegador; não medir GPS real sem aparelhos.

## Etapa 7 · Piloto e implantação (não entregues no protótipo)

- Autenticação/autorizações verificadas no servidor, sincronização entre dispositivos, banco de dados, auditoria, segurança e LGPD.
- Testar GPS em ambientes reais, precisão, deriva, perdas de sinal, redes instáveis e bateria.
- Definir desenho de rotas sobre vias transitáveis ou dentro do perímetro, conforme mapa contratado.
- Contratar serviço de tiles adequado ao uso de produção e respeitar licenças/cartografia.
- Testar com usuários reais e avaliar métricas após uso autorizado.

## Definição de pronto para a demonstração

- Fluxo completo reproduzível no navegador, sem depender de intervenção técnica.
- Mapa real com marcações fictícias e legenda, fallback visível sem internet.
- Contagem real de 30 segundos e registro de exceções com justificativa.
- Fluxo de supervisão, relatórios e orientações coerentes.
- Limites de segurança e implantação explicitados ao cliente.

## Etapa 8 · Aviso inicial e continuidade nativa Android (implementação-fonte)

- Informar ao primeiro acesso que localização é usada durante a ronda, também com tela bloqueada no Android nativo.
- Registrar ciência com “Li e aceito”; em separado, solicitar localização via Android quando a ronda real for iniciada.
- Mostrar notificação persistente e botão “Parar acompanhamento” durante o serviço Android, sem rastreamento secreto ou coleta fora da ronda.
- Guardar amostras locais de GPS (horário, latitude, longitude, precisão), recuperar ao abrir e exigir leituras contínuas; lacunas de 15 s reiniciam o contador.
- Explicar por que não é possível prometer coleta após parada forçada e por que o navegador fechado não equivale a aplicativo Android.
- Testar e homologar em aparelhos reais antes de usar profissionalmente. Ver [LOCALIZACAO-NATIVA.md](LOCALIZACAO-NATIVA.md).