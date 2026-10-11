# Etapa 05 · Mapa e supervisão mobile-first
**Hondas Maxvel · Horizon · 11/10/2026**

## Objetivo
Aprimorar a experiência operacional do mapa e da supervisão sobre o **código real**, não sobre imagens, mantendo a tela móvel como prioridade e evitando tratar dados simulados como rastreamento remoto.

## Mudanças implementadas
1. **Mapa operacional como destino principal:** a seção `rondas` foi reconstruída para mostrar primeiro o mapa, a rota e seus pontos; a tabela de histórico fica abaixo da área principal, não antes dela.
2. **Foco contextual nos pontos:** cada ponto possui botão de seleção acessível; ao selecionar em cartografia online, o mapa centraliza e abre um popup com nome, estado, raio e permanência. Se estiver no modo esquemático, o detalhe textual continua acessível.
3. **Legenda rica e honesta:** diferencia base, ponto planejado/concluído, geocerca de 25 m, linha ilustrativa planejada e trilha de posições observadas. **Linhas retas entre pontos não são roteamento por ruas**, ainda que a cartografia real OpenStreetMap esteja disponível.
4. **Popups de local:** mostram estado planejado/ponto atual/concluído, instrução, 25 m (ou raio configurado) e 30 segundos. Conteúdo deriva de dados da rota e é escapado contra injeção HTML.
5. **Central de alertas:** acesso prioritário a Pendentes e Todos, com texto sobre a impossibilidade de entrega remota nesta versão. Notificações continuam em armazenamento local, com possibilidade de avaliação prevista pelo fluxo já existente.
6. **Responsividade e acessibilidade:** elementos de toque com área confortável, painéis adequados de 320 a 1440 px, texto de contexto, cores de aviso acompanhadas por texto e controles de foco visíveis.
7. **Documentação de GPS:** sinal impreciso ou indisponível não presume culpa. Para uma ronda real com valor de prova, requer teste de campo, consentimento, lógica de precisão e infraestrutura segura.
8. **Regressão:** novos testes `tests/map-supervision.test.mjs` e ampliação de `scripts/ux-mobile-audit.mjs` para capturar acesso ao mapa, foco em ponto, aba Pendentes e Todos, em seis larguras.

## Evidências, testes e limites
- `npm run check` e `npm test` no GitHub Actions. Verificar conclusão da rodada da versão atual antes de marcar aprovação.
- Auditoria Chromium com captura de múltiplos estados, perfis e larguras. A saída do navegador pode cair para mapa **esquemático** quando a rede do runner não disponibilizar o Leaflet ou os tiles; a alternativa faz parte do escopo.
- **Não implementado**: envio de push a celulares de supervisores, mapa de posição de vários rondas simultâneos em produção, API de roteamento de vias públicas, servidor ou mecanismos antifraude. Nenhuma dessas capacidades deve ser declarada pronta.
- **Próximo**: etapa 06, melhoria do desktop, refino do painel gerencial, consolidação das camadas CSS para manutenção, performance da cartografia.

## Garantias de integridade preservadas
- Quatro pontos em sequência (cenário ilustrativo).
- Geocerca padrão de 25 metros, permanência contínua de 30 segundos.
- Desvio bloqueia a continuidade e requer justificativa. A justificativa não dispensa o retorno ao ponto.
- Ocorrências com contexto e retorno à base.
- Localização em segundo plano via Android requer serviço nativo e permissões, não é garantida após parada forçada; site não continua rastreando após fechamento.

## Referências do projeto
- [Pesquisa UX mobile](PESQUISA-UX-MOBILE-2026.md)
- [Auditoria Etapa 02](AUDITORIA-UX-MOBILE-ETAPA-02.md)
- [Design System Etapa 03](DESIGN-SYSTEM-ETAPA-03.md)
- [Implementação Etapa 04](IMPLEMENTACAO-MOBILE-ETAPA-04.md)
- [Issue Etapa 05](https://github.com/danielnep/app-hondas-maxvel/issues/5)

**Desenvolvido por Horizon | Daniel N. Xavier**.
