# Rondas Pro · Revisão de requisitos e experiências

> Fonte: todas as solicitações do responsável por este projeto, inclusive as anteriores. Nenhum requisito foi cancelado. Este documento não muda dados de produção.

## Três acessos autenticados
| Acesso | Página inicial | Responsabilidades |
|---|---|---|
| Vigia (`ronda`) | Minha ronda | Executar rota, acompanhar pontos, GPS, permanência, justificar desvios, abrir ocorrências, alerta por e-mail independente, pânico e consultar **todo seu próprio histórico** |
| Operador (`operador`) | Monitoramento | Observar rondas de dia/noite, última posição com horário/qualidade, acompanhar vigias, ocorrências, responder e registrar providências |
| Administrativo (`admin` e `master`) | Dashboard | Indicadores agregados/individuais, comparações, equipe, configurações, evidências, exportações, auditoria e relatórios. Master é permissão administrativa elevada, **não quarto login** |

## Matriz de preservação e verificação
| Requisito solicitado | Situação na branch / ressalva |
|---|---|
| Rondas sequenciais por GPS e geocerca de 25–30 m | Existente; coordenadas e QR opcionais permanecem |
| Permanência contínua no ponto e bloqueio | Regras existentes + cortina visual para modo real; conferir Android e navegador |
| Cortina fosca, timer, câmera/vídeo, lanterna, pânico e **observação obrigatória** | Implementada no app de campo; homologação de lanterna depende do aparelho |
| Diferenciar baixa precisão GPS de desvio real | Proteção por incerteza e amostras repetidas; qualidade técnica gera registro distinto |
| Evento de pânico com identificação, data, posição e bateria | Registrado localmente e enviado quando autenticado/online; emergência telefônica mantém fluxo separado |
| Bateria medida frequentemente e no histórico nativo Android | Coleta e registro na branch; limitações do navegador tratadas sem valores inventados |
| Fotos/vídeos com localização, horário e bateria por arquivo | Metadata por arquivo quando obtida; evidências autenticadas visíveis na central |
| Offline no próprio dispositivo e posterior sincronização | IndexedDB/PWA + SQLite Android; requer autenticação e servidor configurado |
| PWA instalável pelo navegador | Manifest + service worker; instalabilidade depende de SO/navegador |
| Serviço Android em segundo plano | Serviço foreground Android existente; SO/usuário podem sempre interromper. Controle remoto de encerramento requer política e sincronização autenticadas ainda não concluídas |
| Mensagens geral/interna de tratamento de ocorrências | API e tela operacional; autoria, data/hora e visibilidade por perfil |
| Conversas retidas no banco e exportadas PDF, CSV, JSON | API SQLite e exportações; retenção efetiva exige volume e backup |
| Exportar XLSX com aba Dashboard + demais abas | Implementado via OOXML; conferir planilhas em leitores comuns |
| Indicadores por ronda: km, duração, bateria, pontos, alertas, pânico | API e telas próprias; km GPS é estimativa de amostras confiáveis |
| Vigia consultar **seu próprio histórico** detalhado | Navegação e painel de histórico local + consulta autenticada da própria conta; não acessa outras pessoas |
| Operadores monitorarem rotas e conversarem com vigias | Tela específica, GPS com timestamp, botão para abrir evento e mensagens; atualização a cada 30s enquanto visível |
| Administrador/Master monitorarem equipe e compararem dados | Dashboard separado e acesso a histórico/resumos; análises mais profundas podem ser expandidas sem poluir a página inicial |
| Descrição da supervisão por vigia no cadastro | Obrigatória na API e tela administrativa |
| Alertas por e-mail independentes do pânico, presets editáveis | API com modelos/grupos + entrega via provedor opcional, resposta do provedor registrada |
| Cliente poder acompanhar serviços | Fluxo local já presente; autenticação e isolamento de cliente em produção ainda pendentes |
| Configurar desativação do acompanhamento por quem tiver permissão | **Pendente**: exige autenticação, trilha de auditoria, sincronização de comandos com app nativo e respeito ao controle do SO |

## Correções de UI executadas
1. Central autenticada segue a mesma identidade gráfica escura com vermelho da Maxvel, não mais um segundo tema azul isolado.
2. Cada perfil tem menu e página inicial próprios; não apenas botões escondidos.
3. Dashboard administrativo: KPIs essenciais e pendências primeiro; análises extensas sob expansão.
4. Operador: rondas ativas, tempo da última amostra GPS e alertas antes de histórico.
5. Vigia: minha ronda + meu histórico e comunicação; histórico resumido com detalhes sob demanda.
6. Ocorrência: descrição, localização/mapa, evidências, tratamento e conversa; dados técnicos sob expansão.
7. Correção de um fragmento malformado da importação de fonte na folha de estilo original.

## Pendências antes de produção
- Não mesclar na `main` antes da avaliação dos screenshots de Android mobile/desktop e homologação com usuários reais.
- Configurar Railway com volume, conta Master e provedor de e-mail; testar backup/restauração.
- Integrar de ponta a ponta a identidade autenticada à execução de rondas e programação real; a demonstração continua separada.
- Implementar encerramento administrativo controlado do rastreamento nativo, sem suprimir controle do aparelho/sistema operacional.
- Testar fotos em diferentes modelos de celular, câmera/lanterna, sinais GPS ruins, permissões e funcionamento offline.
- Aplicar política de acesso, retenção e backups compatíveis com LGPD.

**Regra de revisão:** não alegar funcionamento remoto em demonstração local; não transformar ausência de GPS em prova de desvio; não eliminar requisitos anteriores.
