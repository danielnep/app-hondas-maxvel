# Etapa 08 · A simulação é o próprio aplicativo
**Hondas Maxvel | Horizon Operacional | 11/10/2026**

## Decisão de produto
A apresentação anterior empilhava um mockup de telefone, um painel de supervisão, um console de comandos e várias caixas de explicação. Essa estrutura gerava uma página excessivamente comprida, especialmente no mobile, e fazia o comprador enxergar uma apresentação, não o aplicativo em funcionamento.

**Decisão implementada:** demonstrar o sistema pelas **telas reais do aplicativo**, sem uma segunda interface comercial paralela. O mapa, os registros, os controles de ronda, os alertas e os estados operacionais são os mesmos componentes utilizados no modo de avaliação dos perfis.

## Jornada e arquitetura da interação

```text
Site inicial
  └─ Experimentar o aplicativo
       └─ Introdução curta e objetiva, sem GPS
            └─ APP MAXVEL (viewport; nenhuma página imensa)
                 ├─ Perfil RONDA
                 │    ├─ Mapa e próximo passo, visíveis simultaneamente
                 │    ├─ Iniciar / deslocar / chegar / contar 30 s / concluir
                 │    ├─ Desvio → justificativa → retorno → nova permanência
                 │    └─ Ocorrência e histórico
                 ├─ Perfil SUPERVISÃO
                 │    ├─ Visão Geral / Mapa / Alertas / Registros
                 │    └─ Aviso e justificativa do mesmo evento local
                 ├─ Perfil GESTÃO
                 │    ├─ Indicadores e relatórios derivados de dados locais
                 │    └─ Registros / equipe de exemplo
                 └─ Perfil ADMIN
                      ├─ Visão e configuração de exemplo
                      └─ Dados simulados e transparência
```

A alternância entre perfis **não reinicia a sessão**. Não se pede que o comprador navegue por uma apresentação externa ou por screenshots. O modo ilustrativo usa o motor de domínio real: raio de 25 m, 30 s contínuos, sequência, justificativa, retorno e análise de eventos. A navegação funciona como no aplicativo; autenticação e notificações remotas ainda dependem da produção.

## Decisões de UI/UX da pesquisa e dos projetos Horizon
- **Mobile-first / projetar pela tarefa:** o colaborador vê seu status, o mapa, o ponto atual e a ação disponível, não uma lista de recursos de venda.
- **Uma viewport, não uma página gigante:** `100dvh`, áreas internas com rolagem contextual, cabeçalho e barra de navegação estáveis, sem altura fixa de screenshot. Tablet/desktop usam áreas lado a lado.
- **Detalhamento progressivo:** instruções e pontos extras vivem em `<details>`, e o guia permanece acessível em qualquer etapa.
- **Hierarquia adulta Horizon:** navy e grafite azulado como estrutura, azul/ciano tecnológico dosados, tipografia legível, nenhuma estética infantil nem gamificação.
- **Regras visíveis no momento certo:** usuário descobre a exigência de 25 m e 30 s antes de iniciar e vê cronômetro e botão de conclusão na etapa atual.
- **Feedback de interação:** troca de perfil, marcadores animados, avisos, justificativa, fila de alertas, mapa real quando online. Preferência `prefers-reduced-motion` respeitada.
- **Navegação curta, quatro perfis:** barra contextual para alternar Ronda/Supervisão/Gestão/Administração apenas no modo ilustrativo; cada perfil mantém seu menu adequado.
- **Mapa utilizável:** OpenStreetMap com atribuição; linhas do cenário assumidamente ilustrativas e alternativa esquemática quando online estiver indisponível.
- **Privacidade e limitação transparente:** a introdução diz que não é rastreamento real; GPS real é desabilitado durante a apresentação; localização do Android nativo requer execução autorizada e notificação visível.
- **Sem gameplay:** simulação tem ações de produto, não pontuação, ranking ou mecânicas de jogo.

## Estrutura técnica entregue
- `src/app.js`: entrada direta no app, `beginSimulation`, `endSimulation`, seletor de papéis `simRoleBar`, novo workspace `phoneContent`, instrução curta e o motor existente de estados e deslocamentos.
- `assets/horizon-operacional.css`: `simulation-rolebar`, `patrol-workspace`, `patrol-map-panel`, `patrol-actions`, alturas dinâmicas, media queries para telefones baixos, contraste e focus states.
- `scripts/app-immersive-test.mjs`: teste real da jornada em 7 tamanhos, 320×600 a 1440×900, com capturas de abertura, ronda, supervisão, desvio e alertas.
- `.github/workflows/immersive.yml`: CI dedicado à experiência no navegador.
- Remoção do HTML legado da dupla apresentação comercial, evitando manutenção de uma segunda UI.

## Critérios objetivos de aceite
- Nenhuma expansão vertical da página em modo simulador nos tamanhos ensaiados. Painéis individuais podem rolar quando o conteúdo exige.
- Sem `phone-frame` ou `presentation-main` renderizados; aplicativo real com quatro perfis.
- Mapa presente no fluxo mobile, ação principal reconhecível sem precisar encontrar um botão no fim da página.
- Alterar perfil e voltar mantém a mesma ronda/alerta; o evento aparece na Supervisão.
- Os botões têm resposta real dentro do cenário; não há controles decorativos/inertes no caminho principal.
- No celular baixo, a região do mapa e do botão de ação deve continuar útil.
- Não confundir demonstrativo com rastreamento de produção, nem afirmar envio real de alerta a supervisores.
- Validar build Android, WCAG automatizada, regressão de domínio e Playwright; teste físico ainda exige piloto.

## Limites
A compilação Android e a demonstração no navegador **não homologam rastreamento real em segundo plano**. Sem servidor não há atualização simultânea entre aparelhos de funcionários. O quadro de troca de perfis é exclusivamente comercial, no mesmo navegador, não um sistema de permissões de produção.

**Desenvolvido por Horizon | Daniel N. Xavier**.
