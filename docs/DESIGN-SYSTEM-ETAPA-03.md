# Etapa 03 · Design System Horizon Operacional
**Hondas Maxvel · versão 3.0 · 11/10/2026**

## Objetivo
Romper com aparência azul-pastel infantilizada e aumentar a percepção de autoridade, precisão e clareza operacional, sem afastar a identidade Horizon (branco, horizonte azul tecnológico e nuances azul-prateadas). O design é funcional: **primeiro estado da ronda, depois o próximo ponto, mapa, cronômetro e ação**. Supervisão recebe mapa, alertas e registros, não decoração.

## Sistema de cores semânticas
A base combina **navy profundo e grafite azulado** para estrutura, superfícies frias para leitura, azul forte para ações e ciano só para localização/destaques. Evitar inventar diversas cores concorrentes.

| Token | Cor | Uso |
|---|---|---|
| `--hx-abyss` | `#0B1D30` | frame/nav/status operacional |
| `--hx-slate` | `#102A42` | header, superfícies elevadas escuras |
| `--hx-steel` | `#163854` | detalhes operacionais e cards escuros |
| `--hx-blue` | `#0D61C3` | CTA com texto branco |
| `--hx-blue-strong` | `#176DCB` | alternativa de CTA |
| `--hx-electric` | `#147CE5` | rotas e realce visual; evitar texto branco normal |
| `--hx-cyan` | `#7ED8FF` | localização, marcador, chamada em fundo escuro |
| `--hx-ice` | `#E8F3FC` | texto alto contraste sobre fundo escuro, superfícies claras |
| `--hx-surface` | `#F7FBFF` | área de leitura e formulários |
| `--hx-line` | `#C2D5E7` | borda/sinalização suave |
| `--hx-muted` | `#93B7CC` | texto secundário em navy |
| `--hx-on-light` | `#0D2B45` | texto sobre gelo/branco |
| `--hx-success` | `#3FCCA2` | confirmação com texto/status |
| `--hx-warning` | `#FCC86E` | atenção com rótulo |
| `--hx-danger` | `#FF7880` | desvio/alerta com rótulo |
 
### Pares de contraste calculados segundo WCAG (aproximados, luminância relativa sRGB)
- **`#FFFFFF` sobre `#0D61C3`: 5,97:1**, aprovado texto comum AA.
- **`#FFFFFF` sobre `#176DCB`: 5,14:1**, aprovado AA.
- **`#FFFFFF` sobre `#147CE5`: 4,16:1**, **não** aprovado para texto comum. Usar para elementos sem texto/rota ou mudar foreground/background.
- **`#E8F3FC` sobre `#0B1D30`: 15,14:1**, aprovado.
- **`#E8F3FC` sobre `#102A42`: 13,03:1**, aprovado.
- **`#93B7CC` sobre `#102A42`: 6,90:1**, aprovado.
- **`#0D2B45` sobre `#F7FBFF`: 13,94:1**, aprovado.
- **`#FF7880` sobre `#102A42`: 5,76:1**, aprovado AA.
- **`#3FCCA2` sobre `#102A42`: 7,24:1**, aprovado.
- **`#FCC86E` sobre `#102A42`: 9,52:1**, aprovado.

Razões dizem respeito a **pares exatos**, não garantem legibilidade de todas as combinações ou componentes. Estados de botão, opacidade, efeitos translucentes e backgrounds reais exigem testes adicionais.

## Hierarquia de conteúdo e componentes

### Tipografia
- Título de página celular: 24–28 px, peso 750–850, line-height 1,1–1,2.
- Título de cartão/ação: 16–20 px, peso 700–800.
- Corpo e instruções operacionais: 14–16 px, line-height >=1,5.
- Metadados secundários: 12–13 px; tamanhos menores apenas atribuições/assinaturas sem função operacional.
- Texto de botão: >=13–14 px, peso 700. Nunca usar opacidade tão baixa que esconda o estado.
- Fontes DM Sans/Manrope já existentes, com fallback de sistema sem flash crítico.

### Interação e espaçamento
- Alvos de ações críticas de campo: **44–48 CSS px** no navegador, com alvo mínimo de toque confortável também no Android.
- Barra inferior compacta: 3 destinos no perfil Ronda, 4 destinos na Supervisão; ícone + texto sempre visíveis, não empilhamento vertical.
- Cabeçalho com avatar/caminho para perfil, privacidade e saída, acessível em 1 ou 2 gestos.
- Escala de espaço base 4/8/12/16/24/32 px; margens constantes de 14–18 px no celular; cards com radius 12–16 px, não elementos inflados.
- Uma **ação primária por contexto** (começar, concluir ponto, justificar, finalizar); ações secundárias com peso inferior.
- Estado técnico sempre visível: GPS real/simulado, precisão, sinal indisponível, acompanhamento ativo e limites.

### Layout adaptativo
- 320–430 px: coluna única, header compacto, mapa dominante, nav fixo horizontal com safe-area, CTA visível sem escavar múltiplos cartões.
- 431–900 px: coluna única ou duas colunas quando há espaço suficiente, evitando recortes artificiais.
- Acima de 900 px: sidebar e grades com mapa+alertas, limite de largura para formulários e cards de ronda.
- Não otimizar para uma altura fixa de 880 px. Revisar com teclado aberto, alto contraste, preferências de redução de movimento e zoom de texto.
- Sem animações decorativas que prejudiquem leitura/trabalho de campo.

## Modelo de estados da Ronda
- Aguardando início: card escuro com rota e CTA; mapa opcional já visível abaixo.
- Em percurso: painel de status, ponto obrigatório e localização, rota no mapa.
- No raio: timer 30 s + instrução; CTA desabilitado até válida comprovação.
- Desvio: cor de alerta **mais ícone e texto**, justificativa obrigatória, retorno ao ponto, nova permanência; jamais liberar apenas por justificar.
- Falha GPS: indicação neutra de indisponibilidade; revisão humana e nenhuma imputação automática.
- Concluído: timeline e histórico, retorno à base e estado final.

## Critérios da Etapa 03
- Tokens registrados com pares de contraste validados ✓
- Design adaptativo por perfil e comportamento documentados ✓
- Acessibilidade de alvos, estados e conteúdo explicitada ✓
- Paleta adulta/coerente com Horizon definida ✓
- Pendência separada: implementação e QA visual na **Etapa 04**, sem confundir especificação com código efetivo.

Referências de estudo: Material Design 3, Apple HIG Color, WCAG 2.2, NN/g mobile navigation. Estudo base: [Pesquisa mobile](PESQUISA-UX-MOBILE-2026.md); [Auditoria empírica](AUDITORIA-UX-MOBILE-ETAPA-02.md).
