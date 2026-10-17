# Reforma visual Rondas Pro | Grupo Maxvel

**Base:** main, nao PR #71. **Branch:** uiux/maxvel-clean-rework-20261017.

## Diagnostico
- Popovers Eventos e Mensagens fora da viewport (x=-95 e -50 no mobile).
- O render do perfil vistoriador abria modal automaticamente apos chegada previamente registrada.
- Janelas de perfil e navegacao com altura exagerada.
- Chat demonstrativo duplicava cabecalhos, mantinha campo pouco legivel, excesso de vazio e azul-escuro.
- Folhas CSS anteriores se sobrepunham e causavam inconsistencias.

## Implementacao
- Sistema visual Maxvel grafite/vermelho, menus planos, popovers compactos fixados na viewport.
- Diálogos de perfil/navegacao proporcionais ao conteudo, chat compacto e envio acessivel.
- Vistoriador sempre abre mapa; checklist so mediante toque.
- Estados vazios mais compactos, textos do COI normalizados.
- Web, PWA e Android WebView compartilham CSS, cache v48.

## Validacao
- npm run check, npm test e Playwright com 320/390/768 px.
- Nao validado em APK fisico nem na central autenticada.
- Branch para revisao, sem merge e sem deploy.
