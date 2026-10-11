# Etapa 03 · Design system Horizon Operacional

## Intenção

O App Hondas Maxvel é ferramenta **profissional** de ronda, não jogo e não catálogo de marketing. A interface deve ser confiável sob luz forte, com luvas, distração operacional e pouco tempo de decisão. Preservar DNA Horizon (horizonte azul tecnológico, branco em áreas de leitura, detalhes azul-prateados), mas estabelecer **estrutura escura corporativa** e cores mais consistentes.

## Implementação central

`assets/horizon-operacional.css` é uma camada de estilo **posterior** ao legado `styles.css`. Tokens semânticos ficam centralizados e podem ser refatorados para componentes dedicados nas etapas 04 e 05. Não há alterações no motor de regras de ronda.

| Token | Valor | Papel |
|---|---|---|
| `--hx-navy-950` | `#081C31` | fundo operacional |
| `--hx-navy-900` | `#0A1F36` | painel/nav escuro |
| `--hx-navy-850` | `#10283F` | superfície elevada escura |
| `--hx-blue-700` | `#0755B5` | ação principal |
| `--hx-blue-650` | `#0863C2` | hover |
| `--hx-cyan-400` | `#54C8F5` | localização e foco |
| `--hx-light-50` | `#F7FBFF` | cartão de leitura |
| `--hx-light-100` | `#EAF6FF` | superfícies secundárias |
| `--hx-ink` | `#142C42` | texto escuro |
| `--hx-muted` | `#506A80` | texto secundário legível |
| `--hx-on-dark` | `#E8F5FF` | texto sobre navegação escura |
| `--hx-muted-on-dark` | `#A9C7DC` | legenda sobre superfícies escuras |

### Contraste calculado (WCAG, sobre fundos indicados)

- Branco `#FFFFFF` sobre azul de ação `#0755B5`: **7,06:1**.
- Branco sobre hover `#0863C2`: **5,88:1**.
- Texto `#E8F5FF` sobre `#0A1F36`: **15,0:1**.
- Texto secundário `#A9C7DC` sobre `#10283F`: **8,51:1**.
- Texto escuro secundário `#506A80` sobre branco: **5,65:1**.
- Texto `#142C42` sobre cartão `#F7FBFF`: **13,75:1**.

Esses números são pares específicos de cores, não certificação geral de acessibilidade. Estados, ícones, controles, componentes sobrepostos, zoom, fotos, tiles e transparências precisam ser medidos individualmente.

## Sistema de componentes

1. **Header e navegação:** fundo azul-marinho, assinatura Maxvel/Horizon, hierarquia de marca contida.
2. **Botão primário:** azul saturado de contraste forte; largura total quando uma ação operacional exige atenção, com área de toque preferencial ≥48 px.
3. **Botão secundário:** borda azul-cinza e rótulo explícito; ícone nunca substitui texto em ação crítica.
4. **Cards:** branco frio sobre fundo noturno, bordas discretas, cantos moderados; superfícies escuras reservadas para estado da operação e indicadores.
5. **Estados operacionais:** azul ação/ativo, verde confirmado, âmbar atenção, vermelho alerta/desvio, sempre com texto e ícone.
6. **Mapa:** cartografia permanece clara para reconhecer ruas; overlays saturados e legenda legível, diferenciação de percurso planejado, área 25 m e posição.
7. **Modal:** fundo branco legível, foco visível, sem botão de fechar inoperante; consentimento como fluxo próprio no mobile.
8. **Ajuda contextual:** junto ao controle que a exige, com explicação expansível; não empilhar blocos redundantes acima do mapa.
9. **Barra móvel:** Etapa 04 obrigatoriamente definirá 3 destinos do ronda e 4 da supervisão e corrigirá empilhamento vertical.

## Tipografia e escala

- Corpo operacional: preferir 14–16 px; ícones não substituem termos.
- Labels críticos ≥12–13 px, elevado contraste; títulos adaptativos e curtos.
- Ação principal área mínima 44–48 CSS px; validar caixa clicável e espaçamento entre elementos.
- Foco de teclado e suporte a movimento reduzido.

## Limites e validação

Design system não altera as regras do domínio: raio 25 m; permanência 30 s; sequência; justificativa; retorno à base. As simulações e o GPS real têm regras diferentes e ficam explicitamente identificados. Nenhum CSS pode prometer funcionamento após parada forçada ou envio de alertas para servidor inexistente.

- [Auditoria que fundamenta este sistema](AUDITORIA-UX-MOBILE-ETAPA02.md).
- [Pesquisa e referências primárias](PESQUISA-UX-MOBILE-2026.md).
- [Referência WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- [Android layouts adaptativos](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).

**Ordem das próximas tarefas:** primeiro aplicar/testar design system; em seguida Etapa 04 corrigir navegação, primeiro uso e ergonomia do operador; Etapa 05 otimizar supervisão e mapas; Etapa 06 desktop; Etapa 07 validar e publicar.
