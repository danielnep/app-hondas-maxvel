# Etapa 07 · Segurança, privacidade e validação operacional
**Hondas Maxvel · Horizon · Relatório técnico de riscos e portas de aprovação**
**Situação atual: DEMONSTRAÇÃO FUNCIONAL, NÃO HOMOLOGADA PARA PRODUÇÃO**

## 1. O que existe efetivamente
- Aplicação HTML/CSS/JS mobile-first, com quatro perfis demonstrativos, mapa de ruas real quando online, quatro pontos do cenário, geocercas de 25 m e permanência de 30 s contínuos, alertas e justificativas.
- O site pode solicitar localização durante o uso, mediante consentimento e permissão do navegador. Não mantém rastreamento depois do fechamento da página.
- Código nativo Android com WebView, serviço de localização foreground com notificação persistente e botão **Parar acompanhamento**. Guarda posições em banco SQLite privado do aparelho, com retenção no código limitada a até 30 dias ou 10.000 amostras (o que ocorrer primeiro, conforme limpeza na inserção).
- O projeto Android pode gerar APK de **teste** através do GitHub Actions. A compilação, quando concluída, não substitui testes reais de telas, permissões e segundo plano.
- O acompanhamento da supervisão no protótipo é **local**, sem centralização servidor, autenticação empresarial ou push remoto.

## 2. Matriz de riscos antes da produção

| Gravidade | Tema | Estado e medida necessária |
|---|---|---|
| Bloqueador | Backend e identidade | Criar autenticação forte, autorização por empresa/unidade/perfil, servidor de eventos, trilha de auditoria e proteção contra alterações de registros |
| Bloqueador | WebView JS bridge | `addJavascriptInterface` expõe métodos de localização aos scripts/frames presentes na WebView. Em produção, substituir por mensageria nativa restringida a origem confiável ou equivalente; bloquear scripts/iframes externos não confiáveis |
| Alto | CDN da biblioteca de mapa | Leaflet atualmente é carregado da CDN na web/Android. Empacotar dependência confiável, com integridade/política de conteúdo, para impedir alteração externa de JavaScript com acesso ao contexto da WebView |
| Alto | Privacidade/LGPD | Base legal e informações ao trabalhador; política de retenção, direitos de acesso, proteção de coordenadas pessoais, segurança e contrato de tratamento precisam de revisão jurídica |
| Alto | Dados locais | SQLite em armazenamento privado, mas sem política criptográfica de produção; avaliar criptografia em repouso, segurança de backup e exclusão/limpeza ao fim da relação de trabalho |
| Alto | Precisão GPS | 25 m é uma área pequena perto do erro GPS em locais fechados; calibrar algoritmos contra variação e deriva, coletar evidências proporcionais, nunca concluir culpa automaticamente |
| Alto | Serviço Android em segundo plano | Foreground service depende da versão do Android, permissões, restrições de bateria e início autorizado; não sobrevive a parada forçada nem garante continuidade universal |
| Médio | Comunicação de alertas | Alertas do protótipo são locais; criar infraestrutura real e teste ponta-a-ponta antes de anunciar notificações em aparelhos de supervisão |
| Médio | Dependência do mapa externo | OpenStreetMap/CARTO podem receber metadados de região consultada; uso de tiles deve seguir termos de provedores, com política de privacidade e fallback |
| Médio | Acessibilidade integral | Avaliar contraste de componentes reais, foco, zoom de texto, leitor de tela Android/TalkBack, rolagem com teclado, diálogos e listas; teste atual de tokens não cobre todos os pares |
| Médio | Consistência da supervisão | Auditoria só mediu estados simulados de um navegador; não demonstrou operação simultânea de vários agentes, confiabilidade em campo ou sincronização entre dispositivos |

## 3. Política de experiência e rastreamento
- A primeira abertura mostra uma notificação clara e oferece continuar sem GPS em modo ilustrativo. O aceite de leitura não concede permissão do sistema.
- GPS só pode ser usado para ronda real autorizada, com notificação visível e opção de interromper acompanhamento.
- A versão web não rastreia após fechar a página. A versão Android pode manter foreground service quando a interface sai da tela, respeitando restrições do sistema. Não sugerir que force-stop pode ser contornado.
- Ao encerrar ronda corretamente ou sair do perfil, a interface chama `stopTracking()`; o serviço também oferece um controle na notificação.
- Nenhum evento de GPS deve ser apresentado como prova única de falta disciplinar.

## 4. Critérios de homologação ainda pendentes
1. APK compilado com versão de SDK/Gradle verificável; testes manuais em Android 10, 12, 14 e 15, aparelhos de fabricantes diferentes e economia de bateria.
2. Autenticação/permissões e backend, trilha auditável, prevenção de fraude/alteração, privacidade e conformidade LGPD.
3. Testes de localização com GPS impreciso, perda de sinal, mudança de rede, tela bloqueada, swipe da interface e parada forçada.
4. Avaliação humana do fluxo com vigilantes e supervisores; acessibilidade com TalkBack e foco.
5. Política de serviço e dados contratualmente adequada, aceite revisado juridicamente.
6. Monitorar desempenho do mapa e atribuições OpenStreetMap.

## 5. Evidências existentes
- [Código público com implementação](https://github.com/danielnep/app-hondas-maxvel)
- [Workflow Android de compilação](https://github.com/danielnep/app-hondas-maxvel/actions/workflows/android-build.yml)
- [Auditoria visual 112 estados e 8 larguras](https://github.com/danielnep/app-hondas-maxvel/actions/runs/38180576008)
- `tests/security-accessibility.test.mjs`: checagens de contraste para tokens principais e controles nativos de consentimento/parada.
- [Etapa 07 e acompanhamento de pendências](https://github.com/danielnep/app-hondas-maxvel/issues/7)

Este relatório separa **código desenvolvido**, **funcionalidade demonstrada** e **capacidade operacional ainda não verificada**. Essa separação é obrigatória para uma apresentação comercial responsável.

**Horizon | Daniel N. Xavier**.
