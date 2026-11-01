# DESIGN | Rondas Pro · Grupo Maxvel

## Tema vigente — 01/11/2026
A fonte canônica é assets/theme.css. Superfícies de janela usam --rp-window-surface, --rp-window-border, --rp-window-radius e --rp-window-gap. Grafite escuro quase opaco, raio de 16 px, margens de 16 px, texto claro em Inter/Segoe UI/Arial e azul para ações. O vermelho identifica bordas discretas, pânico e risco. Não criar uma folha final para anular estilos antigos.
Preservar a composição e altura do cabeçalho aprovado. No Android, barras e teclado são responsabilidade do contêiner nativo, consumidos antes da WebView, sem faixa adicional. Janelas usam altura de conteúdo e limites de viewport; chat conserva área operacional e reduz seu cabeçalho em pouca altura. Fundo de páginas secundárias deve ser inerte. Consultar docs/REVISAO-UI-ANDROID-2.2.4.md para validação e limites.

## Identidade preservada
Este é um produto do Grupo Maxvel. A identidade pública não exibe a marca Horizon. O mapa deve permanecer protagonista nos acessos Vigia e Vistoriador. O contexto de missão e a próxima ação são o restante do primeiro plano. Vermelho de alto impacto é reservado ao pânico e a riscos/alertas; não deve pintar toda a interface.

## Direção visual — revisão 17/10/2026
- Canvas: preto/carvão profundo, sem grandes áreas brancas.
- Superfície operacional: grafite `#191B20`; elevação `#22252B`; borda neutra `#414852`.
- Texto principal: `#F5F5F7`; azul/ciano informacional `#43B3EC` para GPS, localização e navegação.
- Ação segura principal: `#EDF0F5` com texto escuro; pânico: `#ED1748`.
- Valores nesta seção são tokens da revisão operacional, **não** afirmação sobre hexadecimal oficial da marca Maxvel. Logo original e sua proporção não podem ser recriados.
- Tipografia segue a folha existente; eliminar aparência de controles HTML nativos exibidos sem composição.

## Componentes e comportamento invariantes
- Vigia/Vistoriador: mesmo cockpit espacial, mesmas posições relativas de alerta, ocorrência, chat, lanterna e pânico; trajetos e checklists diferentes conforme papel.
- Próximo destino e CTA legíveis; Google Maps + Waze apresentados juntos, **abaixo** do CTA; nome e coordenadas reais não podem ser inventados.
- Modal explicativo, confirmação e pânico: altura de conteúdo, sem ocupar 100dvh por padrão. Vistoria longa usa seção rolável com cabeçalho e controles sempre visíveis, sem CTA cortado.
- Evidências: duas ações explícitas, selfie frontal e foto traseira; fluxo abre câmera com `getUserMedia`, prévia real e captura em ato; permissão negada precisa de erro útil. Não substituir essa interface por botão de galeria. Validação completa ainda exige Android real.
- Chat: área de mensagens com cabeçalho/rodapé coerentes; compositor em uma linha e botão de envio com ícone; preservar transmissão local demo separada do chat autenticado do COI.
- Não trocar `COI` por `COE`. Evitar cards repetidos e controles decorativos.

## Origem, governança e verificação
Atualização decorrente de prints anotados em 17/10/2026. Referências alternativas do Gemini servem para equilíbrio de hierarquia/cor, não aprovação literal. O código atual pode conter estilos legados por compatibilidade, mas novos estilos devem reutilizar a última camada compartilhada e não proliferar folhas concorrentes.

Antes de aprovar uma revisão, percorrer no mínimo: vigia, vistoriador, localização, percurso, checklist, fotos/selfie, chat, pânico, histórico e eventos. Comparar em 360×800 e 393×852; fotografias em câmera e persistência remota exigem teste de campo em aparelho Android. Testes de fonte e CI não equivalem a validação visual.