# Rondas Pro | Reforma UI/UX do cockpit Maxvel (17/10/2026)

## Mandato
Inspeção e modernização da interface para os canais previstos:
- Android/APK de campo: mesma base e mapa para vigia e vistoriador; câmera/lanterna, pânico, localização, rotina offline e formulários mantidos. Gradle copia index.html, src e assets.
- Central Web autenticada: COI, administrador, monitoramento, histórico, chat e permissões existentes; sem substituição de rotas nem autenticação.
- Avaliação web/PWA: demonstração identificada, nunca confundida com operação real; cache inclui a nova folha.
- Marca exclusiva Maxvel: grafite, preto, vermelho institucional; alertas amarelos, ocorrências azul-claro, mensagens claras. Nenhum logotipo Horizon acrescentado.

## Diagnóstico
Auditoria mobile em Chromium 390x844, incluindo demonstração e ambiente local. A implantação publicada mostrava cockpit de vistoria anterior à branch principal. A versão do GitHub já contém botões separados, mapa compartilhado e pânico, mas ainda apresenta folha alta em estado vazio e excesso de superfícies pesadas.

## Mudanças
1. Folha de vistoria compacta quando não há destinos, preservando nós atualizáveis pelos eventos do COI.
2. Mapa como elemento principal; pânico destacado, três comunicações e lanterna preservada.
3. Padrão de contraste, foco de teclado, dimensões de toque, responsividade estreita e movimento reduzido.
4. Central: listas e painéis mais leves, colunas horizontais por tipo de evento em telas estreitas.
5. Cache do Service Worker v47 inclui a nova folha; Android inclui CSS pelo padrão assets existente.

## Critérios de aceite
- Executar npm run check e npm test.
- Inspecionar vigia/vistoriador e central em larguras móveis e tablet.
- Manter circuito e histórico por diálogo, GPS, checklist e registros separados entre demonstração e operação real.
- Não declarar APK validado nem GPS físico/WebRTC e notificações homologados sem teste em aparelhos.
- Revisão em branch e PR, sem deploy em produção.

## Escopo
Reforma apenas UI e experiência. Regras de negócio, API, banco, autenticação, GPS, checklist e trilha de auditoria preservados.
